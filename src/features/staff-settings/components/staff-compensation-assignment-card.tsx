import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffCompensationTemplate } from "@/features/staff-settings/contracts";

export type StaffCompensationInstructorOption = {
  id: string;
  name: string;
};

export function StaffCompensationAssignmentCard(props: {
  instructors: StaffCompensationInstructorOption[];
  templates: StaffCompensationTemplate[];
  instructorId: string;
  templateVersionId: string;
  canManage: boolean;
  disabled: boolean;
  onInstructorChange: (value: string) => void;
  onTemplateVersionChange: (value: string) => void;
  onAssign: () => Promise<void>;
}): React.JSX.Element {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Assign a template</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="compensation-instructor" className="text-xs">
            Instructor
          </Label>
          <Select
            value={props.instructorId}
            disabled={props.disabled}
            onValueChange={props.onInstructorChange}
          >
            <SelectTrigger id="compensation-instructor" className="w-full">
              <SelectValue placeholder="Select instructor" />
            </SelectTrigger>
            <SelectContent>
              {props.instructors.map((instructor) => (
                <SelectItem key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="compensation-template" className="text-xs">
            Template version
          </Label>
          <Select
            value={props.templateVersionId}
            disabled={props.disabled}
            onValueChange={props.onTemplateVersionChange}
          >
            <SelectTrigger id="compensation-template" className="w-full">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {props.templates.flatMap((template) =>
                template.currentVersion
                  ? [
                      <SelectItem
                        key={template.currentVersion.id}
                        value={template.currentVersion.id}
                      >
                        {template.name} v{template.currentVersion.version}
                      </SelectItem>,
                    ]
                  : [],
              )}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      {props.canManage ? (
        <CardFooter className="justify-end border-t">
          <Button
            type="button"
            onClick={props.onAssign}
            disabled={
              props.disabled || !props.instructorId || !props.templateVersionId
            }
          >
            Assign
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
