"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FormBuilderPreviewNavigation({
  isMultiStep,
  stepIndex,
  totalSteps,
  primaryColor,
  buttonTextColor,
  onBack,
  onContinue,
  onSubmit,
}: {
  isMultiStep: boolean;
  stepIndex: number;
  totalSteps: number;
  primaryColor: string;
  buttonTextColor: string;
  onBack: () => void;
  onContinue: () => void;
  onSubmit: () => void;
}): React.JSX.Element {
  const finalStep = !isMultiStep || stepIndex >= totalSteps - 1;
  const primaryStyle = {
    backgroundColor: primaryColor,
    color: buttonTextColor,
  };

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      {isMultiStep && stepIndex > 0 ? (
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft aria-hidden="true" />
          Back
        </Button>
      ) : null}
      {finalStep ? (
        <Button type="button" style={primaryStyle} onClick={onSubmit}>
          Submit response
        </Button>
      ) : (
        <Button type="button" style={primaryStyle} onClick={onContinue}>
          Continue
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
