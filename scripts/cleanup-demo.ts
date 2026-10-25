import { connectDatabase, disconnectDatabase } from '../server/src/config/db';
import { UserModel } from '../server/src/models/user.model';
import { IncidentModel } from '../server/src/models/incident.model';
import { ContactModel } from '../server/src/models/contact.model';
import { CaseModel } from '../server/src/models/case.model';
import { CheckInModel } from '../server/src/models/checkin.model';
import { EvidenceModel } from '../server/src/models/evidence.model';
import { ActivityLogModel } from '../server/src/models/activityLog.model';

const DEMO_EMAIL = 'demo-asha@rakshasphere.org';

async function cleanup() {
  console.log(`🧹 Cleaning up demo persona data for: ${DEMO_EMAIL}...`);
  const connected = await connectDatabase();
  if (!connected) {
    console.error('❌ Failed to connect to MongoDB.');
    process.exit(1);
  }

  const user = await UserModel.findOne({ email: DEMO_EMAIL });
  if (!user) {
    console.log(`ℹ️  No existing records found for ${DEMO_EMAIL}.`);
    await disconnectDatabase();
    return;
  }

  const userId = user._id.toString();
  const incRes = await IncidentModel.deleteMany({ ownerId: userId });
  const conRes = await ContactModel.deleteMany({ ownerId: userId });
  const caseRes = await CaseModel.deleteMany({ ownerId: userId });
  const chkRes = await CheckInModel.deleteMany({ ownerId: userId });
  const evRes = await EvidenceModel.deleteMany({ ownerId: userId });
  const actRes = await ActivityLogModel.deleteMany({ ownerId: userId });
  const userRes = await UserModel.deleteOne({ _id: user._id });

  console.log(`✅ Removed:
  - ${incRes.deletedCount} Incidents
  - ${conRes.deletedCount} Contacts
  - ${caseRes.deletedCount} Cases
  - ${chkRes.deletedCount} Check-ins
  - ${evRes.deletedCount} Evidence items
  - ${actRes.deletedCount} Activity log items
  - User account ${DEMO_EMAIL}`);

  await disconnectDatabase();
}

cleanup().catch((err) => {
  console.error('❌ Cleanup error:', err);
  process.exit(1);
});
