ALTER TABLE "account"
ADD COLUMN "rawProfile" JSONB,
ADD COLUMN "profileUpdatedAt" TIMESTAMP(3);
