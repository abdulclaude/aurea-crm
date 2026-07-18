import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function PublishedFormResponseConsent({
  checked,
  disabled,
  error,
  label,
  privacyPolicyUrl,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  error: boolean;
  label: string;
  privacyPolicyUrl: string;
  onChange: (checked: boolean) => void;
}): React.JSX.Element {
  return (
    <div className="mt-8 border-t border-[var(--publication-border,#e5e7eb)] pt-6">
      <div className="flex items-start gap-3">
        <Checkbox
          id="publication-form-response-consent"
          checked={checked}
          disabled={disabled}
          aria-invalid={error}
          aria-describedby={
            error ? "publication-form-response-consent-error" : undefined
          }
          onCheckedChange={(value) => onChange(value === true)}
        />
        <div className="min-w-0">
          <Label
            htmlFor="publication-form-response-consent"
            className="break-words text-sm font-normal"
          >
            {label}{" "}
            <a
              href={privacyPolicyUrl}
              rel="noreferrer"
              target="_blank"
              className="font-medium underline underline-offset-2"
            >
              Privacy policy
            </a>
          </Label>
          {error ? (
            <p
              id="publication-form-response-consent-error"
              className="mt-1 text-xs text-destructive"
            >
              You must acknowledge this notice before submitting.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
