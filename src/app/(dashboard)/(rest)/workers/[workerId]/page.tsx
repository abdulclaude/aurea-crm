"use client";

import { use } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, User, Briefcase, Shield, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { format } from "date-fns";
import { WorkerDocumentsTable } from "@/features/workers/components/worker-documents-table";
import { WorkerSchedule } from "@/features/workers/components/worker-schedule";

export default function WorkerDetailPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const trpc = useTRPC();

  const { data: worker } = useSuspenseQuery(
    trpc.workers.getById.queryOptions({ id: workerId })
  );

  if (!worker) {
    return (
      <div className="p-6">
        <p className="text-primary/60">Worker not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/workers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary">{worker.name}</h1>
          <p className="text-sm text-primary/60">
            {worker.role || "Staff Member"}
            {worker.employeeId && ` • ID: ${worker.employeeId}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={worker.isActive ? "default" : "outline"}>
            {worker.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <User className="size-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="size-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="size-4 mr-2" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
                  <p className="text-sm">{worker.name}</p>
                </div>
                {worker.email && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Email</p>
                    <p className="text-sm">{worker.email}</p>
                  </div>
                )}
                {worker.phone && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Phone</p>
                    <p className="text-sm">{worker.phone}</p>
                  </div>
                )}
                {worker.dateOfBirth && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Date of Birth</p>
                    <p className="text-sm">{format(new Date(worker.dateOfBirth), "dd MMM yyyy")}</p>
                  </div>
                )}
                {worker.gender && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Gender</p>
                    <p className="text-sm">{worker.gender}</p>
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
                {worker.role && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Role</p>
                    <p className="text-sm">{worker.role}</p>
                  </div>
                )}
                {worker.employeeId && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Employee ID</p>
                    <p className="text-sm">{worker.employeeId}</p>
                  </div>
                )}
                {worker.hourlyRate && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Hourly Rate</p>
                    <p className="text-sm">
                      {worker.currency || "GBP"} {Number(worker.hourlyRate).toFixed(2)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-primary/60">Status</p>
                  <Badge variant={worker.isActive ? "default" : "outline"} className="mt-1">
                    {worker.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary/60">Joined</p>
                  <p className="text-sm">{format(new Date(worker.createdAt), "dd MMM yyyy")}</p>
                </div>
                {worker.lastLoginAt && (
                  <div>
                    <p className="text-sm font-medium text-primary/60">Last Login</p>
                    <p className="text-sm">{format(new Date(worker.lastLoginAt), "dd MMM yyyy HH:mm")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Address */}
            {(worker.addressLine1 || worker.city || worker.postcode) && (
              <Card>
                <CardHeader>
                  <CardTitle>Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {worker.addressLine1 && <p className="text-sm">{worker.addressLine1}</p>}
                  {worker.addressLine2 && <p className="text-sm">{worker.addressLine2}</p>}
                  {worker.city && <p className="text-sm">{worker.city}</p>}
                  {worker.county && <p className="text-sm">{worker.county}</p>}
                  {worker.postcode && <p className="text-sm">{worker.postcode}</p>}
                  {worker.country && <p className="text-sm">{worker.country}</p>}
                </CardContent>
              </Card>
            )}

            {/* Emergency Contact */}
            {(worker.emergencyContactName || worker.emergencyContactPhone) && (
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {worker.emergencyContactName && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Name</p>
                      <p className="text-sm">{worker.emergencyContactName}</p>
                    </div>
                  )}
                  {worker.emergencyContactRelation && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Relationship</p>
                      <p className="text-sm">{worker.emergencyContactRelation}</p>
                    </div>
                  )}
                  {worker.emergencyContactPhone && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Phone</p>
                      <p className="text-sm">{worker.emergencyContactPhone}</p>
                    </div>
                  )}
                  {worker.emergencyContactEmail && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Email</p>
                      <p className="text-sm">{worker.emergencyContactEmail}</p>
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
                  {worker.hasOwnTransport !== null && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Own Transport</p>
                      <p className="text-sm">{worker.hasOwnTransport ? "Yes" : "No"}</p>
                    </div>
                  )}
                  {worker.maxHoursPerWeek && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Max Hours/Week</p>
                      <p className="text-sm">{worker.maxHoursPerWeek} hours</p>
                    </div>
                  )}
                  {worker.travelRadius && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Travel Radius</p>
                      <p className="text-sm">{worker.travelRadius} miles</p>
                    </div>
                  )}
                  {worker.skills && (Array.isArray(worker.skills) ? worker.skills.length > 0 : worker.skills) && (
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-primary/60 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {(typeof worker.skills === 'string'
                          ? (worker.skills as string).split(',')
                          : (worker.skills as string[])
                        ).map((skill: string, i: number) => (
                          <Badge key={i} variant="outline">{skill.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {worker.languages && (Array.isArray(worker.languages) ? worker.languages.length > 0 : worker.languages) && (
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-primary/60 mb-2">Languages</p>
                      <div className="flex flex-wrap gap-2">
                        {(typeof worker.languages === 'string'
                          ? (worker.languages as string).split(',')
                          : (worker.languages as string[])
                        ).map((lang: string, i: number) => (
                          <Badge key={i} variant="outline">{lang.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {worker.qualifications && (Array.isArray(worker.qualifications) ? worker.qualifications.length > 0 : worker.qualifications) && (
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-primary/60 mb-2">Qualifications</p>
                      <div className="flex flex-wrap gap-2">
                        {(typeof worker.qualifications === 'string'
                          ? (worker.qualifications as string).split(',')
                          : (worker.qualifications as string[])
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
            {(worker.bankAccountNumber || worker.bankSortCode) && (
              <Card>
                <CardHeader>
                  <CardTitle>Banking Details</CardTitle>
                  <CardDescription>For payroll processing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {worker.bankAccountName && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Account Name</p>
                      <p className="text-sm">{worker.bankAccountName}</p>
                    </div>
                  )}
                  {worker.bankAccountNumber && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Account Number</p>
                      <p className="text-sm font-mono">****{worker.bankAccountNumber.slice(-4)}</p>
                    </div>
                  )}
                  {worker.bankSortCode && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">Sort Code</p>
                      <p className="text-sm font-mono">{worker.bankSortCode}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Compliance */}
            {worker.nationalInsuranceNumber && (
              <Card>
                <CardHeader>
                  <CardTitle>Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {worker.nationalInsuranceNumber && (
                    <div>
                      <p className="text-sm font-medium text-primary/60">National Insurance Number</p>
                      <p className="text-sm font-mono">{worker.nationalInsuranceNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-primary/60">Onboarding</p>
                    <Badge variant={worker.onboardingCompleted ? "default" : "outline"}>
                      {worker.onboardingCompleted ? "Completed" : "Pending"}
                    </Badge>
                    {worker.onboardingCompletedAt && (
                      <p className="text-xs text-primary/60 mt-1">
                        Completed: {format(new Date(worker.onboardingCompletedAt), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <WorkerDocumentsTable workerId={workerId} />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Shift Schedule</CardTitle>
              <CardDescription>View and manage {worker.name}'s scheduled shifts</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkerSchedule workerId={workerId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
