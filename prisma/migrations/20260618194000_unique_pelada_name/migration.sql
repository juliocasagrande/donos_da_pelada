-- Normalize old duplicates before enforcing unique names.
WITH duplicates AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY "createdAt", id) AS duplicate_index
  FROM "Pelada"
)
UPDATE "Pelada"
SET name = CONCAT(duplicates.name, ' ', duplicates.duplicate_index)
FROM duplicates
WHERE "Pelada".id = duplicates.id
  AND duplicates.duplicate_index > 1;

-- Prevent future duplicate names regardless of case.
CREATE UNIQUE INDEX "Pelada_name_lower_key" ON "Pelada" (lower(name));
