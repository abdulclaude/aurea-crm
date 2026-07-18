"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import * as React from "react";

import {
  FormFieldEditor,
  type FormFieldUpdate,
} from "@/features/forms-builder/components/form-field-editor";
import type { FormEditorField } from "@/features/forms-builder/components/form-editor-types";

export function FormSortableFields({
  fields,
  updatePendingId,
  onUpdateField,
  onDeleteField,
  onReorder,
}: {
  fields: FormEditorField[];
  updatePendingId: string | null;
  onUpdateField: (value: FormFieldUpdate) => void;
  onDeleteField: (id: string) => void;
  onReorder: (orderedFieldIds: string[]) => void;
}): React.JSX.Element {
  const [orderedFields, setOrderedFields] = React.useState(fields);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  React.useEffect(() => setOrderedFields(fields), [fields]);

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedFields((current) => {
      const from = current.findIndex((field) => field.id === active.id);
      const to = current.findIndex((field) => field.id === over.id);
      if (from < 0 || to < 0) return current;

      const reordered = arrayMove(current, from, to);
      onReorder(reordered.map((field) => field.id));
      return reordered;
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedFields.map((field) => field.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 px-4 pb-4">
          {orderedFields.map((field, index) => (
            <FormFieldEditor
              key={field.id}
              field={field}
              index={index}
              pending={updatePendingId === field.id}
              onSave={onUpdateField}
              onDelete={onDeleteField}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
