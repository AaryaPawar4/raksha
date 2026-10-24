import { CuratedPlaybook, IncidentType, OfficialReportingChannel } from '@rakshasphere/shared';

const OFFICIAL_CHANNELS: Record<string, OfficialReportingChannel> = {
  CYBERCRIME_INDIA: {
    name: 'National Cyber Crime Reporting Portal (India)',
    url: 'https://cybercrime.gov.in',
    verifiedDate: '2026-10-01',
    scope: 'Cyber harassment, financial fraud, blackmail, child exploitation, and identity theft',
    notes: 'Citizen portal for filing official cybercrime complaints with law enforcement.',
  },
  NCW_HELPLINE: {
    name: 'National Commission for Women (NCW) Online Cell',
    url: 'http://ncw.nic.in',
    verifiedDate: '2026-10-01',
    scope: 'Safety, stalking, harassment, and violence against women',
    notes: '24/7 dedicated helpline: 7827170170.',
  },
  INSTAGRAM_SAFETY: {
    name: 'Instagram Abuse & Harassment Reporting',
    url: 'https://help.instagram.com/547601325292351',
    verifiedDate: '2026-10-01',
    scope: 'Direct messages, impersonation accounts, and unwanted comments',
    notes: 'Report directly in-app via the three dots on the profile or post.',
  },
  WHATSAPP_SAFETY: {
    name: 'WhatsApp Safety & Security Center',
    url: 'https://www.whatsapp.com/safety/',
    verifiedDate: '2026-10-01',
    scope: 'Threatening messages, scam messages, unwanted contact',
    notes: 'Use in-app Report & Block to send the last 5 messages to WhatsApp moderation.',
  },
  X_TWITTER_SAFETY: {
    name: 'X (Twitter) Abusive Behavior Reporting',
    url: 'https://help.twitter.com/en/safety-and-security/report-abusive-behavior',
    verifiedDate: '2026-10-01',
    scope: 'Targeted harassment, doxxing, non-consensual imagery',
    notes: 'Report tweets and profiles via the tweet menu.',
  },
};

