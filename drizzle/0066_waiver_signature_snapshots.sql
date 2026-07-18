ALTER TABLE "WaiverSignature" ADD COLUMN "templateVersion" integer;
ALTER TABLE "WaiverSignature" ADD COLUMN "documentUrl" text;
ALTER TABLE "WaiverSignature" ADD COLUMN "documentName" text;
ALTER TABLE "WaiverSignature" ADD COLUMN "documentKey" text;
ALTER TABLE "WaiverSignature" DROP CONSTRAINT "WaiverSignature_templateId_fkey";
ALTER TABLE "WaiverSignature" ADD CONSTRAINT "WaiverSignature_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaiverTemplate"("id") ON DELETE restrict ON UPDATE cascade;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "WaiverSignature" AS signature
    LEFT JOIN "Client" AS client ON client."id" = signature."clientId"
    WHERE client."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add waiver client integrity: orphaned signatures require reconciliation';
  END IF;
END $$;
ALTER TABLE "WaiverSignature" ADD CONSTRAINT "WaiverSignature_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE restrict ON UPDATE cascade;
