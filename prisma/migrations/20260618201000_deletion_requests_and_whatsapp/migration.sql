CREATE TYPE "DeletionRequestTarget" AS ENUM ('PELADA', 'PLAYER');
CREATE TYPE "DeletionVoteValue" AS ENUM ('YES', 'NO');

ALTER TABLE "User"
ADD COLUMN "whatsapp" TEXT,
ADD COLUMN "whatsappChatEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DeletionRequest" (
  "id" TEXT NOT NULL,
  "peladaId" TEXT NOT NULL,
  "target" "DeletionRequestTarget" NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetName" TEXT NOT NULL,
  "reason" TEXT,
  "status" "PollStatus" NOT NULL DEFAULT 'OPEN',
  "createdByUserId" TEXT,
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeletionVote" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "vote" "DeletionVoteValue" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DeletionVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeletionRequest_peladaId_status_idx" ON "DeletionRequest"("peladaId", "status");
CREATE INDEX "DeletionRequest_target_targetId_status_idx" ON "DeletionRequest"("target", "targetId", "status");
CREATE INDEX "DeletionVote_userId_idx" ON "DeletionVote"("userId");
CREATE UNIQUE INDEX "DeletionVote_requestId_userId_key" ON "DeletionVote"("requestId", "userId");

ALTER TABLE "DeletionRequest"
ADD CONSTRAINT "DeletionRequest_peladaId_fkey"
FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeletionRequest"
ADD CONSTRAINT "DeletionRequest_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeletionVote"
ADD CONSTRAINT "DeletionVote_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "DeletionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeletionVote"
ADD CONSTRAINT "DeletionVote_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
