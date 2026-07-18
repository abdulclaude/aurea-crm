import {
  customerFieldTypes,
  householdSharingKeys,
} from "@/features/customer-settings/contracts";

export type CustomerFieldDefinition = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  fieldType: (typeof customerFieldTypes)[number];
  isRequired: boolean;
  options: string[];
  archivedAt: Date | null;
};

export type CustomerTagDefinition = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  archivedAt: Date | null;
};

export type NoteTemplateDefinition = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  archivedAt: Date | null;
};

export type HouseholdPolicy = {
  version: number;
  values: {
    relationships: Array<{
      key: string;
      label: string;
      reciprocalLabel: string | null;
    }>;
    sharedData: Array<(typeof householdSharingKeys)[number]>;
    requirePrimaryContactApproval: boolean;
  };
};

export type HouseholdPolicyHistoryEntry = {
  version: number;
  changeNote: string | null;
  createdAt: Date;
};

export type RefreshSettings = () => Promise<unknown>;
