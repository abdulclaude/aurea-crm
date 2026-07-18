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
unavailable_node_types(node_type) AS (
  VALUES
    ('STRIPE_TRIGGER'),
    ('GOOGLE_CALENDAR_EVENT_CREATED'), ('GOOGLE_CALENDAR_EVENT_UPDATED'), ('GOOGLE_CALENDAR_EVENT_DELETED'),
    ('GOOGLE_DRIVE_FILE_CREATED'), ('GOOGLE_DRIVE_FILE_UPDATED'), ('GOOGLE_DRIVE_FILE_DELETED'), ('GOOGLE_DRIVE_FOLDER_CREATED'),
    ('OUTLOOK_NEW_EMAIL'), ('OUTLOOK_EMAIL_MOVED'), ('OUTLOOK_EMAIL_DELETED'),
    ('ONEDRIVE_FILE_CREATED'), ('ONEDRIVE_FILE_UPDATED'), ('ONEDRIVE_FILE_DELETED'),
    ('OUTLOOK_CALENDAR_EVENT_CREATED'), ('OUTLOOK_CALENDAR_EVENT_UPDATED'), ('OUTLOOK_CALENDAR_EVENT_DELETED'),
    ('SLACK_NEW_MESSAGE'), ('SLACK_MESSAGE_REACTION'), ('SLACK_CHANNEL_JOINED'),
    ('ANTHROPIC'), ('OPENAI'), ('GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES'), ('GOOGLE_FORM_CREATE_RESPONSE'),
    ('OUTLOOK_SEND_EMAIL'), ('OUTLOOK_REPLY_TO_EMAIL'), ('OUTLOOK_MOVE_EMAIL'), ('OUTLOOK_SEARCH_EMAILS'),
    ('ONEDRIVE_UPLOAD_FILE'), ('ONEDRIVE_DOWNLOAD_FILE'), ('ONEDRIVE_MOVE_FILE'), ('ONEDRIVE_DELETE_FILE'),
    ('OUTLOOK_CALENDAR_CREATE_EVENT'), ('OUTLOOK_CALENDAR_UPDATE_EVENT'), ('OUTLOOK_CALENDAR_DELETE_EVENT'),
    ('SLACK_UPDATE_MESSAGE'), ('SLACK_SEND_DM'), ('SLACK_UPLOAD_FILE'),
    ('DISCORD_SEND_MESSAGE'), ('DISCORD_EDIT_MESSAGE'), ('DISCORD_SEND_EMBED'), ('DISCORD_SEND_DM'),
    ('TELEGRAM_SEND_MESSAGE'), ('TELEGRAM_SEND_PHOTO'), ('TELEGRAM_SEND_DOCUMENT'),
    ('SCHEDULE_APPOINTMENT'), ('UPDATE_APPOINTMENT'), ('CANCEL_APPOINTMENT'),
    ('STRIPE_CREATE_CHECKOUT_SESSION'), ('STRIPE_CREATE_INVOICE'), ('STRIPE_SEND_INVOICE'), ('STRIPE_REFUND_PAYMENT'),
    ('GEMINI_GENERATE_TEXT'), ('GEMINI_SUMMARISE'), ('GEMINI_TRANSFORM'), ('GEMINI_CLASSIFY'),
    ('EXECUTE_WORKFLOW')
),
workflows_to_archive AS (
  SELECT DISTINCT workflow.id
  FROM "Workflows" workflow
  INNER JOIN "Node" node ON node."workflowId" = workflow.id
  LEFT JOIN binding_specs spec ON spec.node_type = node.type::text
  WHERE
    workflow."isTemplate" = false
    AND workflow.archived = false
    AND (
      node.type::text IN (SELECT node_type FROM unavailable_node_types)
      OR (
        spec.node_type IS NOT NULL
        AND (
          node."providerAccountId" IS NULL
          OR NULLIF(BTRIM(COALESCE(node.data ->> 'providerAccountId', '')), '') IS DISTINCT FROM node."providerAccountId"
          OR NOT EXISTS (
            SELECT 1
            FROM "ProviderAccount" account
            INNER JOIN "ProviderOAuthGrant" oauth_grant
              ON oauth_grant."providerAccountId" = account.id
              AND oauth_grant.scopes @> spec.required_scopes
            WHERE
              account.id = node."providerAccountId"
              AND account."organizationId" = workflow."organizationId"
              AND account.provider = spec.provider
              AND account.status = 'ACTIVE'
              AND (
                account."locationId" = workflow."locationId"
                OR (
                  account."locationId" IS NULL
                  AND (
                    workflow."locationId" IS NULL
                    OR COALESCE(account.config ->> 'inheritToLocations', 'false') = 'true'
                  )
                )
              )
          )
        )
      )
    )
)
UPDATE "Workflows" workflow
SET archived = true, "updatedAt" = CURRENT_TIMESTAMP
FROM workflows_to_archive
WHERE workflow.id = workflows_to_archive.id;
