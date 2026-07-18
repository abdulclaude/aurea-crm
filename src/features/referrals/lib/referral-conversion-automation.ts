import { NodeType } from "@/db/enums";

type ReferralConversionAutomationInput = {
  referralId: string;
  programId: string;
  organizationId: string;
  locationId: string | null;
  referrerClientId: string;
  refereeClientId: string;
  convertedAt: Date;
};

export function buildReferralConversionAutomationDispatch(
  input: ReferralConversionAutomationInput,
) {
  return {
    nodeType: NodeType.REFERRAL_CONVERTED_TRIGGER,
    organizationId: input.organizationId,
    locationId: input.locationId,
    idempotencyKey: `referral-converted:${input.referralId}`,
    triggerData: {
      referralId: input.referralId,
      programId: input.programId,
      referrerClientId: input.referrerClientId,
      refereeClientId: input.refereeClientId,
      clientId: input.refereeClientId,
      convertedAt: input.convertedAt.toISOString(),
      status: "CONVERTED" as const,
    },
  };
}
