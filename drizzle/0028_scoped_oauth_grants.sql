ALTER TABLE "ProviderAccount" ALTER COLUMN "encryptedSecret" DROP NOT NULL;

CREATE TABLE "ProviderOAuthGrant" (
  "providerAccountId" text PRIMARY KEY NOT NULL,
  "oauthAccountId" text NOT NULL,
  "oauthProviderId" text NOT NULL,
  "authorizedByUserId" text NOT NULL,
  "scopes" text[] DEFAULT '{}'::text[] NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "ProviderOAuthGrant" ENABLE ROW LEVEL SECURITY;

CREATE INDEX "ProviderOAuthGrant_oauthAccountId_idx"
ON "ProviderOAuthGrant" USING btree ("oauthAccountId");

ALTER TABLE "ProviderOAuthGrant"
ADD CONSTRAINT "ProviderOAuthGrant_providerAccountId_fkey"
FOREIGN KEY ("providerAccountId") REFERENCES "public"."ProviderAccount"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "ProviderOAuthGrant"
ADD CONSTRAINT "ProviderOAuthGrant_oauthAccountId_fkey"
FOREIGN KEY ("oauthAccountId") REFERENCES "public"."Account"("id")
ON DELETE restrict ON UPDATE cascade;

ALTER TABLE "ProviderOAuthGrant"
ADD CONSTRAINT "ProviderOAuthGrant_authorizedByUserId_fkey"
FOREIGN KEY ("authorizedByUserId") REFERENCES "public"."User"("id")
ON DELETE restrict ON UPDATE cascade;
