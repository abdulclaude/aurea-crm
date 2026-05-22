"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Plus, Code2, Trash2 } from "lucide-react";
import { WidgetType } from "@/db/enums";

const WIDGET_LABELS: Record<WidgetType, string> = {
  SCHEDULE: "Class Schedule",
  BOOKING: "Booking Widget",
  MEMBERSHIP: "Membership Plans",
  INSTRUCTORS: "Instructor Gallery",
};

export default function WidgetsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.widgets.list.queryOptions());
  const createMutation = useMutation(trpc.widgets.create.mutationOptions());
  const deleteMutation = useMutation(trpc.widgets.delete.mutationOptions());

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<WidgetType>(WidgetType.SCHEDULE);

  const invalidate = () =>
    queryClient.invalidateQueries(trpc.widgets.list.queryOptions());

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await createMutation.mutateAsync({ name: newName.trim(), type: newType });
      setCreateOpen(false);
      setNewName("");
      invalidate();
      toast.success("Widget created");
    } catch {
      toast.error("Failed to create widget");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Embeddable Widgets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Embed your class schedule, booking form, or membership plans on any website.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Your widgets</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="size-4" />
              New widget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create widget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Widget name</Label>
                <Input
                  placeholder="e.g. Homepage Schedule"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Widget type</Label>
                <Select
                  value={newType}
                  onValueChange={(v) => setNewType(v as WidgetType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WIDGET_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newName.trim()}
              >
                {createMutation.isPending ? "Creating…" : "Create widget"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.widgets.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No widgets yet. Create one to get your embed code.
        </Card>
      ) : (
        <div className="space-y-3">
          {data.widgets.map((widget) => (
            <Card key={widget.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{widget.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {WIDGET_LABELS[widget.type]}
                    </Badge>
                    <Badge
                      variant={widget.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {widget.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    id: {widget.id}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => copy(`/embed/schedule?widget=${widget.id}`)}
                  >
                    <Code2 className="size-3" />
                    Copy URL
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await deleteMutation.mutateAsync({ id: widget.id });
                        invalidate();
                        toast.success("Widget deleted");
                      } catch {
                        toast.error("Failed to delete");
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">iFrame embed</p>
                <div className="relative">
                  <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                    {`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/schedule?widget=${widget.id}" width="100%" height="600" frameborder="0"></iframe>`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 size-6"
                    onClick={() =>
                      copy(
                        `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/schedule?widget=${widget.id}" width="100%" height="600" frameborder="0"></iframe>`
                      )
                    }
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3 pt-4 border-t border-white/5">
        <h2 className="text-sm font-semibold">How to embed</h2>
        <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Create a widget above and choose the type</li>
          <li>Copy the iframe embed code from your widget card</li>
          <li>Paste it into your website HTML where you want the widget to appear</li>
          <li>
            For WordPress, paste it into a Custom HTML block in the Gutenberg editor
          </li>
        </ol>
      </div>
    </div>
  );
}
