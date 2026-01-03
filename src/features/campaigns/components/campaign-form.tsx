"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Send,
  Save,
  Calendar,
  ArrowLeft,
  Users,
  Type,
  Settings2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { nanoid } from "nanoid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import type { EmailContent, EmailSection, TextSection, ButtonSection, ImageSection, DividerSection } from "../types";

const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject line is required"),
  preheaderText: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().optional(),
  replyTo: z.string().email("Invalid email").optional().or(z.literal("")),
  emailDomainId: z.string().optional(),
  resendTemplateId: z.string().optional(),
  segmentType: z.enum(["ALL", "BY_TYPE", "BY_TAGS", "BY_LIFECYCLE", "BY_COUNTRY", "CUSTOM"]),
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  campaignId?: string;
  initialData?: {
    name: string;
    subject: string;
    preheaderText?: string | null;
    fromName?: string | null;
    fromEmail?: string | null;
    replyTo?: string | null;
    emailDomainId?: string | null;
    resendTemplateId?: string | null;
    segmentType: string;
    segmentFilter?: unknown;
    content?: unknown;
    status: string;
  };
}

// Helper to create sections with IDs
function createTextSection(content: string): TextSection {
  return { type: "text", id: nanoid(), content };
}

function createButtonSection(text: string, url: string): ButtonSection {
  return { type: "button", id: nanoid(), text, url, align: "center" };
}

function createImageSection(src: string, alt: string): ImageSection {
  return { type: "image", id: nanoid(), src, alt };
}

function createDividerSection(): DividerSection {
  return { type: "divider", id: nanoid() };
}

