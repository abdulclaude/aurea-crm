import type { FormProgressDisplay } from "@/features/forms-builder/lib/form-progress";

export function PublishedFormProgress({
  current,
  total,
  variant,
}: {
  current: number;
  total: number;
  variant: FormProgressDisplay;
}): React.JSX.Element {
  const percent = total > 0 ? (current / total) * 100 : 100;
  const roundedPercent = Math.round(percent);

  if (variant === "RING") {
    return (
      <div className="mb-7 flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={roundedPercent}
          aria-label="Form progress"
          className="grid size-12 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--publication-primary, #2563eb) ${roundedPercent}%, var(--publication-border, #e5e7eb) 0)`,
          }}
        >
          <span className="grid size-9 place-items-center rounded-full bg-[var(--publication-background,#fff)] text-[10px] font-semibold">
            {roundedPercent}%
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold">Step {current}</p>
          <p className="text-[11px] opacity-65">{total} steps total</p>
        </div>
      </div>
    );
  }

  if (variant === "STEPS") {
    return (
      <div className="mb-7">
        <p className="mb-3 text-xs font-medium opacity-70">
          Step {current} of {total}
        </p>
        <ol
          aria-label="Form progress"
          className="flex min-w-0 items-center overflow-x-auto pb-1"
        >
          {Array.from({ length: total }, (_, index) => {
            const step = index + 1;
            const reached = step <= current;
            return (
              <li
                key={step}
                aria-current={step === current ? "step" : undefined}
                className="flex min-w-8 flex-1 items-center last:flex-none"
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold ${
                    reached
                      ? "border-[var(--publication-primary,#2563eb)] bg-[var(--publication-primary,#2563eb)] text-[var(--publication-button-text,#fff)]"
                      : "border-[var(--publication-border,#e5e7eb)] opacity-60"
                  }`}
                >
                  {step}
                </span>
                {step < total ? (
                  <span
                    aria-hidden="true"
                    className={`h-px min-w-3 flex-1 ${
                      step < current
                        ? "bg-[var(--publication-primary,#2563eb)]"
                        : "bg-[var(--publication-border,#e5e7eb)]"
                    }`}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="mb-7 space-y-2">
      <div className="flex justify-between text-xs font-medium opacity-70">
        <span>
          Step {current} of {total}
        </span>
        <span>{roundedPercent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedPercent}
        aria-label="Form progress"
        className="h-1.5 overflow-hidden rounded-full bg-[var(--publication-border,#e5e7eb)]"
      >
        <div
          className="h-full bg-[var(--publication-primary,#111827)] transition-[width] motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
