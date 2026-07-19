CREATE TABLE "EmailSenderAddress" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "scopeKey" text GENERATED ALWAYS AS (
    CASE
      WHEN "locationId" IS NULL THEN 'ORG'
      ELSE 'LOC:' || "locationId"
    END
  ) STORED NOT NULL,
  "emailDomainId" text NOT NULL,
  "email" text NOT NULL,
  "displayName" text NOT NULL,
  "replyTo" text,
  "isDefault" boolean DEFAULT false NOT NULL,
  "isDisabled" boolean DEFAULT false NOT NULL,
  "createdByUserId" text,
  "removedAt" timestamp(3),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "EmailSenderAddress_default_enabled_check"
    CHECK ("isDefault" = false OR "isDisabled" = false),
  CONSTRAINT "EmailSenderAddress_display_name_check"
    CHECK (length("displayName") BETWEEN 1 AND 120)
);
--> statement-breakpoint
ALTER TABLE "EmailSenderAddress" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailSenderAddress_active_scope_email_key"
  ON "EmailSenderAddress" USING btree (
    "organizationId",
    "scopeKey",
    lower("email")
  )
  WHERE "removedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailSenderAddress_scope_default_key"
  ON "EmailSenderAddress" USING btree ("organizationId", "scopeKey")
  WHERE "isDefault" = true
    AND "isDisabled" = false
    AND "removedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailSenderAddress_organizationId_id_key"
  ON "EmailSenderAddress" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE INDEX "EmailSenderAddress_scope_domain_idx"
  ON "EmailSenderAddress" USING btree (
    "organizationId",
    "locationId",
    "emailDomainId"
  );
--> statement-breakpoint
ALTER TABLE "EmailSenderAddress"
  ADD CONSTRAINT "EmailSenderAddress_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "public"."Organization"("id")
  ON DELETE cascade
  ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "EmailSenderAddress"
  ADD CONSTRAINT "EmailSenderAddress_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId")
  REFERENCES "public"."Location"("organizationId", "id")
  ON DELETE cascade
  ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "EmailSenderAddress"
  ADD CONSTRAINT "EmailSenderAddress_organization_domain_fkey"
  FOREIGN KEY ("organizationId", "emailDomainId")
  REFERENCES "public"."EmailDomain"("organizationId", "id")
  ON DELETE restrict
  ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "EmailSenderAddress"
  ADD CONSTRAINT "EmailSenderAddress_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId")
  REFERENCES "public"."User"("id")
  ON DELETE set null
  ON UPDATE restrict;
--> statement-breakpoint
INSERT INTO "EmailSenderAddress" (
  "id",
  "organizationId",
  "locationId",
  "emailDomainId",
  "email",
  "displayName",
  "replyTo",
  "isDefault",
  "isDisabled",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy_sender_' || substr(
    md5(
      domain."id" || lower(
        COALESCE(domain."defaultFromEmail", 'noreply@' || domain."domain")
      )
    ),
    1,
    24
  ),
  domain."organizationId",
  domain."locationId",
  domain."id",
  lower(COALESCE(domain."defaultFromEmail", 'noreply@' || domain."domain")),
  COALESCE(
    NULLIF(domain."defaultFromName", ''),
    split_part(
      COALESCE(domain."defaultFromEmail", 'noreply@' || domain."domain"),
      '@',
      1
    )
  ),
  domain."defaultReplyTo",
  domain."isDefault" AND NOT domain."isDisabled",
  domain."isDisabled",
  domain."createdAt",
  domain."updatedAt"
FROM "EmailDomain" AS domain
WHERE domain."removedAt" IS NULL;
--> statement-breakpoint
CREATE TABLE "EmailDesignProfile" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "scopeKey" text GENERATED ALWAYS AS (
    CASE
      WHEN "locationId" IS NULL THEN 'ORG'
      ELSE 'LOC:' || "locationId"
    END
  ) STORED NOT NULL,
  "logoMode" text DEFAULT 'WORKSPACE' NOT NULL,
  "customLogoUrl" text,
  "colorMode" text DEFAULT 'WORKSPACE' NOT NULL,
  "headerTextColor" text DEFAULT '#111827' NOT NULL,
  "bodyTextColor" text DEFAULT '#374151' NOT NULL,
  "buttonColor" text DEFAULT '#111827' NOT NULL,
  "backgroundColor" text DEFAULT '#f8f8ef' NOT NULL,
  "primaryFont" text DEFAULT 'Helvetica Neue' NOT NULL,
  "secondaryFont" text DEFAULT 'Arial' NOT NULL,
  "socialLinks" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updatedByUserId" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "EmailDesignProfile_logo_mode_check"
    CHECK ("logoMode" IN ('WORKSPACE', 'CUSTOM', 'NONE')),
  CONSTRAINT "EmailDesignProfile_custom_logo_check"
    CHECK ("logoMode" <> 'CUSTOM' OR "customLogoUrl" IS NOT NULL),
  CONSTRAINT "EmailDesignProfile_color_mode_check"
    CHECK ("colorMode" IN ('WORKSPACE', 'CUSTOM')),
  CONSTRAINT "EmailDesignProfile_colors_check"
    CHECK (
      "headerTextColor" ~ '^#[0-9a-fA-F]{6}$'
      AND "bodyTextColor" ~ '^#[0-9a-fA-F]{6}$'
      AND "buttonColor" ~ '^#[0-9a-fA-F]{6}$'
      AND "backgroundColor" ~ '^#[0-9a-fA-F]{6}$'
    )
);
--> statement-breakpoint
ALTER TABLE "EmailDesignProfile" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailDesignProfile_scope_key"
  ON "EmailDesignProfile" USING btree ("organizationId", "scopeKey");
--> statement-breakpoint
ALTER TABLE "EmailDesignProfile"
  ADD CONSTRAINT "EmailDesignProfile_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "public"."Organization"("id")
  ON DELETE cascade
  ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "EmailDesignProfile"
  ADD CONSTRAINT "EmailDesignProfile_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId")
  REFERENCES "public"."Location"("organizationId", "id")
  ON DELETE cascade
  ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "EmailDesignProfile"
  ADD CONSTRAINT "EmailDesignProfile_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId")
  REFERENCES "public"."User"("id")
  ON DELETE set null
  ON UPDATE restrict;
