type ReferralRewardType = "CREDIT" | "DISCOUNT" | "FREE_CLASS" | "CASH";

export type PublicReferralProgram = {
  id: string;
  name: string;
  referrerRewardType: ReferralRewardType;
  referrerRewardValue: string;
  refereeRewardType: ReferralRewardType;
  refereeRewardValue: string;
  currency: string;
  refereeOfferDays: number;
  isActive: boolean;
  updatedAt: Date;
};

export function toPublicReferralProgram(
  program: PublicReferralProgram,
): PublicReferralProgram {
  return {
    id: program.id,
    name: program.name.slice(0, 160),
    referrerRewardType: program.referrerRewardType,
    referrerRewardValue: program.referrerRewardValue,
    refereeRewardType: program.refereeRewardType,
    refereeRewardValue: program.refereeRewardValue,
    currency: program.currency,
    refereeOfferDays: program.refereeOfferDays,
    isActive: program.isActive,
    updatedAt: program.updatedAt,
  };
}
