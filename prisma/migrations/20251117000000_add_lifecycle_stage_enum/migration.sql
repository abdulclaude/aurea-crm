-- CreateEnum
CREATE TYPE "LifecycleStage" AS ENUM ('SUBSCRIBER', 'LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST');

-- AlterTable
ALTER TABLE "contact" ADD COLUMN "lifecycleStage_new" "LifecycleStage";

-- Copy and transform existing data (if any)
UPDATE "contact"
SET "lifecycleStage_new" =
  CASE
    WHEN UPPER("lifecycleStage") = 'SUBSCRIBER' THEN 'SUBSCRIBER'::"LifecycleStage"
    WHEN UPPER("lifecycleStage") = 'LEAD' THEN 'LEAD'::"LifecycleStage"
    WHEN UPPER("lifecycleStage") = 'MQL' THEN 'MQL'::"LifecycleStage"
    WHEN UPPER("lifecycleStage") = 'SQL' THEN 'SQL'::"LifecycleStage"
    WHEN UPPER("lifecycleStage") = 'OPPORTUNITY' THEN 'OPPORTUNITY'::"LifecycleStage"
    WHEN UPPER("lifecycleStage") = 'CUSTOMER' THEN 'CUSTOMER'::"LifecycleStage"
    WHEN UPPER("lifecycleStage") = 'EVANGELIST' THEN 'EVANGELIST'::"LifecycleStage"
    ELSE NULL
  END
WHERE "lifecycleStage" IS NOT NULL;

-- Drop old column
ALTER TABLE "contact" DROP COLUMN "lifecycleStage";

-- Rename new column
ALTER TABLE "contact" RENAME COLUMN "lifecycleStage_new" TO "lifecycleStage";
