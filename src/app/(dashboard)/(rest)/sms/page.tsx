"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Settings } from "lucide-react";
import { format } from "date-fns";

export default function SmsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("messages");

  const { data: config } = useQuery(trpc.sms.getConfig.queryOptions());
  const { data: messages } = useQuery(trpc.sms.list.queryOptions({ limit: 50 }));

  const [sendTo, setSendTo] = useState("");
  const [sendBody, setSendBody] = useState("");

  const sendMutation = useMutation(
    trpc.sms.send.mutationOptions({
      onSuccess: () => {
        setSendTo("");
        setSendBody("");
        queryClient.invalidateQueries({ queryKey: trpc.sms.list.queryKey() });
      },
    }),
  );

  const tabs = [
    { id: "messages", label: "Messages" },
    { id: "send", label: "Send SMS" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="px-6 py-6">
        <h1 className="text-lg font-semibold text-primary">SMS</h1>
        <p className="text-xs text-primary/70">Send and manage text messages to your members.</p>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="px-6" />

      <Separator className="bg-black/5 dark:bg-white/5" />

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "messages" && (
          <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-[#202e32] p-1 shadow-xs">
            <div className="rounded-[calc(var(--radius-xl)-4px)] border border-black/[0.04] dark:border-white/[0.04]">
              {messages && messages.messages.length > 0 ? (
                <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {messages.messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3 px-4 py-3">
                      <MessageSquare className="mt-0.5 size-4 text-primary/40 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-primary">{msg.to}</span>
                          <Badge variant={msg.direction === "OUTBOUND" ? "default" : "secondary"} className="text-[10px]">
                            {msg.direction}
                          </Badge>
                          <Badge
                            variant={msg.status === "DELIVERED" ? "default" : msg.status === "FAILED" ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {msg.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-primary/60">{msg.body}</p>
                        <p className="mt-1 text-[10px] text-primary/40">
                          {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="mb-3 size-10 text-primary/20" />
                  <p className="text-sm text-primary/40">No messages yet</p>
                  <p className="text-xs text-primary/30">Send your first SMS to get started</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "send" && (
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-primary/75">Phone Number</Label>
              <Input
                placeholder="+1234567890"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                className="border-black/10 dark:border-white/5 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-primary/75">Message</Label>
              <Textarea
                placeholder="Type your message..."
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
                rows={4}
                className="border-black/10 dark:border-white/5 text-xs"
              />
              <p className="text-[10px] text-primary/40">{sendBody.length}/160 characters</p>
            </div>
            <Button
              onClick={() => sendMutation.mutate({ to: sendTo, body: sendBody })}
              disabled={!sendTo || !sendBody || sendMutation.isPending}
            >
              <Send className="mr-2 size-3.5" />
              {sendMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-md">
            {config ? (
              <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-[#202e32] p-1 shadow-xs">
                <div className="rounded-[calc(var(--radius-xl)-4px)] border border-black/[0.04] dark:border-white/[0.04] divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {[
                    { label: "Provider", value: <Badge>{config.provider}</Badge> },
                    { label: "From Number", value: <span className="font-mono text-xs">{config.fromNumber ?? "Not configured"}</span> },
                    { label: "Monthly Limit", value: <span className="text-xs">{config.monthlyLimit ?? "Unlimited"}</span> },
                    { label: "Status", value: <Badge variant={config.isActive ? "default" : "secondary"}>{config.isActive ? "Active" : "Inactive"}</Badge> },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-primary/70">{label}</span>
                      {value}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="mb-3 size-10 text-primary/20" />
                <p className="text-sm text-primary/40">SMS not configured yet</p>
                <p className="text-xs text-primary/30">Set up your Twilio credentials to get started</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
