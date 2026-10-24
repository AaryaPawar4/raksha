import { IncidentRepository } from '../repositories/incident.repository';
import { ThreatLinkRepository } from '../repositories/threatlink.repository';
import { NormalizationService } from './normalization.service';
import { isDatabaseConnected } from '../config/db';
import { ServiceError } from './incident.service';
import { threatLinkDocToEdge } from '../models/threatlink.model';
import { IncidentModel } from '../models/incident.model';
import {
  ThreatLinkEdge,
  UserDisposition,
  ThreatIdentifier,
  ThreatLinkRelatedIncident,
} from '@rakshasphere/shared';

export class ThreatLinkService {
  private static checkDatabase(): void {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }
  }

  /**
   * Correlates the given incident against the user's other incidents using exact identifier matching.
   * Strictly isolated to the authenticated user's own data.
   */
  public static async getLinksForIncident(
    ownerId: string,
    incidentId: string
  ): Promise<ThreatLinkEdge[]> {
    this.checkDatabase();

    // 1. Fetch source incident and verify ownership
    const sourceIncident = await IncidentRepository.findByIdAndOwner(
      incidentId,
      ownerId
    );
    if (!sourceIncident) {
      throw new ServiceError(
        'Incident not found or you do not have permission to access it.',
        'NOT_FOUND',
        404
      );
    }

    // 2. Extract and normalize source identifiers
    const sourceIdentifiers = sourceIncident.identifiers || [];
    const normalizedSourceMap = new Map<
      string,
      { type: ThreatIdentifier['type']; rawValue: string; normalized: string }
    >();

    for (const ident of sourceIdentifiers) {
      const norm = NormalizationService.normalize(ident.type, ident.value);
      if (norm) {
        // Compound key ensures we match type + normalized value
        normalizedSourceMap.set(`${ident.type}:${norm}`, {
          type: ident.type,
          rawValue: ident.value,
          normalized: norm,
        });
      }
    }

    // 3. If source has valid normalized identifiers, scan user's other incidents for exact matches
    if (normalizedSourceMap.size > 0) {
      // Find other incidents belonging ONLY to the same owner, excluding self
      const otherIncidents = await IncidentModel.find({
        ownerId,
        _id: { $ne: sourceIncident.id },
        'identifiers.0': { $exists: true }, // Must have at least one identifier
      })
        .sort({ createdAt: -1 })
        .limit(200) // Bounded search limit
        .exec();

      for (const other of otherIncidents) {
        const otherId = other._id.toString();
        let matchedItem: {
          type: ThreatIdentifier['type'];
          rawValue: string;
          normalized: string;
        } | null = null;

        for (const otherIdent of other.identifiers || []) {
          const norm = NormalizationService.normalize(
            otherIdent.type,
            otherIdent.value
          );
          if (norm) {
            const key = `${otherIdent.type}:${norm}`;
            if (normalizedSourceMap.has(key)) {
              matchedItem = normalizedSourceMap.get(key)!;
              break; // Matched first exact identifier for this pair
            }
          }
        }

        if (matchedItem) {
          // Construct canonical pair key to prevent duplicate edges
          const pair = [sourceIncident.id, otherId].sort();
          const canonicalPair = `${pair[0]}:${pair[1]}`;
          const masked = NormalizationService.maskValue(
            matchedItem.type,
            matchedItem.rawValue
          );

          await ThreatLinkRepository.createOrUpdateLink(
            ownerId,
            sourceIncident.id,
            otherId,
            canonicalPair,
            {
              matchType: 'EXACT_IDENTIFIER',
              matchedIdentifierType: matchedItem.type,
              matchedValueMasked: masked,
              strength: 'STRONG',
              explanation: `Exact match on ${matchedItem.type} (${masked}) between this incident and "${other.title}".`,
              warning:
                'A correlation does not prove common ownership, perpetrator identity, or culpability. Treat this as an investigative lead only.',
            }
          );
        }
      }
    }

    // 4. Retrieve all stored edges for this incident
    const linkDocs = await ThreatLinkRepository.findLinksByIncident(
      ownerId,
      sourceIncident.id
    );

    // 5. Hydrate related incident metadata for frontend display
    const edges: ThreatLinkEdge[] = [];

    for (const doc of linkDocs) {
      const edge = threatLinkDocToEdge(doc, sourceIncident.id);
      const relatedDoc = await IncidentModel.findOne({
        _id: edge.relatedIncidentId,
        ownerId,
      }).exec();

      if (relatedDoc) {
        const rel: ThreatLinkRelatedIncident = {
          id: relatedDoc._id.toString(),
          title: relatedDoc.title,
          incidentType: relatedDoc.incidentType,
          platform: relatedDoc.platform,
          occurredAt: relatedDoc.occurredAt.toISOString(),
          status: relatedDoc.status,
        };
        edge.relatedIncident = rel;
      }

      edges.push(edge);
    }

    return edges;
  }

  /**
   * Updates user disposition (RELEVANT / NOT_RELATED / UNSURE) on a specific link.
   */
  public static async updateFeedback(
    ownerId: string,
    linkId: string,
    disposition: UserDisposition
  ): Promise<ThreatLinkEdge> {
    this.checkDatabase();

    const updated = await ThreatLinkRepository.updateDisposition(
      ownerId,
      linkId,
      disposition
    );

    if (!updated) {
      throw new ServiceError(
        'ThreatLink not found or you do not have permission to modify it.',
        'NOT_FOUND',
        404
      );
    }

    // Return with source incident as incidentAId
    return threatLinkDocToEdge(updated, updated.incidentAId);
  }
}
