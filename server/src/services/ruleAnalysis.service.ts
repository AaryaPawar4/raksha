import {
  Incident,
  SafetyIndicator,
  SeverityLevel,
} from '@rakshasphere/shared';

interface IndicatorRule {
  id: string;
  name: string;
  severity: SeverityLevel;
  keywords: string[];
  phrases: string[];
  explanationTemplate: (matches: string[]) => string;
  uncertaintyNotes: string;
}

const RULES: IndicatorRule[] = [
  {
    id: 'THREATS_OR_BLACKMAIL',
    name: 'Threats or Blackmail / Extortion',
    severity: 'HIGH',
    keywords: [
      'blackmail',
      'extort',
      'extortion',
      'demand',
      'ransom',
      'expose',
      'threaten',
      'leak',
      'nude',
      'nudes',
      'pay me',
      'or else',
      'kill',
      'harm',
    ],
    phrases: [
      'pay or else',
      'send money',
      'leak your',
      'share your photos',
      'ruin your life',
      'tell everyone',
      'expose you',
    ],
    explanationTemplate: (matches) =>
      `Detected high-risk extortion or threatening language signals: [${matches.join(', ')}].`,
    uncertaintyNotes:
      'Keyword detection indicates the presence of threatening language, but cannot establish intent, context, or legal culpability without manual review.',
  },

  {
    id: 'EXPOSURE_OF_PERSONAL_INFO',
    name: 'Personal Information Exposure (Doxxing)',
    severity: 'HIGH',
    keywords: ['dox', 'doxxed', 'doxxing', 'address', 'phone number', 'workplace', 'aadhar', 'ssn'],
    phrases: [
      'posted my address',
      'shared my number',
      'leaked my info',
      'where you live',
      'private photos',
      'shared personal details',
    ],
    explanationTemplate: (matches) =>
      `Detected signals of unauthorized personal information disclosure: [${matches.join(', ')}].`,
    uncertaintyNotes:
      'Indicates possible privacy exposure. Does not verify whether the published details are accurate or actively accessible.',
  },

  {
    id: 'IMPERSONATION',
    name: 'Impersonation or Fake Account',
    severity: 'MEDIUM',
    keywords: ['impersonate', 'impersonation', 'fake account', 'fake profile', 'posing as', 'catfish'],
    phrases: [
      'fake account using my',
      'using my photos',
      'pretending to be me',
      'made an account with my name',
      'posing as me',
    ],
    explanationTemplate: (matches) =>
      `Detected identity duplication or fake profile indicators: [${matches.join(', ')}].`,
    uncertaintyNotes:
      'Identifies reported impersonation claims. Requires platform confirmation and identity verification to establish spoofing.',
  },

  {
    id: 'STALKING_CONCERNS',
    name: 'Stalking or Persistent Surveillance',
    severity: 'HIGH',
    keywords: ['stalking', 'stalker', 'following', 'watching', 'location', 'gps', 'spyware'],
    phrases: [
      'knows where i am',
      'following me',
      'watching me',
      'tracks my location',
      'shows up wherever',
      'monitoring my phone',
    ],
    explanationTemplate: (matches) =>
      `Detected indicators of persistent monitoring or location tracking: [${matches.join(', ')}].`,
    uncertaintyNotes:
      'Highlights surveillance concerns. Does not confirm device compromise or physical presence without technical/physical inspection.',
  },

  {
    id: 'REPEATED_UNWANTED_CONTACT',
    name: 'Repeated Unwanted Contact',
    severity: 'MEDIUM',
    keywords: ['repeated', 'harass', 'harassing', 'spamming', 'calls', 'unwanted', 'relentless'],
    phrases: [
      'will not stop',
      'told them to stop',
      'keeps messaging',
      'blocked them but',
      'calling repeatedly',
      'multiple accounts',
      'new accounts to message',
    ],
    explanationTemplate: (matches) =>
      `Detected patterns of persistent or unwanted direct outreach: [${matches.join(', ')}].`,
    uncertaintyNotes:
      'Reflects reported patterns of ongoing contact. Does not determine whether account ownership is shared or coordinated.',
  },

  {
    id: 'FINANCIAL_SCAM',
    name: 'Financial Scam or Payment Fraud',
    severity: 'MEDIUM',
    keywords: ['scam', 'fraud', 'crypto', 'bitcoin', 'upi', 'transfer', 'gift card', 'otp', 'pin'],
    phrases: [
      'send money',
      'transferred money',
      'asked for otp',
      'wire transfer',
      'bank details',
      'urgent payment',
    ],
    explanationTemplate: (matches) =>
      `Detected financial solicitation or fraudulent payment cues: [${matches.join(', ')}].`,
    uncertaintyNotes:
      'Flags mentions of financial transactions and payment channels. Does not verify banking records.',
  },
];

