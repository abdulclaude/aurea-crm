ALTER TABLE "WidgetConfig" ADD COLUMN "locationId" text;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PublicationTarget" target
    LEFT JOIN "WidgetConfig" widget ON widget."id" = target."sourceId"
    WHERE target."kind" = 'WIDGET'
      AND (
        (
          target."status" <> 'ARCHIVED'
          AND (target."sourceId" IS NULL OR widget."id" IS NULL)
        )
        OR (
          widget."id" IS NOT NULL
          AND widget."organizationId" <> target."organizationId"
        )
      )
  ) THEN
    RAISE EXCEPTION 'Cannot scope widgets: a live widget publication is dangling or belongs to another organization';
  END IF;

  IF EXISTS (
    SELECT target."sourceId"
    FROM "PublicationTarget" target
    INNER JOIN "WidgetConfig" widget ON widget."id" = target."sourceId"
    WHERE target."kind" = 'WIDGET'
      AND target."sourceId" IS NOT NULL
    GROUP BY target."sourceId"
    HAVING COUNT(DISTINCT COALESCE(target."locationId", '__organization__')) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot scope widgets: a widget is published in more than one organization/location scope';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PublicationTarget" target
    INNER JOIN "WidgetConfig" widget ON widget."id" = target."sourceId"
    WHERE target."kind" = 'WIDGET'
      AND target."sourceId" IS NOT NULL
      AND target."sourceKey" <> CASE
        WHEN target."locationId" IS NULL
          THEN 'widget:' || target."sourceId" || ':organization'
        ELSE 'widget:' || target."sourceId" || ':location:' || target."locationId"
      END
  ) THEN
    RAISE EXCEPTION 'Cannot scope widgets: a widget publication has a non-canonical source key';
  END IF;
END $$;
--> statement-breakpoint

UPDATE "WidgetConfig" widget
SET "locationId" = inferred."locationId"
FROM (
  SELECT target."sourceId", MIN(target."locationId") AS "locationId"
  FROM "PublicationTarget" target
  INNER JOIN "WidgetConfig" existing_widget
    ON existing_widget."id" = target."sourceId"
  WHERE target."kind" = 'WIDGET'
    AND target."sourceId" IS NOT NULL
  GROUP BY target."sourceId"
) inferred
WHERE widget."id" = inferred."sourceId";
--> statement-breakpoint

CREATE INDEX "WidgetConfig_organizationId_locationId_idx"
  ON "WidgetConfig" USING btree ("organizationId", "locationId");
--> statement-breakpoint

ALTER TABLE "WidgetConfig"
  ADD CONSTRAINT "WidgetConfig_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId")
  REFERENCES "Location" ("organizationId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
--> statement-breakpoint

ALTER TABLE "PublicationTarget"
  ADD CONSTRAINT "PublicationTarget_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId")
  REFERENCES "Location" ("organizationId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION validate_widget_publication_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_source_key text;
BEGIN
  IF NEW."kind" <> 'WIDGET' THEN
    RETURN NEW;
  END IF;

  IF NEW."sourceId" IS NULL THEN
    RAISE EXCEPTION 'Widget publication targets require a sourceId';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "WidgetConfig" widget
    WHERE widget."id" = NEW."sourceId"
      AND widget."organizationId" = NEW."organizationId"
      AND widget."locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Widget publication target scope does not match its widget';
  END IF;

  expected_source_key := CASE
    WHEN NEW."locationId" IS NULL
      THEN 'widget:' || NEW."sourceId" || ':organization'
    ELSE 'widget:' || NEW."sourceId" || ':location:' || NEW."locationId"
  END;
  IF NEW."sourceKey" <> expected_source_key THEN
    RAISE EXCEPTION 'Widget publication target sourceKey is not canonical';
  END IF;

  RETURN NEW;
END $$;
--> statement-breakpoint

CREATE TRIGGER "PublicationTarget_widget_scope_guard"
BEFORE INSERT OR UPDATE OF "kind", "sourceId", "sourceKey", "organizationId", "locationId"
ON "PublicationTarget"
FOR EACH ROW
EXECUTE FUNCTION validate_widget_publication_scope();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION prevent_published_widget_scope_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PublicationTarget" target
    WHERE target."kind" = 'WIDGET'
      AND target."sourceId" = OLD."id"
  ) THEN
    RAISE EXCEPTION 'Cannot change the scope of a widget with publication history';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint

CREATE TRIGGER "WidgetConfig_published_scope_guard"
BEFORE UPDATE OF "organizationId", "locationId"
ON "WidgetConfig"
FOR EACH ROW
WHEN (
  OLD."organizationId" IS DISTINCT FROM NEW."organizationId"
  OR OLD."locationId" IS DISTINCT FROM NEW."locationId"
)
EXECUTE FUNCTION prevent_published_widget_scope_change();
