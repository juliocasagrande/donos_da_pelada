UPDATE "Player"
SET "rating" = LEAST("rating" * 2, 10);

UPDATE "PlayerRating"
SET "value" = LEAST("value" * 2, 10);

UPDATE "Match"
SET "guestMinRating" = LEAST("guestMinRating" * 2, 10)
WHERE "guestMinRating" IS NOT NULL;

UPDATE "Match"
SET "guestMaxRating" = LEAST("guestMaxRating" * 2, 10)
WHERE "guestMaxRating" IS NOT NULL;

UPDATE "UserCareerStats"
SET "ratingSum" = "ratingSum" * 2
WHERE "ratingCount" > 0;

ALTER TABLE "Player" ADD CONSTRAINT "Player_rating_max_10" CHECK ("rating" <= 10);
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_value_max_10" CHECK ("value" <= 10);
ALTER TABLE "Match" ADD CONSTRAINT "Match_guestMinRating_range" CHECK ("guestMinRating" IS NULL OR ("guestMinRating" >= 0 AND "guestMinRating" <= 10));
ALTER TABLE "Match" ADD CONSTRAINT "Match_guestMaxRating_range" CHECK ("guestMaxRating" IS NULL OR ("guestMaxRating" >= 0 AND "guestMaxRating" <= 10));
ALTER TABLE "Match" ADD CONSTRAINT "Match_guestRating_order" CHECK ("guestMinRating" IS NULL OR "guestMaxRating" IS NULL OR "guestMinRating" <= "guestMaxRating");
