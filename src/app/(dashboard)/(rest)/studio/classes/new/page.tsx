import { ClassCreateForm } from "@/features/studio/components/class-create-form";
import { Separator } from "@/components/ui/separator";

export default function NewStudioClassPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">Add class</h1>
          <p className="text-xs text-primary/75">
            Create a scheduled class with pricing, capacity, and booking rules.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <ClassCreateForm />
    </div>
  );
}
