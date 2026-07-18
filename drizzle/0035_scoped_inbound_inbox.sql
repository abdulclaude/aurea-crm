CREATE TYPE "public"."InboundMessageReceiptStatus" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED', 'DEAD_LETTER');
--> statement-breakpoint
CREATE TABLE "InboxRoute" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "providerAccountId" text NOT NULL,
  "channel" "ConversationChannel" NOT NULL,
  "name" text NOT NULL,
  "inboundAddress" text NOT NULL,
  "inboundAddressNormalized" text NOT NULL,
  "isDefault" boolean DEFAULT false NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "defaultAssigneeStaffIdentityId" text,
  "createdByUserId" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InboxRoute" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "InboxRoute_providerAccountId_address_key" ON "InboxRoute" USING btree ("providerAccountId", "inboundAddressNormalized");
--> statement-breakpoint
CREATE UNIQUE INDEX "InboxRoute_organization_default_key" ON "InboxRoute" USING btree ("organizationId", "channel") WHERE "locationId" IS NULL AND "isDefault" = true AND "isActive" = true;
--> statement-breakpoint
CREATE UNIQUE INDEX "InboxRoute_location_default_key" ON "InboxRoute" USING btree ("organizationId", "locationId", "channel") WHERE "locationId" IS NOT NULL AND "isDefault" = true AND "isActive" = true;
--> statement-breakpoint
CREATE INDEX "InboxRoute_scope_active_idx" ON "InboxRoute" USING btree ("organizationId", "locationId", "channel", "isActive");
--> statement-breakpoint
ALTER TABLE "InboxRoute" ADD CONSTRAINT "InboxRoute_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxRoute" ADD CONSTRAINT "InboxRoute_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxRoute" ADD CONSTRAINT "InboxRoute_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxRoute" ADD CONSTRAINT "InboxRoute_defaultAssigneeStaffIdentityId_fkey" FOREIGN KEY ("defaultAssigneeStaffIdentityId") REFERENCES "public"."StaffIdentity"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxRoute" ADD CONSTRAINT "InboxRoute_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "InboundMessageReceipt" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "routeId" text,
  "providerAccountId" text NOT NULL,
  "provider" text NOT NULL,
  "providerEventId" text NOT NULL,
  "providerMessageId" text NOT NULL,
  "eventType" text NOT NULL,
  "status" "InboundMessageReceiptStatus" DEFAULT 'PENDING' NOT NULL,
  "payloadHash" text NOT NULL,
  "safeMetadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "attemptCount" integer DEFAULT 0 NOT NULL,
  "claimToken" text,
  "leaseExpiresAt" timestamp(3),
  "occurredAt" timestamp(3) NOT NULL,
  "receivedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "processedAt" timestamp(3),
  "lastErrorCode" text,
  "lastErrorMessage" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InboundMessageReceipt" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "InboundMessageReceipt_provider_event_key" ON "InboundMessageReceipt" USING btree ("provider", "providerAccountId", "providerEventId");
--> statement-breakpoint
CREATE UNIQUE INDEX "InboundMessageReceipt_provider_message_key" ON "InboundMessageReceipt" USING btree ("provider", "providerAccountId", "providerMessageId");
--> statement-breakpoint
CREATE INDEX "InboundMessageReceipt_status_lease_idx" ON "InboundMessageReceipt" USING btree ("status", "leaseExpiresAt");
--> statement-breakpoint
CREATE INDEX "InboundMessageReceipt_scope_receivedAt_idx" ON "InboundMessageReceipt" USING btree ("organizationId", "locationId", "receivedAt");
--> statement-breakpoint
ALTER TABLE "InboundMessageReceipt" ADD CONSTRAINT "InboundMessageReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboundMessageReceipt" ADD CONSTRAINT "InboundMessageReceipt_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboundMessageReceipt" ADD CONSTRAINT "InboundMessageReceipt_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboundMessageReceipt" ADD CONSTRAINT "InboundMessageReceipt_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."InboxRoute"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "InboxReadState" (
  "id" text PRIMARY KEY NOT NULL,
  "conversationId" text NOT NULL,
  "userId" text NOT NULL,
  "lastReadMessageId" text,
  "lastReadAt" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InboxReadState" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "InboxReadState_conversationId_userId_key" ON "InboxReadState" USING btree ("conversationId", "userId");
