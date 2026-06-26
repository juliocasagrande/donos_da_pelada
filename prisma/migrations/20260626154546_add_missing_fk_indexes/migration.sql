-- CreateIndex
CREATE INDEX "Assist_playerId_idx" ON "Assist"("playerId");

-- CreateIndex
CREATE INDEX "Attendance_playerId_idx" ON "Attendance"("playerId");

-- CreateIndex
CREATE INDEX "DifficultSave_playerId_idx" ON "DifficultSave"("playerId");

-- CreateIndex
CREATE INDEX "Goal_playerId_idx" ON "Goal"("playerId");

-- CreateIndex
CREATE INDEX "Match_peladaId_status_date_idx" ON "Match"("peladaId", "status", "date");

-- CreateIndex
CREATE INDEX "PlayerMatchSubmission_playerId_idx" ON "PlayerMatchSubmission"("playerId");

-- CreateIndex
CREATE INDEX "PlayerMatchSubmission_userId_idx" ON "PlayerMatchSubmission"("userId");

-- CreateIndex
CREATE INDEX "PlayerRating_playerId_idx" ON "PlayerRating"("playerId");

-- CreateIndex
CREATE INDEX "PlayerRating_userId_idx" ON "PlayerRating"("userId");

-- CreateIndex
CREATE INDEX "PollVote_playerId_idx" ON "PollVote"("playerId");

-- CreateIndex
CREATE INDEX "TeamPlayer_playerId_idx" ON "TeamPlayer"("playerId");