export class RuleAnalysisService {
  /**
   * Deterministically evaluates incident content against safety indicators.
   * Never transmits data externally or modifies stored incident fields.
   */
  public static evaluate(incident: Incident): SafetyIndicator[] {
    const textToAnalyze = `${incident.title} ${incident.description}`.toLowerCase();
    const results: SafetyIndicator[] = [];

    // Also check category baseline
    if (incident.incidentType === 'BLACKMAIL') {
      this.ensureIndicator(results, 'THREATS_OR_BLACKMAIL', [
        'Categorized under BLACKMAIL',
      ]);
    } else if (incident.incidentType === 'DOXXING') {
      this.ensureIndicator(results, 'EXPOSURE_OF_PERSONAL_INFO', [
        'Categorized under DOXXING',
      ]);
    } else if (incident.incidentType === 'IMPERSONATION') {
      this.ensureIndicator(results, 'IMPERSONATION', [
        'Categorized under IMPERSONATION',
      ]);
    } else if (incident.incidentType === 'STALKING') {
      this.ensureIndicator(results, 'STALKING_CONCERNS', [
        'Categorized under STALKING',
      ]);
    } else if (incident.incidentType === 'FINANCIAL_SCAM') {
      this.ensureIndicator(results, 'FINANCIAL_SCAM', [
        'Categorized under FINANCIAL_SCAM',
      ]);
    } else if (incident.incidentType === 'HARASSMENT') {
      this.ensureIndicator(results, 'REPEATED_UNWANTED_CONTACT', [
        'Categorized under HARASSMENT',
      ]);
    }

    // Evaluate keyword & phrase matches
    for (const rule of RULES) {
      const matches: string[] = [];

      // Check phrases first (higher precision)
      for (const phrase of rule.phrases) {
        if (textToAnalyze.includes(phrase)) {
          matches.push(`"${phrase}"`);
        }
      }

      // Check standalone keywords
      for (const kw of rule.keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(textToAnalyze) && !matches.some((m) => m.includes(kw))) {
          matches.push(`"${kw}"`);
        }
      }

      if (matches.length > 0) {
        this.addOrUpdateIndicator(results, rule, matches);
      }
    }

    return results;
  }

  private static ensureIndicator(
    results: SafetyIndicator[],
    ruleId: string,
    initialSignals: string[]
  ): void {
    const rule = RULES.find((r) => r.id === ruleId);
    if (!rule) return;

    if (!results.some((r) => r.id === ruleId)) {
      results.push({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        confidence: 'MEDIUM',
        explanation: rule.explanationTemplate(initialSignals),
        uncertaintyNotes: rule.uncertaintyNotes,
        matchedSignals: initialSignals,
      });
    }
  }

  private static addOrUpdateIndicator(
    results: SafetyIndicator[],
    rule: IndicatorRule,
    matches: string[]
  ): void {
    const existing = results.find((r) => r.id === rule.id);
    if (existing) {
      existing.confidence = 'HIGH';
      const combined = Array.from(
        new Set([...(existing.matchedSignals || []), ...matches])
      );
      existing.matchedSignals = combined;
      existing.explanation = rule.explanationTemplate(combined);
    } else {
      results.push({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        confidence: matches.length >= 2 ? 'HIGH' : 'MEDIUM',
        explanation: rule.explanationTemplate(matches),
        uncertaintyNotes: rule.uncertaintyNotes,
        matchedSignals: matches,
      });
    }
  }

  public static calculateOverallSeverity(indicators: SafetyIndicator[]): SeverityLevel {
    if (indicators.some((i) => i.severity === 'CRITICAL')) return 'CRITICAL';
    if (indicators.some((i) => i.severity === 'HIGH')) return 'HIGH';
    if (indicators.some((i) => i.severity === 'MEDIUM')) return 'MEDIUM';
    if (indicators.some((i) => i.severity === 'LOW')) return 'LOW';
    return 'LOW';
  }
}
