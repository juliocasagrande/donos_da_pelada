UPDATE "Player"
SET "nickname" = COALESCE(NULLIF("nickname", ''), "name");

ALTER TABLE "Player" ALTER COLUMN "nickname" SET NOT NULL;
ALTER TABLE "Player" DROP COLUMN "name";
