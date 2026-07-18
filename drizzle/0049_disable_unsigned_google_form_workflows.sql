UPDATE "Workflows" workflow
SET
  archived = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  workflow."isTemplate" = false
  AND workflow.archived = false
  AND EXISTS (
    SELECT 1
    FROM "Node" node
    WHERE
      node."workflowId" = workflow.id
      AND node.type = 'GOOGLE_FORM_TRIGGER'
      AND LENGTH(COALESCE(BTRIM(node.data ->> 'webhookSecret'), '')) < 32
  );
