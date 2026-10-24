import { z } from 'zod';
import { env } from '../config/env';
import { AiStructuredOutput, Incident, ProviderStatus } from '@rakshasphere/shared';

export const aiOutputValidationSchema = z.object({
  overallSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  indicators: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      explanation: z.string(),
      uncertaintyNotes: z.string(),
    })
  ),
  uncertaintyAssessment: z.string(),
  immediateSteps: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

export interface ProviderResult {
  success: boolean;
  status: ProviderStatus;
  data?: AiStructuredOutput;
  errorMessage?: string;
}

export class AiProviderService {
  /**
   * Calls the configured AI provider to analyze minimized incident content.
   * Never transmits user IDs, credentials, or precise location coordinates.
   * Safe logging: never prints prompts or raw response text to logs.
   */
  public static async analyze(incident: Incident): Promise<ProviderResult> {
    const apiKey = env.AI_PROVIDER_API_KEY;

    // Gracefully handle missing configuration
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        success: false,
        status: 'AI_PROVIDER_NOT_CONFIGURED',
        errorMessage: 'AI provider API key is not configured in server environment.',
      };
    }

    // Minimized payload strictly focused on threat assessment
    const minimizedInput = {
      category: incident.incidentType,
      platform: incident.platform,
      occurredAt: incident.occurredAt,
      descriptionSummary: incident.description.slice(0, 1500),
    };

    const systemPrompt = `You are an objective digital safety analyst assisting an incident assessment platform.
Analyze the provided report for digital threat indicators (harassment, extortion, doxxing, impersonation, stalking).
Return STRICT JSON ONLY conforming exactly to this structure:
{
  "overallSeverity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "indicators": [
    {
      "id": string (e.g. "EXTORTION_PRESSURE"),
      "name": string,
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "confidence": "HIGH" | "MEDIUM" | "LOW",
      "explanation": string,
      "uncertaintyNotes": string
    }
  ],
  "uncertaintyAssessment": string (must clearly state what cannot be verified from the text),
  "immediateSteps": string[],
  "nextSteps": string[]
}
IMPORTANT CONSTRAINTS:
- You must NOT claim to prove identity, verify guilt, or diagnose legal outcomes.
- State uncertainty explicitly.
- Do not output markdown code fences, backticks, or explanations outside the JSON object.`;

    const userMessage = JSON.stringify(minimizedInput);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second safety timeout

      // Provider call using Gemini API endpoint convention
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_PROVIDER_MODEL}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nIncident Data:\n${userMessage}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          status: 'FALLBACK_PROVIDER_ERROR',
          errorMessage: `AI provider HTTP error ${response.status}`,
        };
      }

      const rawJson: any = await response.json();
      const candidateText =
        rawJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Clean any potential markdown wrapper
      const cleanJsonString = candidateText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsedJson = JSON.parse(cleanJsonString);
      const validated = aiOutputValidationSchema.parse(parsedJson);

      return {
        success: true,
        status: 'COMPLETED',
        data: {
          overallSeverity: validated.overallSeverity,
          indicators: validated.indicators,
          uncertaintyAssessment: validated.uncertaintyAssessment,
          immediateSteps: validated.immediateSteps,
          nextSteps: validated.nextSteps,
          modelMetadata: {
            provider: 'Google Gemini',
            model: env.AI_PROVIDER_MODEL,
            completedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      // Safe error logging: log generic type, never raw payload or keys
      const msg = error instanceof Error ? error.name : 'UnknownError';
      return {
        success: false,
        status: 'FALLBACK_PROVIDER_ERROR',
        errorMessage: `AI provider analysis failed: ${msg}`,
      };
    }
  }
}
