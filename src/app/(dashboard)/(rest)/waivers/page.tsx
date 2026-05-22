"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FileText, Plus, Shield, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function WaiversPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  const [showCreate, setShowCreate] = useState(false);

  const { data: templates } = useQuery(trpc.waivers.listTemplates.queryOptions());

  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newRequired, setNewRequired] = useState(true);

  const createMutation = useMutation(
    trpc.waivers.createTemplate.mutationOptions({
      onSuccess: () => {
        setNewName("");
        setNewContent("");
        setShowCreate(false);
        queryClient.invalidateQueries({ queryKey: trpc.waivers.listTemplates.queryKey() });
      },
    }),
  );

  const tabs = [
    { id: "templates", label: "Waiver Templates" },
    { id: "signatures", label: "Recent Signatures" },
  ];

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Waivers</h1>
          <p className="text-sm text-muted-foreground">Manage digital waivers and liability forms</p>
        </div>
        <Button size="sm" onClick={() => { setShowCreate(true); setActiveTab("templates"); }}>
          <Plus className="mr-2 size-4" />
          New Waiver
        </Button>
      </div>
      <Separator />
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "templates" && (
        <div className="space-y-4">
          {showCreate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create Waiver Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g. Liability Waiver"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Enter the waiver text..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={8}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newRequired} onCheckedChange={setNewRequired} />
                  <Label>Required for all new members</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => createMutation.mutate({ name: newName, content: newContent, isRequired: newRequired })}
                    disabled={!newName || !newContent || createMutation.isPending}
                  >
                    Create Template
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {templates && templates.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <div className="flex gap-1.5">
                        {template.isRequired && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                        <Badge variant={template.isActive ? "default" : "secondary"} className="text-xs">
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>Version {template.version}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{template.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Created {format(new Date(template.createdAt), "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">No waiver templates yet</p>
                <p className="text-sm text-muted-foreground">Create your first waiver template to collect digital signatures</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "signatures" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">View signatures per client</p>
            <p className="text-sm text-muted-foreground">
              Open a member's profile to view their signed waivers
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
