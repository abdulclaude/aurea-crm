"use client";

import { use, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { User, Briefcase, Shield, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { format } from "date-fns";
import { InstructorDocumentsTable } from "@/features/instructors/components/instructor-documents-table";
import { InstructorSchedule } from "@/features/instructors/components/instructor-schedule";

const pageTabs = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Documents" },
  { id: "schedule", label: "Schedule" },
];

export default function InstructorDetailPage({
  params,
}: {
  params: Promise<{ instructorId: string }>;
}) {
  const { instructorId } = use(params);
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: instructor } = useSuspenseQuery(
    trpc.instructors.getById.queryOptions({ id: instructorId })
  );

  if (!instructor) {
    return (
      <div className="p-6">
        <p className="text-primary/60">Instructor not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center gap-4 p-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary">{instructor.name}</h1>
          <p className="text-sm text-primary/60">
            {instructor.role || "Staff Member"}
            {instructor.employeeId && ` • ID: ${instructor.employeeId}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={instructor.isActive ? "default" : "outline"}>
            {instructor.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <Separator className="w-full" />
      <PageTabs
        tabs={pageTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

        {/* Overview Tab */}
        {activeTab === "overview" && (
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="size-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-primary/60">Full Name</p>
                  <p className="text-sm">{instructor.name}</p>
                </div>
                {instructor.email && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Email</p>
                    <p className="text-sm">{instructor.email}</p>
                  </div>
                )}
                {instructor.phone && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Phone</p>
                    <p className="text-sm">{instructor.phone}</p>
                  </div>
                )}
                {instructor.dateOfBirth && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Date of Birth</p>
                    <p className="text-sm">{format(new Date(instructor.dateOfBirth), "dd MMM yyyy")}</p>
                  </div>
                )}
                {instructor.gender && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Gender</p>
                    <p className="text-sm">{instructor.gender}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="size-5" />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {instructor.role && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Role</p>
                    <p className="text-sm">{instructor.role}</p>
                  </div>
                )}
                {instructor.employeeId && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Employee ID</p>
                    <p className="text-sm">{instructor.employeeId}</p>
                  </div>
                )}
                {instructor.hourlyRate && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Hourly Rate</p>
                    <p className="text-sm">
                      {instructor.currency || "GBP"} {Number(instructor.hourlyRate).toFixed(2)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-primary/60">Status</p>
                  <Badge variant={instructor.isActive ? "default" : "outline"} className="mt-1">
                    {instructor.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary/60">Joined</p>
                  <p className="text-sm">{format(new Date(instructor.createdAt), "dd MMM yyyy")}</p>
                </div>
                {instructor.lastLoginAt && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Last Login</p>
                    <p className="text-sm">{format(new Date(instructor.lastLoginAt), "dd MMM yyyy HH:mm")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Address */}
            {(instructor.addressLine1 || instructor.city || instructor.postcode) && (
              <Card>
                <CardHeader>
                  <CardTitle>Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {instructor.addressLine1 && <p className="text-sm">{instructor.addressLine1}</p>}
                  {instructor.addressLine2 && <p className="text-sm">{instructor.addressLine2}</p>}
                  {instructor.city && <p className="text-sm">{instructor.city}</p>}
                  {instructor.county && <p className="text-sm">{instructor.county}</p>}
                  {instructor.postcode && <p className="text-sm">{instructor.postcode}</p>}
                  {instructor.country && <p className="text-sm">{instructor.country}</p>}
                </CardContent>
              </Card>
            )}

            {/* Emergency Client */}
            {(instructor.emergencyContactName || instructor.emergencyContactPhone) && (
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {instructor.emergencyContactName && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Name</p>
                      <p className="text-sm">{instructor.emergencyContactName}</p>
                    </div>
                  )}
                  {instructor.emergencyContactRelation && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Relationship</p>
                      <p className="text-sm">{instructor.emergencyContactRelation}</p>
                    </div>
                  )}
                  {instructor.emergencyContactPhone && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Phone</p>
                      <p className="text-sm">{instructor.emergencyContactPhone}</p>
                    </div>
                  )}
                  {instructor.emergencyContactEmail && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Email</p>
                      <p className="text-sm">{instructor.emergencyContactEmail}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Work Preferences */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-5" />
                  Work Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {instructor.hasOwnTransport !== null && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Own Transport</p>
                      <p className="text-sm">{instructor.hasOwnTransport ? "Yes" : "No"}</p>
                    </div>
                  )}
                  {instructor.maxHoursPerWeek && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Max Hours/Week</p>
                      <p className="text-sm">{instructor.maxHoursPerWeek} hours</p>
                    </div>
                  )}
                  {instructor.travelRadius && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Travel Radius</p>
                      <p className="text-sm">{instructor.travelRadius} miles</p>
                    </div>
                  )}
                  {instructor.skills && (Array.isArray(instructor.skills) ? instructor.skills.length > 0 : instructor.skills) && (
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-primary/60 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {(typeof instructor.skills === 'string'
                          ? (instructor.skills as string).split(',')
                          : (instructor.skills as string[])
                        ).map((skill: string, i: number) => (
                          <Badge key={i} variant="outline">{skill.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {instructor.languages && (Array.isArray(instructor.languages) ? instructor.languages.length > 0 : instructor.languages) && (
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-primary/60 mb-2">Languages</p>
                      <div className="flex flex-wrap gap-2">
                        {(typeof instructor.languages === 'string'
                          ? (instructor.languages as string).split(',')
                          : (instructor.languages as string[])
                        ).map((lang: string, i: number) => (
                          <Badge key={i} variant="outline">{lang.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {instructor.qualifications && (Array.isArray(instructor.qualifications) ? instructor.qualifications.length > 0 : instructor.qualifications) && (
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-primary/60 mb-2">Qualifications</p>
                      <div className="flex flex-wrap gap-2">
                        {(typeof instructor.qualifications === 'string'
                          ? (instructor.qualifications as string).split(',')
                          : (instructor.qualifications as string[])
                        ).map((qual: string, i: number) => (
                          <Badge key={i} variant="outline">{qual.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Banking Details */}
            {(instructor.bankAccountNumber || instructor.bankSortCode) && (
              <Card>
                <CardHeader>
                  <CardTitle>Banking Details</CardTitle>
                  <CardDescription>For payroll processing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {instructor.bankAccountName && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Account Name</p>
                      <p className="text-sm">{instructor.bankAccountName}</p>
                    </div>
                  )}
                  {instructor.bankAccountNumber && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Account Number</p>
                      <p className="text-sm font-mono">****{instructor.bankAccountNumber.slice(-4)}</p>
                    </div>
                  )}
                  {instructor.bankSortCode && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Sort Code</p>
                      <p className="text-sm font-mono">{instructor.bankSortCode}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Compliance */}
            {instructor.nationalInsuranceNumber && (
              <Card>
                <CardHeader>
                  <CardTitle>Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {instructor.nationalInsuranceNumber && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">National Insurance Number</p>
                      <p className="text-sm font-mono">{instructor.nationalInsuranceNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-primary/60">Onboarding</p>
                    <Badge variant={instructor.onboardingCompleted ? "default" : "outline"}>
                      {instructor.onboardingCompleted ? "Completed" : "Pending"}
                    </Badge>
                    {instructor.onboardingCompletedAt && (
                      <p className="text-xs text-primary/60 mt-1">
                        Completed: {format(new Date(instructor.onboardingCompletedAt), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
        <div className="p-6">
          <InstructorDocumentsTable instructorId={instructorId} />
        </div>
        )}

        {/* Schedule Tab */}
        {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Calendar className="size-4" />
              Shift schedule
            </div>
            <p className="mt-1 text-xs text-primary/60">
              View and manage {instructor.name}'s scheduled shifts.
            </p>
          </div>
          <Separator className="w-full" />
          <InstructorSchedule instructorId={instructorId} />
        </div>
        )}
    </div>
  );
}
