-- Query observability for production diagnostics.
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Distributed rate-limit buckets shared by every application instance.
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- Ownership/lifecycle metadata for files uploaded with Supabase service-role.
CREATE TABLE "UploadedAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "attachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadedAsset_path_key" ON "UploadedAsset"("path");
CREATE UNIQUE INDEX "UploadedAsset_publicUrl_key" ON "UploadedAsset"("publicUrl");
CREATE INDEX "UploadedAsset_userId_attachedAt_createdAt_idx" ON "UploadedAsset"("userId", "attachedAt", "createdAt");
CREATE INDEX "UploadedAsset_attachedAt_createdAt_idx" ON "UploadedAsset"("attachedAt", "createdAt");
ALTER TABLE "UploadedAsset" ADD CONSTRAINT "UploadedAsset_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostgreSQL does not create indexes on the referencing side of foreign keys.
CREATE INDEX "DeletionRequest_createdByUserId_idx" ON "DeletionRequest"("createdByUserId");
CREATE INDEX "PeladaInvite_createdByUserId_idx" ON "PeladaInvite"("createdByUserId");
CREATE INDEX "MonthlyPayment_playerId_idx" ON "MonthlyPayment"("playerId");
CREATE INDEX "Transaction_createdByUserId_idx" ON "Transaction"("createdByUserId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Attendance_invitedByUserId_idx" ON "Attendance"("invitedByUserId");
CREATE INDEX "PollVote_userId_idx" ON "PollVote"("userId");
