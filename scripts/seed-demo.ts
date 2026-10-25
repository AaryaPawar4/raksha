import { connectDatabase, disconnectDatabase } from '../server/src/config/db';
import { UserModel } from '../server/src/models/user.model';
import { IncidentModel } from '../server/src/models/incident.model';
import { ContactModel } from '../server/src/models/contact.model';
import { CaseModel } from '../server/src/models/case.model';
import { CheckInModel } from '../server/src/models/checkin.model';
import { EvidenceModel } from '../server/src/models/evidence.model';
import { ActivityLogModel } from '../server/src/models/activityLog.model';
import bcrypt from 'bcryptjs';

const DEMO_EMAIL = 'demo-asha@rakshasphere.org';
const DEMO_PASSWORD = 'SecurePassword123!';
const DEMO_NAME = 'Asha Verma';

async function seed() {
  console.log('🌱 Starting RakshaSphere Synthetic Demo Seeding...');
  const connected = await connectDatabase();
  if (!connected) {
    console.error('❌ Failed to connect to MongoDB. Check MONGODB_URI in .env');
    process.exit(1);
  }

  // 1. Clean existing demo data for isolation
  const existingUser = await UserModel.findOne({ email: DEMO_EMAIL });
  if (existingUser) {
    const userId = existingUser._id.toString();
    console.log(`🧹 Removing prior demo data for ${DEMO_EMAIL}...`);
    await IncidentModel.deleteMany({ ownerId: userId });
    await ContactModel.deleteMany({ ownerId: userId });
    await CaseModel.deleteMany({ ownerId: userId });
    await CheckInModel.deleteMany({ ownerId: userId });
    await EvidenceModel.deleteMany({ ownerId: userId });
    await ActivityLogModel.deleteMany({ ownerId: userId });
    await UserModel.deleteOne({ _id: existingUser._id });
  }

  // 2. Create Demo User (with verified email for demo readiness)
  console.log(`👤 Creating demo user account: ${DEMO_EMAIL}...`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await UserModel.create({
    email: DEMO_EMAIL,
    passwordHash,
    name: DEMO_NAME,
    isEmailVerified: true,
    refreshTokens: [],
  });
  const userId = user._id.toString();

  // 3. Create Incident 1: Instagram Harassment
  console.log('📋 Creating Incident 1: Instagram Harassment...');
  const incident1 = await IncidentModel.create({
    ownerId: userId,
    title: 'Instagram Harassment & Fake Profile',
    incidentType: 'HARASSMENT',
    description: 'A perpetrator created an impersonated profile using my photos and sent threatening direct messages to my friends.',
    platform: 'INSTAGRAM',
    occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'OPEN',
    identifiers: [
      { type: 'USERNAME', value: '@stalker_fake_99', normalizedValue: 'stalker_fake_99' },
      { type: 'PHONE', value: '+919876543210', normalizedValue: '+919876543210' },
    ],
  });

  // 4. Create Incident 2: WhatsApp Extortion (Shares phone identifier for ThreatLink correlation)
  console.log('📋 Creating Incident 2: WhatsApp Blackmail & Extortion...');
  const incident2 = await IncidentModel.create({
    ownerId: userId,
    title: 'WhatsApp Extortion Threat',
    incidentType: 'BLACKMAIL',
    description: 'Received intimidating messages demanding financial payment, threatening to post private contact information online.',
    platform: 'WHATSAPP',
    occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
    status: 'OPEN',
    identifiers: [
      { type: 'PHONE', value: '+919876543210', normalizedValue: '+919876543210' },
    ],
  });

  // 5. Create Trusted Contact
  console.log('👥 Creating Trusted Contact: Pooja (Sister)...');
  const contact = await ContactModel.create({
    ownerId: userId,
    name: 'Pooja (Sister)',
    phone: '+919988776655',
    email: 'pooja.sister@example.com',
    consentStatus: 'CONSENTED',
    consentGivenAt: new Date(),
  });

  // 6. Create Case Tracking record
  console.log('📁 Creating Case Tracking record...');
  await CaseModel.create({
    ownerId: userId,
    incidentId: incident1._id.toString(),
    reportingChannel: 'NATIONAL_CYBER_CRIME_PORTAL',
    referenceNumber: 'CR/2026/89410',
    status: 'UNDER_REVIEW',
    verificationSource: 'USER_REPORTED',
    followUpAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // in 14 days
    notes: 'Submitted via cybercrime.gov.in portal. Awaiting acknowledgement slip.',
  });

  // 7. Seed Initial Safe Activity Log records
  console.log('📜 Seeding Activity Log records...');
  await ActivityLogModel.create([
    {
      ownerId: userId,
      eventType: 'AUTH_REGISTER',
      outcome: 'SUCCESS',
      resourceLabel: 'User account created',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      ownerId: userId,
      eventType: 'INCIDENT_CREATED',
      outcome: 'SUCCESS',
      resourceId: incident1._id.toString(),
      resourceLabel: 'Instagram Harassment & Fake Profile',
      safeMetadata: { platform: 'INSTAGRAM' },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      ownerId: userId,
      eventType: 'INCIDENT_CREATED',
      outcome: 'SUCCESS',
      resourceId: incident2._id.toString(),
      resourceLabel: 'WhatsApp Extortion Threat',
      safeMetadata: { platform: 'WHATSAPP' },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      ownerId: userId,
      eventType: 'CONTACT_CREATED',
      outcome: 'SUCCESS',
      resourceId: contact._id.toString(),
      resourceLabel: 'Pooja (Sister)',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log('\n✅ Demo Data Seeded Successfully!');
  console.log('========================================================');
  console.log(`Email:      ${DEMO_EMAIL}`);
  console.log(`Password:   ${DEMO_PASSWORD}`);
  console.log(`Incidents:  2 created (with matching phone +919876543210)`);
  console.log(`Contact:    Pooja (Sister) - Consent Granted`);
  console.log(`Case:       Reference CR/2026/89410 under review`);
  console.log('========================================================');
  console.log('You can now log in at http://localhost:5173 with these credentials.\n');

  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