--> statement-breakpoint
CREATE INDEX "InboxReadState_userId_lastReadAt_idx" ON "InboxReadState" USING btree ("userId", "lastReadAt");
--> statement-breakpoint
ALTER TABLE "InboxReadState" ADD CONSTRAINT "InboxReadState_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."InboxConversation"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxReadState" ADD CONSTRAINT "InboxReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxReadState" ADD CONSTRAINT "InboxReadState_lastReadMessageId_fkey" FOREIGN KEY ("lastReadMessageId") REFERENCES "public"."InboxMessage"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "InboxConversationEvent" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "conversationId" text NOT NULL,
  "eventType" text NOT NULL,
  "actorUserId" text,
  "targetStaffIdentityId" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InboxConversationEvent" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "InboxConversationEvent_conversationId_createdAt_idx" ON "InboxConversationEvent" USING btree ("conversationId", "createdAt");
--> statement-breakpoint
CREATE INDEX "InboxConversationEvent_scope_createdAt_idx" ON "InboxConversationEvent" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
ALTER TABLE "InboxConversationEvent" ADD CONSTRAINT "InboxConversationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxConversationEvent" ADD CONSTRAINT "InboxConversationEvent_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxConversationEvent" ADD CONSTRAINT "InboxConversationEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."InboxConversation"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxConversationEvent" ADD CONSTRAINT "InboxConversationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxConversationEvent" ADD CONSTRAINT "InboxConversationEvent_targetStaffIdentityId_fkey" FOREIGN KEY ("targetStaffIdentityId") REFERENCES "public"."StaffIdentity"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD COLUMN "routeId" text;
--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD COLUMN "assigneeStaffIdentityId" text;
--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD COLUMN "assignedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD COLUMN "assignedByUserId" text;
--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD COLUMN "replyRoutingTokenHash" text;
--> statement-breakpoint
CREATE INDEX "InboxConversation_routeId_idx" ON "InboxConversation" USING btree ("routeId");
--> statement-breakpoint
CREATE INDEX "InboxConversation_assigneeStaffIdentityId_idx" ON "InboxConversation" USING btree ("assigneeStaffIdentityId");
--> statement-breakpoint
CREATE UNIQUE INDEX "InboxConversation_replyRoutingTokenHash_key" ON "InboxConversation" USING btree ("replyRoutingTokenHash") WHERE "replyRoutingTokenHash" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."InboxRoute"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_assigneeStaffIdentityId_fkey" FOREIGN KEY ("assigneeStaffIdentityId") REFERENCES "public"."StaffIdentity"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD COLUMN "providerAccountId" text;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD COLUMN "inboundReceiptId" text;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD COLUMN "externalMessageId" text;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD COLUMN "externalThreadId" text;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD COLUMN "fromAddress" text;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD COLUMN "toAddress" text;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD COLUMN "subject" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "InboxMessage_inboundReceiptId_key" ON "InboxMessage" USING btree ("inboundReceiptId") WHERE "inboundReceiptId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "InboxMessage_providerAccountId_externalMessageId_key" ON "InboxMessage" USING btree ("providerAccountId", "externalMessageId") WHERE "providerAccountId" IS NOT NULL AND "externalMessageId" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "public"."ProviderAccount"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_inboundReceiptId_fkey" FOREIGN KEY ("inboundReceiptId") REFERENCES "public"."InboundMessageReceipt"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_inbox_route_scope"() RETURNS trigger AS $$
DECLARE
  account_record "ProviderAccount"%ROWTYPE;
  assignee_organization_id text;
  assignee_status "StaffIdentityStatus";
