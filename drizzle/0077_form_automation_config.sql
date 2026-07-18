ALTER TABLE "Form"
ADD COLUMN IF NOT EXISTS "automationConfig" jsonb
DEFAULT '{"version":1,"emailMarketingConsentFieldId":null,"smsMarketingConsentFieldId":null,"followUpConsentFieldId":null}'::jsonb
NOT NULL;

ALTER TABLE "FormSubmission"
ADD COLUMN IF NOT EXISTS "automationConfig" jsonb;
