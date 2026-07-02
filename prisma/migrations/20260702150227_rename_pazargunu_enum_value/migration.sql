-- Rename enum value "Pazar" (Sunday) to "PazarGunu" so it no longer collides
-- in meaning with the Pazar (market) model. Data-safe: no rows use this
-- column's type at the time of writing, and RENAME VALUE preserves any that do.
ALTER TYPE "HaftaGunu" RENAME VALUE 'Pazar' TO 'PazarGunu';
