WITH binding_specs(node_type, provider, required_scopes) AS (
  VALUES
    ('GMAIL_EXECUTION', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']::text[]),
    ('GMAIL_SEND_EMAIL', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/gmail.send']::text[]),
    ('GMAIL_REPLY_TO_EMAIL', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']::text[]),
    ('GMAIL_SEARCH_EMAILS', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/gmail.readonly']::text[]),
    ('GMAIL_ADD_LABEL', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/gmail.modify']::text[]),
    ('GMAIL_TRIGGER', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/gmail.readonly']::text[]),
    ('GOOGLE_CALENDAR_TRIGGER', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/calendar']::text[]),
    ('GOOGLE_CALENDAR_EXECUTION', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/calendar']::text[]),
    ('GOOGLE_CALENDAR_CREATE_EVENT', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/calendar']::text[]),
    ('GOOGLE_CALENDAR_UPDATE_EVENT', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/calendar']::text[]),
    ('GOOGLE_CALENDAR_DELETE_EVENT', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/calendar']::text[]),
    ('GOOGLE_DRIVE_CREATE_FOLDER', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/drive.file']::text[]),
    ('GOOGLE_DRIVE_DELETE_FILE', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/drive']::text[]),
    ('GOOGLE_DRIVE_DOWNLOAD_FILE', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/drive']::text[]),
    ('GOOGLE_DRIVE_MOVE_FILE', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/drive']::text[]),
    ('GOOGLE_DRIVE_UPLOAD_FILE', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/drive.file']::text[]),
    ('GOOGLE_FORM_READ_RESPONSES', 'GOOGLE_WORKSPACE', ARRAY['https://www.googleapis.com/auth/forms.responses.readonly', 'https://www.googleapis.com/auth/forms.body.readonly']::text[]),
    ('ONEDRIVE_EXECUTION', 'MICROSOFT_365', ARRAY['Files.ReadWrite.All']::text[]),
    ('ONEDRIVE_TRIGGER', 'MICROSOFT_365', ARRAY['Files.ReadWrite.All']::text[]),
    ('OUTLOOK_EXECUTION', 'MICROSOFT_365', ARRAY['Mail.Send']::text[]),
    ('OUTLOOK_TRIGGER', 'MICROSOFT_365', ARRAY['Mail.ReadWrite']::text[]),
    ('SLACK_SEND_MESSAGE', 'SLACK_OAUTH', ARRAY['chat:write']::text[])
),
eligible AS (
  SELECT
    n.id AS node_id,
    pa.id AS provider_account_id,
    COUNT(*) OVER (PARTITION BY n.id) AS eligible_count,
    NULLIF(BTRIM(n.data ->> 'providerAccountId'), '') AS existing_binding
  FROM "Node" n
  INNER JOIN "Workflows" w ON w.id = n."workflowId"
  INNER JOIN binding_specs spec ON spec.node_type = n.type::text
  INNER JOIN "ProviderAccount" pa
    ON pa."organizationId" = w."organizationId"
    AND pa.provider = spec.provider
    AND pa.status = 'ACTIVE'
    AND (
      pa."locationId" = w."locationId"
      OR (
        pa."locationId" IS NULL
        AND (
          w."locationId" IS NULL
          OR COALESCE(pa.config ->> 'inheritToLocations', 'false') = 'true'
        )
      )
    )
  INNER JOIN "ProviderOAuthGrant" oauth_grant
    ON oauth_grant."providerAccountId" = pa.id
    AND oauth_grant.scopes @> spec.required_scopes
  WHERE n."providerAccountId" IS NULL
),
chosen AS (
  SELECT node_id, provider_account_id
  FROM eligible
  WHERE
    existing_binding = provider_account_id
    OR (existing_binding IS NULL AND eligible_count = 1)
)
UPDATE "Node" n
SET
  "providerAccountId" = chosen.provider_account_id,
  data = jsonb_set(
    CASE WHEN jsonb_typeof(n.data) = 'object' THEN n.data ELSE '{}'::jsonb END,
    '{providerAccountId}',
    to_jsonb(chosen.provider_account_id),
    true
  ),
  "updatedAt" = CURRENT_TIMESTAMP
FROM chosen
WHERE n.id = chosen.node_id;