BEGIN
  SELECT * INTO account_record FROM "ProviderAccount" WHERE "id" = NEW."providerAccountId";
  IF NOT FOUND OR account_record."organizationId" IS DISTINCT FROM NEW."organizationId" THEN
    RAISE EXCEPTION 'Inbox route provider account scope mismatch';
  END IF;
  IF NEW."isActive" AND account_record."status" <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Active inbox routes require an active provider account';
  END IF;
  IF NEW."channel" = 'EMAIL' AND account_record."provider" <> 'RESEND' THEN
    RAISE EXCEPTION 'Email inbox routes require a Resend provider account';
  END IF;
  IF NEW."locationId" IS NULL THEN
    IF account_record."locationId" IS NOT NULL THEN
      RAISE EXCEPTION 'Organization inbox routes require an organization provider account';
    END IF;
  ELSIF account_record."locationId" IS DISTINCT FROM NEW."locationId"
    AND NOT (account_record."locationId" IS NULL AND account_record."config" ->> 'inheritToLocations' = 'true') THEN
    RAISE EXCEPTION 'Inbox route provider account is not available in this location';
  END IF;
  IF NEW."defaultAssigneeStaffIdentityId" IS NOT NULL THEN
    SELECT "organizationId", "status" INTO assignee_organization_id, assignee_status
    FROM "StaffIdentity" WHERE "id" = NEW."defaultAssigneeStaffIdentityId";
    IF NOT FOUND OR assignee_organization_id IS DISTINCT FROM NEW."organizationId" OR assignee_status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'Inbox route default assignee scope mismatch';
    END IF;
    IF NEW."locationId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "LocationMember"
      WHERE "locationId" = NEW."locationId"
        AND "staffIdentityId" = NEW."defaultAssigneeStaffIdentityId"
    ) THEN
      RAISE EXCEPTION 'Inbox route default assignee is not active in this location';
    END IF;
  END IF;
  IF NEW."createdByUserId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Member"
    WHERE "organizationId" = NEW."organizationId"
      AND "userId" = NEW."createdByUserId"
  ) AND NOT (
    NEW."locationId" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "LocationMember"
      WHERE "locationId" = NEW."locationId"
        AND "userId" = NEW."createdByUserId"
    )
  ) THEN
    RAISE EXCEPTION 'Inbox route creator scope mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "InboxRoute_scope_guard" BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "providerAccountId", "channel", "isActive", "defaultAssigneeStaffIdentityId", "createdByUserId" ON "InboxRoute" FOR EACH ROW EXECUTE FUNCTION "assert_inbox_route_scope"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_inbox_conversation_scope"() RETURNS trigger AS $$
DECLARE
  client_record "Client"%ROWTYPE;
  route_record "InboxRoute"%ROWTYPE;
  assignee_record "StaffIdentity"%ROWTYPE;
BEGIN
  IF NEW."clientId" IS NOT NULL THEN
    SELECT * INTO client_record FROM "Client" WHERE "id" = NEW."clientId";
    IF NOT FOUND OR client_record."organizationId" IS DISTINCT FROM NEW."organizationId" OR client_record."locationId" IS DISTINCT FROM NEW."locationId" THEN
      RAISE EXCEPTION 'Inbox conversation client scope mismatch';
    END IF;
  END IF;
  IF NEW."routeId" IS NOT NULL THEN
    SELECT * INTO route_record FROM "InboxRoute" WHERE "id" = NEW."routeId";
    IF NOT FOUND OR route_record."organizationId" IS DISTINCT FROM NEW."organizationId" OR route_record."locationId" IS DISTINCT FROM NEW."locationId" OR route_record."channel" IS DISTINCT FROM NEW."channel" THEN
      RAISE EXCEPTION 'Inbox conversation route scope mismatch';
    END IF;
  END IF;
  IF NEW."assigneeStaffIdentityId" IS NOT NULL THEN
    SELECT * INTO assignee_record FROM "StaffIdentity" WHERE "id" = NEW."assigneeStaffIdentityId";
    IF NOT FOUND OR assignee_record."organizationId" IS DISTINCT FROM NEW."organizationId" OR assignee_record."status" <> 'ACTIVE' THEN
      RAISE EXCEPTION 'Inbox conversation assignee scope mismatch';
    END IF;
    IF NEW."locationId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "LocationMember"
      WHERE "locationId" = NEW."locationId" AND "staffIdentityId" = NEW."assigneeStaffIdentityId"
    ) THEN
      RAISE EXCEPTION 'Inbox conversation assignee is not active in this location';
    END IF;
  END IF;
  IF NEW."assignedByUserId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Member"
    WHERE "organizationId" = NEW."organizationId"
      AND "userId" = NEW."assignedByUserId"
  ) AND NOT (
    NEW."locationId" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "LocationMember"
      WHERE "locationId" = NEW."locationId"
        AND "userId" = NEW."assignedByUserId"
    )
  ) THEN
    RAISE EXCEPTION 'Inbox conversation assigning user scope mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "InboxConversation_scope_guard" BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "clientId", "routeId", "channel", "assigneeStaffIdentityId", "assignedByUserId" ON "InboxConversation" FOR EACH ROW EXECUTE FUNCTION "assert_inbox_conversation_scope"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_inbound_message_receipt_scope"() RETURNS trigger AS $$
