ALTER TABLE "application"
ADD COLUMN "passwordEmailVerificationRequired" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "application"
ALTER COLUMN "signUpMethods" SET DEFAULT ARRAY['magic_link', 'password']::TEXT[];
