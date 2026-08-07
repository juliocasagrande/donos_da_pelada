import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.set("connection_limit", "3");
databaseUrl.searchParams.set("connect_timeout", "15");
databaseUrl.searchParams.set("pool_timeout", "15");
const prisma = new PrismaClient({ datasourceUrl: databaseUrl.toString() });
try {
  const [health] = await prisma.$queryRawUnsafe(`
    SELECT
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') AS extension_enabled,
      to_regclass('"RateLimitBucket"') IS NOT NULL AS rate_limit_table,
      to_regclass('"UploadedAsset"') IS NOT NULL AS uploaded_asset_table,
      (SELECT COUNT(*) = 9 FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
        'DeletionRequest_createdByUserId_idx',
        'PeladaInvite_createdByUserId_idx',
        'MonthlyPayment_playerId_idx',
        'Transaction_createdByUserId_idx',
        'AuditLog_userId_idx',
        'Account_userId_idx',
        'Session_userId_idx',
        'Attendance_invitedByUserId_idx',
        'PollVote_userId_idx'
      )) AS foreign_key_indexes
  `);
  console.log(JSON.stringify(health));
  if (!health?.extension_enabled || !health?.rate_limit_table || !health?.uploaded_asset_table || !health?.foreign_key_indexes) {
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