DECLARE
  route_record "InboxRoute"%ROWTYPE;
  account_record "ProviderAccount"%ROWTYPE;
BEGIN
  SELECT * INTO account_record FROM "ProviderAccount" WHERE "id" = NEW."providerAccountId";
  IF NOT FOUND
    OR account_record."organizationId" IS DISTINCT FROM NEW."organizationId"
    OR account_record."provider" IS DISTINCT FROM NEW."provider" THEN
    RAISE EXCEPTION 'Inbound receipt provider account scope mismatch';
  END IF;
  IF NEW."locationId" IS NULL THEN
    IF account_record."locationId" IS NOT NULL THEN
      RAISE EXCEPTION 'Organization inbound receipts require an organization provider account';
    END IF;
  ELSIF account_record."locationId" IS DISTINCT FROM NEW."locationId"
    AND NOT (account_record."locationId" IS NULL AND account_record."config" ->> 'inheritToLocations' = 'true') THEN
    RAISE EXCEPTION 'Inbound receipt provider account is not available in this location';
  END IF;
  IF NEW."routeId" IS NOT NULL THEN
    SELECT * INTO route_record FROM "InboxRoute" WHERE "id" = NEW."routeId";
    IF NOT FOUND OR route_record."organizationId" IS DISTINCT FROM NEW."organizationId" OR route_record."locationId" IS DISTINCT FROM NEW."locationId" OR route_record."providerAccountId" IS DISTINCT FROM NEW."providerAccountId" THEN
      RAISE EXCEPTION 'Inbound receipt route scope mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "InboundMessageReceipt_scope_guard" BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "routeId", "providerAccountId", "provider" ON "InboundMessageReceipt" FOR EACH ROW EXECUTE FUNCTION "assert_inbound_message_receipt_scope"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_inbox_conversation_event_scope"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "InboxConversation"
    WHERE "id" = NEW."conversationId"
      AND "organizationId" = NEW."organizationId"
      AND "locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Inbox conversation event scope mismatch';
  END IF;
  IF NEW."targetStaffIdentityId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "StaffIdentity"
    WHERE "id" = NEW."targetStaffIdentityId"
      AND "organizationId" = NEW."organizationId"
      AND "status" = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Inbox conversation event target staff scope mismatch';
  END IF;
  IF NEW."targetStaffIdentityId" IS NOT NULL
    AND NEW."locationId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "LocationMember"
      WHERE "locationId" = NEW."locationId"
        AND "staffIdentityId" = NEW."targetStaffIdentityId"
    ) THEN
    RAISE EXCEPTION 'Inbox conversation event target staff location mismatch';
  END IF;
  IF NEW."actorUserId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Member"
    WHERE "organizationId" = NEW."organizationId"
      AND "userId" = NEW."actorUserId"
  ) AND NOT (
    NEW."locationId" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "LocationMember"
      WHERE "locationId" = NEW."locationId"
        AND "userId" = NEW."actorUserId"
    )
  ) THEN
    RAISE EXCEPTION 'Inbox conversation event actor scope mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "InboxConversationEvent_scope_guard" BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "conversationId", "actorUserId", "targetStaffIdentityId" ON "InboxConversationEvent" FOR EACH ROW EXECUTE FUNCTION "assert_inbox_conversation_event_scope"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_inbox_message_scope"() RETURNS trigger AS $$
