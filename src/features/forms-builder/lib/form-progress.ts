import { z } from "zod";

export const formProgressDisplaySchema = z.enum(["RING", "STEPS", "BAR"]);
export type FormProgressDisplay = z.infer<typeof formProgressDisplaySchema>;

export const DEFAULT_FORM_PROGRESS_DISPLAY: FormProgressDisplay = "BAR";
