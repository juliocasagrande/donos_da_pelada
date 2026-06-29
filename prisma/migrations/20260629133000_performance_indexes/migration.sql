-- CreateIndex
CREATE INDEX "PeladaMembership_userId_createdAt_idx" ON "PeladaMembership"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Player_peladaId_active_membershipStatus_idx" ON "Player"("peladaId", "active", "membershipStatus");

-- CreateIndex
CREATE INDEX "Match_peladaId_deletedAt_status_date_idx" ON "Match"("peladaId", "deletedAt", "status", "date");

-- CreateIndex
CREATE INDEX "Match_openToGuests_status_date_idx" ON "Match"("openToGuests", "status", "date");

-- CreateIndex
CREATE INDEX "Attendance_matchId_status_idx" ON "Attendance"("matchId", "status");

-- CreateIndex
CREATE INDEX "Team_matchId_idx" ON "Team"("matchId");

-- CreateIndex
CREATE INDEX "Poll_matchId_title_status_idx" ON "Poll"("matchId", "title", "status");

-- CreateIndex
CREATE INDEX "Poll_status_updatedAt_idx" ON "Poll"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Poll_winnerId_idx" ON "Poll"("winnerId");
