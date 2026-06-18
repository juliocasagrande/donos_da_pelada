ALTER TABLE "User"
ADD COLUMN "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pushPromptDismissed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "pushNotificationsEnabled" = true,
    "pushPromptDismissed" = true
WHERE id IN (SELECT DISTINCT "userId" FROM "PushSubscription");
