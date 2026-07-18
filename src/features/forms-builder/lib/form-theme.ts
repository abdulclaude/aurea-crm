import { z } from "zod";

export const DEFAULT_FORM_THEME = {
  backgroundColor: "#ffffff",
  textColor: "#111827",
  primaryColor: "#2563eb",
  buttonTextColor: "#ffffff",
} as const;

export const formColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Choose a six-digit hex color.");

export const formThemeSchema = z
  .object({
    backgroundColor: formColorSchema.default(
      DEFAULT_FORM_THEME.backgroundColor,
    ),
    textColor: formColorSchema.default(DEFAULT_FORM_THEME.textColor),
    primaryColor: formColorSchema.default(DEFAULT_FORM_THEME.primaryColor),
    buttonTextColor: formColorSchema.default(
      DEFAULT_FORM_THEME.buttonTextColor,
    ),
  })
  .strict();

export type FormTheme = z.infer<typeof formThemeSchema>;