DECLARE
  conversation_record "InboxConversation"%ROWTYPE;
  receipt_record "InboundMessageReceipt"%ROWTYPE;
  account_record "ProviderAccount"%ROWTYPE;
  route_record "InboxRoute"%ROWTYPE;
BEGIN
  SELECT * INTO conversation_record FROM "InboxConversation" WHERE "id" = NEW."conversationId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inbox message conversation not found';
  END IF;
  IF NEW."providerAccountId" IS NOT NULL THEN
    SELECT * INTO account_record FROM "ProviderAccount" WHERE "id" = NEW."providerAccountId";
    IF NOT FOUND OR account_record."organizationId" IS DISTINCT FROM conversation_record."organizationId" THEN
      RAISE EXCEPTION 'Inbox message provider account organization mismatch';
    END IF;
    IF conversation_record."locationId" IS NULL THEN
      IF account_record."locationId" IS NOT NULL THEN
        RAISE EXCEPTION 'Organization inbox messages require an organization provider account';
      END IF;
    ELSIF account_record."locationId" IS DISTINCT FROM conversation_record."locationId"
      AND NOT (account_record."locationId" IS NULL AND account_record."config" ->> 'inheritToLocations' = 'true') THEN
      RAISE EXCEPTION 'Inbox message provider account is not available in this location';
    END IF;
    IF conversation_record."routeId" IS NULL THEN
      RAISE EXCEPTION 'Provider-backed inbox messages require a conversation route';
    END IF;
    SELECT * INTO route_record FROM "InboxRoute" WHERE "id" = conversation_record."routeId";
    IF NOT FOUND OR route_record."providerAccountId" IS DISTINCT FROM NEW."providerAccountId" THEN
      RAISE EXCEPTION 'Inbox message provider account route mismatch';
    END IF;
  END IF;
  IF NEW."inboundReceiptId" IS NOT NULL THEN
    SELECT * INTO receipt_record FROM "InboundMessageReceipt" WHERE "id" = NEW."inboundReceiptId";
    IF NOT FOUND
      OR receipt_record."organizationId" IS DISTINCT FROM conversation_record."organizationId"
      OR receipt_record."locationId" IS DISTINCT FROM conversation_record."locationId"
      OR receipt_record."routeId" IS DISTINCT FROM conversation_record."routeId"
      OR receipt_record."providerAccountId" IS DISTINCT FROM NEW."providerAccountId" THEN
      RAISE EXCEPTION 'Inbox message inbound receipt scope mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "InboxMessage_scope_guard" BEFORE INSERT OR UPDATE OF "conversationId", "providerAccountId", "inboundReceiptId" ON "InboxMessage" FOR EACH ROW EXECUTE FUNCTION "assert_inbox_message_scope"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_inbox_read_state_scope"() RETURNS trigger AS $$
DECLARE
  conversation_record "InboxConversation"%ROWTYPE;
BEGIN
  SELECT * INTO conversation_record FROM "InboxConversation" WHERE "id" = NEW."conversationId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inbox read state conversation not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "Member"
    WHERE "organizationId" = conversation_record."organizationId"
      AND "userId" = NEW."userId"
  ) AND NOT (
    conversation_record."locationId" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "LocationMember"
      WHERE "locationId" = conversation_record."locationId"
        AND "userId" = NEW."userId"
    )
  ) THEN
    RAISE EXCEPTION 'Inbox read state user scope mismatch';
  END IF;
  IF NEW."lastReadMessageId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "InboxMessage"
    WHERE "id" = NEW."lastReadMessageId"
      AND "conversationId" = NEW."conversationId"
  ) THEN
    RAISE EXCEPTION 'Inbox read state message scope mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "InboxReadState_scope_guard" BEFORE INSERT OR UPDATE OF "conversationId", "userId", "lastReadMessageId" ON "InboxReadState" FOR EACH ROW EXECUTE FUNCTION "assert_inbox_read_state_scope"();
