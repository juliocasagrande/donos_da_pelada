-- Clean any invalid historical values before adding constraints.
UPDATE "Goal" SET quantity = 0 WHERE quantity < 0;
UPDATE "Assist" SET quantity = 0 WHERE quantity < 0;
UPDATE "DifficultSave" SET quantity = 0 WHERE quantity < 0;
UPDATE "Player" SET rating = 0 WHERE rating < 0;
UPDATE "PlayerRating" SET value = 0 WHERE value < 0;

-- Enforce non-negative numeric stats at database level.
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_quantity_nonnegative" CHECK (quantity >= 0);
ALTER TABLE "Assist" ADD CONSTRAINT "Assist_quantity_nonnegative" CHECK (quantity >= 0);
ALTER TABLE "DifficultSave" ADD CONSTRAINT "DifficultSave_quantity_nonnegative" CHECK (quantity >= 0);
ALTER TABLE "Player" ADD CONSTRAINT "Player_rating_nonnegative" CHECK (rating >= 0);
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_value_nonnegative" CHECK (value >= 0);
