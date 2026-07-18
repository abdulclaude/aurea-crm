import { Label } from "@/components/ui/label";
import type { PublicFormField } from "@/features/forms-builder/lib/public-form-contract";

export function PublishedFormFieldLabel({
  field,
  controlId,
  labelId,
}: {
  field: PublicFormField;
  controlId: string;
  labelId: string;
}): React.JSX.Element {
  return (
    <Label
      id={labelId}
      htmlFor={controlId}
      className="break-words text-sm font-medium"
    >
      {field.label}
      {field.required ? (
        <>
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
          <span className="sr-only"> required</span>
        </>
      ) : null}
    </Label>
  );
}