const PLAYBOOKS: Record<IncidentType, CuratedPlaybook> = {
  BLACKMAIL: {
    category: 'BLACKMAIL',
    title: 'Extortion and Blackmail Response Playbook',
    version: '2026.1',
    immediateSafetySteps: [
      'Do not pay or send any money or requested items — paying rarely stops blackmail and often invites escalated demands.',
      'Do not delete messages, call logs, or sender profiles — preservation of evidence is essential for legal recourse.',
      'Cease direct engagement and avoid expressing panic or making threats in response.',
    ],
    accountSecuritySteps: [
      'Immediately change passwords on all associated accounts (email, cloud backups, social platforms).',
      'Enable two-factor authentication (2FA) using an authenticator app (such as Google Authenticator), rather than SMS.',
      'Audit third-party apps connected to your cloud storage and social media accounts.',
    ],
    evidencePreservationSteps: [
      'Take full-screen screenshots showing the sender handle, full message text, timestamps, and payment instructions.',
      'Record the URL of the perpetrator profile and save any payment addresses (UPI ID, bank account, crypto wallet).',
      'Export chat history if the messaging platform allows backup without alerting the perpetrator.',
    ],
    officialReportingChannels: [
      OFFICIAL_CHANNELS.CYBERCRIME_INDIA,
      OFFICIAL_CHANNELS.NCW_HELPLINE,
    ],
    emergencyAssistanceGuidance:
      'If you face imminent physical extortion or threats of physical violence, contact local emergency services (112) immediately and reach out to a trusted confidant.',
    disclaimer:
      'This playbook provides safety guidelines and evidence steps. It is not legal counsel and does not guarantee content removal by platforms or authorities.',
  },

  DOXXING: {
    category: 'DOXXING',
    title: 'Personal Information Exposure (Doxxing) Response Playbook',
    version: '2026.1',
    immediateSafetySteps: [
      'Assess which information was exposed (home address, phone number, workplace, financial details).',
      'If physical address or workplace was published, alert family or security personnel if safety concerns arise.',
      'Set all personal social media accounts to private mode immediately.',
    ],
    accountSecuritySteps: [
      'Remove publicly visible phone numbers and email addresses from profile bios and public registries.',
      'Change passwords and review active login sessions across all personal platforms.',
      'Request removal of cached personal search results via search engine removal forms.',
    ],
    evidencePreservationSteps: [
      'Take screenshots of the doxed post showing the complete URL, author handle, date, and exposed content.',
      'Archive web pages using web archiving tools if safe, or save complete HTML pages locally.',
    ],
    officialReportingChannels: [
      OFFICIAL_CHANNELS.CYBERCRIME_INDIA,
      OFFICIAL_CHANNELS.NCW_HELPLINE,
      OFFICIAL_CHANNELS.INSTAGRAM_SAFETY,
    ],
    emergencyAssistanceGuidance:
      'If your residential address was exposed alongside physical threats, relocate temporarily to a trusted location if possible and alert emergency services (112).',
    disclaimer:
      'Reporting exposed data initiates review by platform moderators, but platform removal times and outcomes cannot be guaranteed.',
  },

  IMPERSONATION: {
    category: 'IMPERSONATION',
    title: 'Fake Account and Impersonation Response Playbook',
    version: '2026.1',
    immediateSafetySteps: [
      'Alert friends, family, and professional contacts through an alternate channel that a fake profile exists.',
      'Advise contacts not to accept messages or requests for money/OTP from the impersonating account.',
      'Do not engage in arguments with the fake profile.',
    ],
    accountSecuritySteps: [
      'Ensure your authentic account is verified or clearly distinguishable with a complete bio.',
      'Change your password and review active devices on your genuine account.',
    ],
    evidencePreservationSteps: [
      'Screenshot the fake account profile, username, bio, follower count, and any fraudulent posts.',
      'Note the exact profile URL and account creation indicators where available.',
    ],
    officialReportingChannels: [
      OFFICIAL_CHANNELS.INSTAGRAM_SAFETY,
      OFFICIAL_CHANNELS.X_TWITTER_SAFETY,
      OFFICIAL_CHANNELS.CYBERCRIME_INDIA,
    ],
    emergencyAssistanceGuidance:
      'If the fake account is distributing non-consensual intimate imagery, file an immediate complaint on cybercrime.gov.in and reach out to NCW.',
    disclaimer:
      'Platforms require verification of your identity before removing impersonating profiles. Keep government ID ready for platform verification forms.',
  },

  HARASSMENT: {
    category: 'HARASSMENT',
    title: 'Targeted Online Harassment Response Playbook',
    version: '2026.1',
    immediateSafetySteps: [
      'Document evidence thoroughly before blocking or muting the harassing account.',
      'Set messages and comment settings to "Friends Only" or restricted mode to prevent continued direct contact.',
      'Avoid responding or feeding the harassment cycle.',
    ],
    accountSecuritySteps: [
      'Audit your privacy settings on all platforms where the harasser might attempt contact.',
      'Disable location tagging on future posts and stories.',
    ],
    evidencePreservationSteps: [
      'Screenshot all harassing comments, direct messages, and notification timestamps.',
      'Ensure sender handles and profile links are captured in each screenshot.',
    ],
    officialReportingChannels: [
      OFFICIAL_CHANNELS.INSTAGRAM_SAFETY,
      OFFICIAL_CHANNELS.WHATSAPP_SAFETY,
      OFFICIAL_CHANNELS.CYBERCRIME_INDIA,
    ],
    emergencyAssistanceGuidance:
      'If harassment includes explicit death threats or severe abuse, report to the police and seek counseling support.',
    disclaimer:
      'Safety playbooks are informational and designed to empower you with structured preservation and reporting procedures.',
  },

  STALKING: {
    category: 'STALKING',
    title: 'Cyberstalking & Persistent Monitoring Response Playbook',
    version: '2026.1',
    immediateSafetySteps: [
      'Disable device location services (GPS) and location-sharing features across all messaging apps.',
      'Check for unfamiliar Bluetooth devices or tracking tags in personal belongings or vehicle.',
      'Vary your daily routes and routines if physical stalking is suspected.',
    ],
    accountSecuritySteps: [
      'Check smartphone app permissions for microphone, camera, and background location access.',
      'Log out of all active web sessions across Google, Apple, WhatsApp Web, and social media.',
      'Perform a factory reset or malware scan on suspected devices if spyware is suspected.',
    ],
    evidencePreservationSteps: [
      'Maintain an incident log recording every occurrence, date, time, platform, and content.',
      'Preserve voicemail recordings, emails, and direct messages in unedited condition.',
    ],
    officialReportingChannels: [
      OFFICIAL_CHANNELS.CYBERCRIME_INDIA,
      OFFICIAL_CHANNELS.NCW_HELPLINE,
    ],
    emergencyAssistanceGuidance:
      'Cyberstalking frequently overlaps with physical safety risks. If you suspect you are being followed in person, proceed immediately to a public place or police station and dial 112.',
    disclaimer:
      'Always prioritize immediate personal physical safety over evidence gathering or digital investigations.',
  },

  FINANCIAL_SCAM: {
    category: 'FINANCIAL_SCAM',
    title: 'Financial Scam & Fraudulent Extortion Response Playbook',
    version: '2026.1',
    immediateSafetySteps: [
      'Immediately contact your bank or payment app (UPI provider) to block compromised cards or freeze unauthorized transactions.',
      'Call the National Cyber Fraud Helpline (1930 in India) to report fraudulent fund transfers immediately.',
      'Do not click any remote-access links or install software (AnyDesk, TeamViewer) sent by the caller.',
    ],
    accountSecuritySteps: [
      'Change net banking, UPI, and email passwords immediately from a secure device.',
      'Never share OTPs, PINs, or CVVs with anyone claiming to be bank or government staff.',
    ],
    evidencePreservationSteps: [
      'Record transaction IDs (UTR number), bank account details, and screenshot debit notifications.',
      'Save call logs, sender SMS headers, and WhatsApp chat transcripts.',
    ],
    officialReportingChannels: [
      OFFICIAL_CHANNELS.CYBERCRIME_INDIA,
    ],
    emergencyAssistanceGuidance:
      'Report financial fraud to the 1930 helpline within the "golden hour" (first 2-3 hours) for the highest chance of freezing transacted funds.',
    disclaimer:
      'Financial recovery is subject to banking and law enforcement procedures. RakshaSphere does not process refunds or chargebacks.',
  },

  OTHER: {
    category: 'OTHER',
    title: 'Digital Threat Safety and Evidence Preservation Playbook',
    version: '2026.1',
    immediateSafetySteps: [
      'Pause before responding to alarming or threatening digital messages.',
      'Preserve evidence thoroughly before altering privacy settings or deleting threads.',
      'Reach out to a trusted support person to avoid navigating the situation alone.',
    ],
    accountSecuritySteps: [
      'Review account security settings and enable two-factor authentication.',
      'Audit connected applications and active logins.',
    ],
    evidencePreservationSteps: [
      'Capture complete screenshots including date, time, and sender identifiers.',
      'Store evidence securely and avoid editing or cropping images.',
    ],
    officialReportingChannels: [
      OFFICIAL_CHANNELS.CYBERCRIME_INDIA,
      OFFICIAL_CHANNELS.NCW_HELPLINE,
    ],
    emergencyAssistanceGuidance:
      'If any communication threatens physical safety, contact emergency services (112) without delay.',
    disclaimer:
      'Safety recommendations are designed to protect privacy and preserve evidence. They do not constitute formal legal representation.',
  },
};

export class PlaybookService {
  public static getPlaybookForCategory(category: IncidentType): CuratedPlaybook {
    return PLAYBOOKS[category] || PLAYBOOKS.OTHER;
  }
}
