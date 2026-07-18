DO $$
DECLARE
  duplicate_groups integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO duplicate_groups
  FROM (
    SELECT 1
    FROM "StudioBooking"
    WHERE status IN ('BOOKED', 'ATTENDED')
    GROUP BY "classId", "clientId"
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = format(
        'Active booking integrity migration blocked: %s class/member duplicate groups require reconciliation.',
        duplicate_groups
      );
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "StudioBooking_active_class_client_key"
  ON "StudioBooking" USING btree ("classId", "clientId")
  WHERE status IN ('BOOKED', 'ATTENDED');
