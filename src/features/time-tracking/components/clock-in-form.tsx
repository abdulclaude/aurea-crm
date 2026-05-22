"use client";

import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckInMethod } from "@/db/enums";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { IconCalendarClock as ClockIcon } from "central-icons/IconCalendarClock";
import { IconQrCode } from "central-icons/IconQrCode";

const clockInSchema = z.object({
  instructorId: z.string().min(1, "Instructor is required"),
  clientId: z.string().optional(),
  dealId: z.string().optional(),
  title: z.string().optional(),
  checkInMethod: z.nativeEnum(CheckInMethod),
  qrCodeId: z.string().optional(),
});

type ClockInFormData = z.infer<typeof clockInSchema>;

export function ClockInForm() {
  const router = useRouter();
  const trpc = useTRPC();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"manual" | "qr">("manual");

  // Get instructors
  const { data: instructorsData } = useSuspenseQuery(
    trpc.instructors.list.queryOptions({ pageSize: 100 }),
  );

  // Get clients
  const { data: clientsData } = useSuspenseQuery(
    trpc.clients.list.queryOptions({ limit: 100 }),
  );

  // Get deals (jobs)
  const { data: dealsData } = useSuspenseQuery(
    trpc.deals.list.queryOptions({ limit: 100 }),
  );

  // Get QR codes
  const { data: qrCodes = [] } = useSuspenseQuery(
    trpc.timeTracking.listQRCodes.queryOptions(),
  );

  const form = useForm<ClockInFormData>({
    resolver: zodResolver(clockInSchema),
    defaultValues: {
      checkInMethod: CheckInMethod.MANUAL,
    },
  });

  const clockInMutation = useMutation(
    trpc.timeTracking.clockIn.mutationOptions({
      onSuccess: () => {
        toast.success("Clocked in successfully!");
        router.push("/time-logs");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), "h:mm:ss a"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onSubmit = (data: ClockInFormData) => {
    clockInMutation.mutate(data);
  };

  // Clock in form
  return (
    <div className="p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Clock in</CardTitle>
          <CardDescription>
            Current time: <span className="font-mono">{currentTime}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "manual" | "qr")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">
                <ClockIcon className="mr-2 h-4 w-4" />
                Manual clock in
              </TabsTrigger>
              <TabsTrigger value="qr">
                <IconQrCode className="mr-2 h-4 w-4" />
                QR Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <input
                    type="hidden"
                    {...form.register("checkInMethod")}
                    value={CheckInMethod.MANUAL}
                  />

                  <FormField
                    control={form.control}
                    name="instructorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructor</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a instructor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {instructorsData.items.map((instructor) => (
                              <SelectItem key={instructor.id} value={instructor.id}>
                                {instructor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clientsData?.items.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dealId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job/Deal (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a job" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dealsData?.items.map((deal) => (
                              <SelectItem key={deal.id} value={deal.id}>
                                {deal.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Morning Shift" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={clockInMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {clockInMutation.isPending ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Clocking in...
                      </>
                    ) : (
                      "Clock in"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="qr" className="mt-6">
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="instructorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructor</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a instructor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {instructorsData.items.map((instructor) => (
                              <SelectItem key={instructor.id} value={instructor.id}>
                                {instructor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <p className="text-sm text-primary/60">
                    Select a QR code location to clock in:
                  </p>

                  {qrCodes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-primary/60">
                        No QR codes available.
                      </p>
                      <p className="text-xs text-primary/40 mt-1">
                        Client your administrator to set up QR codes.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {qrCodes.map((qr) => (
                        <Card
                          key={qr.id}
                          className="cursor-pointer hover:bg-primary-foreground/50 transition-colors"
                          onClick={() => {
                            if (!form.getValues("instructorId")) {
                              toast.error("Please select a instructor first");
                              return;
                            }
                            form.setValue("qrCodeId", qr.id);
                            form.setValue("checkInMethod", CheckInMethod.QR_CODE);
                            form.handleSubmit(onSubmit)();
                          }}
                        >
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{qr.name}</p>
                              {!qr.enabled && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            <IconQrCode className="h-6 w-6 text-primary/40" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
