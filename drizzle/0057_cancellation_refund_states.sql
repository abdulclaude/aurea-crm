ALTER TYPE "public"."CancellationChargeStatus"
  ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

ALTER TYPE "public"."CancellationChargeStatus"
  ADD VALUE IF NOT EXISTS 'REFUNDED';

ALTER TYPE "public"."CancellationChargeStatus"
  ADD VALUE IF NOT EXISTS 'DISPUTED';
