-- BetterAuth looks usernames up lowercased. Seeded users were stored with their
-- original casing, so the "username taken" check could not find them.
UPDATE "user"
SET "displayUsername" = COALESCE("displayUsername", "username"),
    "username" = lower("username")
WHERE "username" IS NOT NULL AND "username" <> lower("username");