export function CampaignForm({ campaignId, initialData }: CampaignFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const isEditing = !!campaignId;
  const isDraft = !initialData || initialData.status === "DRAFT";

  // Fetch email domains
  const { data: domains } = useSuspenseQuery(
    trpc.emailDomains.list.queryOptions()
  );
  const verifiedDomains = domains?.filter((d) => d.status === "VERIFIED") ?? [];

  const { data: resendTemplates } = useSuspenseQuery(
    trpc.emailTemplates.listResend.queryOptions({ limit: 100 })
  );

  // Email content state
  const [content, setContent] = useState<EmailContent>(
    (initialData?.content as EmailContent) || {
      subject: initialData?.subject || "",
      preheader: initialData?.preheaderText || "",
      sections: [
        createTextSection("Hello {{contact.firstName}},\n\nStart writing your email here..."),
      ],
    }
  );

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      subject: initialData?.subject || "",
      preheaderText: initialData?.preheaderText || "",
      fromName: initialData?.fromName || "",
      fromEmail: initialData?.fromEmail || "",
      replyTo: initialData?.replyTo || "",
      emailDomainId: initialData?.emailDomainId || "",
      resendTemplateId: initialData?.resendTemplateId || "",
      segmentType: (initialData?.segmentType as CampaignFormData["segmentType"]) || "ALL",
    },
  });

  // Get recipient count
  const { data: recipientData } = useSuspenseQuery(
    trpc.campaigns.getRecipientCount.queryOptions({
      segmentType: form.watch("segmentType"),
      segmentFilter: undefined,
    })
  );
  const recipientCount = recipientData?.count ?? 0;

  const createMutation = useMutation(
    trpc.campaigns.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Campaign created");
        queryClient.invalidateQueries({ queryKey: trpc.campaigns.list.queryKey() });
        router.push(`/campaigns/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create campaign");
      },
    })
  );

  const updateMutation = useMutation(
    trpc.campaigns.update.mutationOptions({
      onSuccess: () => {
        toast.success("Campaign saved");
        queryClient.invalidateQueries({ queryKey: trpc.campaigns.list.queryKey() });
        if (campaignId) {
          queryClient.invalidateQueries({
            queryKey: trpc.campaigns.get.queryKey({ id: campaignId }),
          });
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save campaign");
      },
    })
  );

  const sendMutation = useMutation(
    trpc.campaigns.send.mutationOptions({
      onSuccess: () => {
        toast.success("Campaign queued for sending!");
        queryClient.invalidateQueries({ queryKey: trpc.campaigns.list.queryKey() });
        router.push("/campaigns");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send campaign");
      },
    })
  );

  const scheduleMutation = useMutation(
    trpc.campaigns.schedule.mutationOptions({
      onSuccess: () => {
        toast.success("Campaign scheduled");
        setScheduleOpen(false);
        queryClient.invalidateQueries({ queryKey: trpc.campaigns.list.queryKey() });
        router.push("/campaigns");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to schedule campaign");
      },
    })
  );

  const onSubmit = async (data: CampaignFormData) => {
    const payload = {
      ...data,
      content: {
        subject: data.subject,
        preheader: data.preheaderText,
        sections: content.sections,
      },
      replyTo: data.replyTo || undefined,
      emailDomainId: data.emailDomainId || undefined,
      resendTemplateId: data.resendTemplateId || undefined,
    };

    if (isEditing && campaignId) {
      updateMutation.mutate({ id: campaignId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSendNow = async () => {
    if (!campaignId) return;

    // First save the campaign
    const data = form.getValues();
    await updateMutation.mutateAsync({
      id: campaignId,
      ...data,
      content: {
        subject: data.subject,
        preheader: data.preheaderText,
        sections: content.sections,
      },
      replyTo: data.replyTo || undefined,
      emailDomainId: data.emailDomainId || undefined,
      resendTemplateId: data.resendTemplateId || undefined,
    });

    // Then send
    sendMutation.mutate({ id: campaignId });
  };

  const handleSchedule = async () => {
    if (!campaignId || !scheduledDate || !scheduledTime) return;

    // First save the campaign
    const data = form.getValues();
    await updateMutation.mutateAsync({
      id: campaignId,
      ...data,
      content: {
        subject: data.subject,
        preheader: data.preheaderText,
        sections: content.sections,
      },
      replyTo: data.replyTo || undefined,
      emailDomainId: data.emailDomainId || undefined,
      resendTemplateId: data.resendTemplateId || undefined,
    });

    // Then schedule
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    scheduleMutation.mutate({ id: campaignId, scheduledAt: scheduledAt.toISOString() });
  };

  const addSection = (type: EmailSection["type"]) => {
    let newSection: EmailSection;
    
    switch (type) {
      case "text":
        newSection = createTextSection("");
        break;
      case "button":
        newSection = createButtonSection("Click Here", "https://");
        break;
      case "image":
        newSection = createImageSection("", "");
        break;
      case "divider":
        newSection = createDividerSection();
        break;
      default:
        return;
    }

    setContent((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const updateSection = (index: number, updates: Partial<EmailSection>) => {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === index ? { ...s, ...updates } as EmailSection : s
      ),
    }));
  };

  const removeSection = (index: number) => {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {isEditing ? "Edit Campaign" : "New Campaign"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {recipientCount.toLocaleString()} recipient{recipientCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>

          {isEditing && isDraft && (
            <>
              <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Campaign</DialogTitle>
                    <DialogDescription>
                      Choose when to send this campaign.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="schedule-date">Date</Label>
                      <Input
                        id="schedule-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="schedule-time">Time</Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSchedule}
                      disabled={!scheduledDate || !scheduledTime || scheduleMutation.isPending}
                    >
                      {scheduleMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Calendar className="h-4 w-4 mr-2" />
                      )}
                      Schedule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleSendNow}
                disabled={sendMutation.isPending || recipientCount === 0}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Now
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList>
            <TabsTrigger value="content" className="gap-2">
              <Type className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="audience" className="gap-2">
              <Users className="h-4 w-4" />
              Audience
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>
                  Set the basic information for your campaign.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Campaign Name (internal)</Label>
                  <Input
                    id="name"
                    placeholder="e.g., January Newsletter"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Check out our latest updates!"
                    {...form.register("subject")}
                  />
                  {form.formState.errors.subject && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.subject.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use {"{{contact.firstName}}"} or {"{{contact.name}}"} for personalization
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="preheaderText">Preview Text (optional)</Label>
                  <Input
                    id="preheaderText"
                    placeholder="This text appears next to your subject line"
                    {...form.register("preheaderText")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="resendTemplateId">Resend Template (optional)</Label>
                  <Select
                    value={form.watch("resendTemplateId") || "none"}
                    onValueChange={(value) =>
                      form.setValue(
                        "resendTemplateId",
                        value === "none" ? "" : value
                      )
                    }
                  >
                    <SelectTrigger id="resendTemplateId">
                      <SelectValue placeholder="Choose a Resend template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {resendTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    If selected, the Resend template is used when sending and
                    the content builder is ignored.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
                <CardDescription>
                  Build your email using sections.
                  {form.watch("resendTemplateId") && (
                    <span className="block text-xs text-muted-foreground">
                      This content won’t be used while a Resend template is selected.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {content.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="border border-white/10 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="capitalize">
                        {section.type}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSection(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>

                    {section.type === "text" && (
                      <Textarea
                        value={section.content}
                        onChange={(e) =>
                          updateSection(index, { content: e.target.value })
                        }
                        placeholder="Write your content here..."
                        rows={4}
                      />
                    )}

                    {section.type === "button" && (
                      <div className="grid gap-3">
                        <Input
                          value={section.text}
                          onChange={(e) =>
                            updateSection(index, { text: e.target.value })
                          }
                          placeholder="Button text"
                        />
                        <Input
                          value={section.url}
                          onChange={(e) =>
                            updateSection(index, { url: e.target.value })
                          }
                          placeholder="Button URL"
                        />
                      </div>
                    )}

                    {section.type === "image" && (
                      <div className="grid gap-3">
                        <Input
                          value={section.src}
                          onChange={(e) =>
                            updateSection(index, { src: e.target.value })
                          }
                          placeholder="Image URL"
                        />
                        <Input
                          value={section.alt || ""}
                          onChange={(e) =>
                            updateSection(index, { alt: e.target.value })
                          }
                          placeholder="Alt text"
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection("text")}
                  >
                    + Text
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection("button")}
                  >
                    + Button
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection("image")}
                  >
                    + Image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection("divider")}
                  >
                    + Divider
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audience Tab */}
          <TabsContent value="audience" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target Audience</CardTitle>
                <CardDescription>
                  Choose who should receive this campaign.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="segmentType">Audience</Label>
                  <Select
                    value={form.watch("segmentType")}
                    onValueChange={(value) =>
                      form.setValue("segmentType", value as CampaignFormData["segmentType"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All contacts with email</SelectItem>
                      <SelectItem value="BY_TYPE">By contact type</SelectItem>
                      <SelectItem value="BY_LIFECYCLE">By lifecycle stage</SelectItem>
                      <SelectItem value="BY_TAGS">By tags</SelectItem>
                      <SelectItem value="BY_COUNTRY">By country</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">{recipientCount.toLocaleString()}</span>{" "}
                    contact{recipientCount !== 1 ? "s" : ""} will receive this campaign
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sender Settings</CardTitle>
                <CardDescription>
                  Configure how the email will appear to recipients.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="emailDomainId">Sending Domain</Label>
                  <Select
                    value={form.watch("emailDomainId") || ""}
                    onValueChange={(value) => form.setValue("emailDomainId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {verifiedDomains.length === 0 ? (
                        <SelectItem value="" disabled>
                          No verified domains
                        </SelectItem>
                      ) : (
                        verifiedDomains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.id}>
                            {domain.domain}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {verifiedDomains.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      <Link href="/campaigns/domains" className="text-primary hover:underline">
                        Add a verified domain
                      </Link>{" "}
                      to send emails.
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    placeholder="e.g., Your Company"
                    {...form.register("fromName")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fromEmail">From Email (prefix)</Label>
                  <Input
                    id="fromEmail"
                    placeholder="e.g., hello"
                    {...form.register("fromEmail")}
                  />
                  <p className="text-xs text-muted-foreground">
                    The full address will be prefix@your-domain.com
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="replyTo">Reply-To Email (optional)</Label>
                  <Input
                    id="replyTo"
                    type="email"
                    placeholder="e.g., support@example.com"
                    {...form.register("replyTo")}
                  />
                  {form.formState.errors.replyTo && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.replyTo.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
