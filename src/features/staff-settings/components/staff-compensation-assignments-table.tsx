import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StaffCompensationAssignment } from "@/features/staff-settings/contracts";

export function StaffCompensationAssignmentsTable(props: {
  assignments: StaffCompensationAssignment[];
}): React.JSX.Element {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">
          Active and historical assignments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Instructor</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell>{assignment.instructorName}</TableCell>
                <TableCell>
                  {assignment.templateName} v{assignment.version}
                </TableCell>
                <TableCell>
                  {assignment.currency} {assignment.hourlyRate}
                </TableCell>
                <TableCell>
                  {assignment.effectiveFrom.toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {props.assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-5 text-muted-foreground">
                  No compensation assignments
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
