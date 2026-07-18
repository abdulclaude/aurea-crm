import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";
import type { FormProgressDisplay } from "@/features/forms-builder/lib/form-progress";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type FormEditorData = RouterOutputs["forms"]["get"];
export type FormEditorStep = FormEditorData["formStep"][number];
export type FormEditorField = FormEditorStep["formField"][number];
export type FormStylePreset = RouterOutputs["globalStyles"]["list"][number];

export type FormSettingsDraft = {
  name: string;
  description: string;
  isMultiStep: boolean;
  showProgress: boolean;
  progressDisplay: FormProgressDisplay;
  successMessage: string;
  redirectUrl: string;
  stylePresetId: string | null;
  primaryColor: string;
  buttonTextColor: string;
  backgroundColor: string;
  textColor: string;
};
