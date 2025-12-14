"use client";

import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Trash2, BarChart3, X } from "lucide-react";
import { getBlockDefinition } from "../../../lib/block-registry";
import { activePageIdAtom } from "../../../lib/editor-store";
import { STANDARD_EVENTS } from "../../../lib/tracking-scripts";
import type { FunnelBlock, FunnelBreakpoint } from "@prisma/client";
import type { BlockProps } from "../../../types";
import { toast } from "sonner";

interface PropertiesPanelProps {
  block: FunnelBlock & { breakpoints: FunnelBreakpoint[] };
}

export function PropertiesPanel({ block }: PropertiesPanelProps) {
  const [activePageId] = useAtom(activePageIdAtom);
  const [props, setProps] = useState<BlockProps>(
    (block.props as BlockProps) || {}
  );
  const [showTrackingConfig, setShowTrackingConfig] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<string>("Lead");
  const [customEventName, setCustomEventName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const definition = getBlockDefinition(block.type);

  // Fetch existing tracking event
  const { data: blockEvent } = useQuery({
    ...trpc.funnelIntegrations.getBlockEvent.queryOptions({
      blockId: block.id,
    }),
  });

  const { mutate: updateBlockMutation, isPending: isUpdating } = useMutation(
    trpc.funnels.updateBlock.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
      onError: (error) => {
        toast.error("Failed to update block", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: deleteBlockMutation, isPending: isDeleting } = useMutation(
    trpc.funnels.deleteBlock.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Block deleted", {
          description: "The block has been removed.",
        });
      },
      onError: (error) => {
        toast.error("Failed to delete block", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: setBlockEvent, isPending: isSavingEvent } = useMutation(
    trpc.funnelIntegrations.setBlockEvent.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Tracking event saved", {
          description: "This block will now fire tracking events.",
        });
        setShowTrackingConfig(false);
      },
      onError: (error) => {
        toast.error("Failed to save event", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: deleteBlockEvent, isPending: isDeletingEvent } = useMutation(
    trpc.funnelIntegrations.deleteBlockEvent.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Tracking event removed");
      },
      onError: (error) => {
        toast.error("Failed to remove event", {
          description: error.message,
        });
      },
    })
  );

  // Sync local state with block props
  useEffect(() => {
    setProps((block.props as BlockProps) || {});
  }, [block.id, block.props]);

  const handlePropChange = (key: string, value: unknown) => {
    const newProps: BlockProps = { ...props, [key]: value as string | number | boolean };
    setProps(newProps);

    // Debounced update to API
    updateBlockMutation({
      blockId: block.id,
      props: newProps,
    });
  };

  const handleDelete = () => {
    deleteBlockMutation({ blockId: block.id });
    setShowDeleteDialog(false);
  };

  const handleSaveTrackingEvent = () => {
    const eventType = selectedEventType;
    const eventName = eventType === "CustomEvent" ? customEventName : undefined;

    if (eventType === "CustomEvent" && !customEventName.trim()) {
      toast.error("Please enter a custom event name");
      return;
    }

    setBlockEvent({
      blockId: block.id,
      eventType,
      eventName,
    });
  };

  const handleRemoveTrackingEvent = () => {
    deleteBlockEvent({ blockId: block.id });
  };

  const propertySchema = definition?.propertySchema || [];

  // Determine if this block type supports tracking (BUTTON, FORM mainly)
  const supportsTracking = ["BUTTON", "FORM"].includes(block.type);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">{definition?.label || block.type}</h3>
        <p className="text-xs text-muted-foreground">Block Properties</p>
      </div>

      <Separator />

      {propertySchema.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          No configurable properties for this block
        </div>
      ) : (
        <div className="space-y-4">
          {propertySchema.map((schema) => (
            <div key={schema.key} className="space-y-2">
              <Label htmlFor={schema.key} className="text-xs">
                {schema.label}
              </Label>

              {schema.type === "text" && (
                <Input
                  id={schema.key}
                  type="text"
                  value={(props[schema.key] as string) || ""}
                  onChange={(e) => handlePropChange(schema.key, e.target.value)}
                  placeholder={schema.placeholder}
                />
              )}

              {schema.type === "textarea" && (
                <Textarea
                  id={schema.key}
                  value={(props[schema.key] as string) || ""}
                  onChange={(e) => handlePropChange(schema.key, e.target.value)}
                  placeholder={schema.placeholder}
                  rows={4}
                />
              )}

              {schema.type === "number" && (
                <Input
                  id={schema.key}
                  type="number"
                  value={
                    typeof props[schema.key] === "number"
                      ? String(props[schema.key])
                      : String(schema.defaultValue || 0)
                  }
                  onChange={(e) =>
                    handlePropChange(schema.key, Number(e.target.value))
                  }
                  min={schema.min}
                  max={schema.max}
                  step={schema.step || 1}
                />
              )}

              {schema.type === "url" && (
                <Input
                  id={schema.key}
                  type="url"
                  value={(props[schema.key] as string) || ""}
                  onChange={(e) => handlePropChange(schema.key, e.target.value)}
                  placeholder={schema.placeholder || "https://..."}
                />
              )}

              {schema.type === "color" && (
                <div className="flex gap-2">
                  <Input
                    id={schema.key}
                    type="color"
                    value={(props[schema.key] as string) || "#000000"}
                    onChange={(e) => handlePropChange(schema.key, e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={(props[schema.key] as string) || "#000000"}
                    onChange={(e) => handlePropChange(schema.key, e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              )}

              {schema.type === "select" && schema.options && (
                <Select
                  value={String(props[schema.key] || schema.defaultValue || "")}
                  onValueChange={(value) => handlePropChange(schema.key, value)}
                >
                  <SelectTrigger id={schema.key}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schema.options.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {schema.type === "checkbox" && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={schema.key}
                    checked={(props[schema.key] as boolean) || false}
                    onCheckedChange={(checked) =>
                      handlePropChange(schema.key, checked)
                    }
                  />
                  <Label htmlFor={schema.key} className="text-sm font-normal cursor-pointer">
                    {schema.label}
                  </Label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="visible"
            checked={block.visible}
            onCheckedChange={(checked) =>
              updateBlockMutation({
                blockId: block.id,
                visible: checked as boolean,
              })
            }
          />
          <Label htmlFor="visible" className="text-xs cursor-pointer">
            Visible
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="locked"
            checked={block.locked}
            onCheckedChange={(checked) =>
              updateBlockMutation({
                blockId: block.id,
                locked: checked as boolean,
              })
            }
          />
          <Label htmlFor="locked" className="text-xs cursor-pointer">
            Locked
          </Label>
        </div>
      </div>

      {supportsTracking && (
        <>
          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-xs font-medium">Tracking Event</h4>
              </div>
              {blockEvent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={handleRemoveTrackingEvent}
                  disabled={isDeletingEvent}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {blockEvent ? (
              <div className="bg-muted/50 p-3 rounded-md space-y-1">
                <p className="text-xs font-medium">
                  {blockEvent.eventType === "CustomEvent"
                    ? blockEvent.eventName
                    : blockEvent.eventType}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fires when this {block.type.toLowerCase()} is clicked/submitted
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setShowTrackingConfig(true)}
                >
                  Edit event
                </Button>
              </div>
            ) : showTrackingConfig ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Event Type</Label>
                  <Select
                    value={selectedEventType}
                    onValueChange={setSelectedEventType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={STANDARD_EVENTS.LEAD}>Lead</SelectItem>
                      <SelectItem value={STANDARD_EVENTS.VIEW_CONTENT}>
                        View Content
                      </SelectItem>
                      <SelectItem value={STANDARD_EVENTS.SUBMIT_FORM}>
                        Submit Form
                      </SelectItem>
                      <SelectItem value={STANDARD_EVENTS.ADD_TO_CART}>
                        Add to Cart
                      </SelectItem>
                      <SelectItem value={STANDARD_EVENTS.BOOK_CALL}>
                        Book Call
                      </SelectItem>
                      <SelectItem value={STANDARD_EVENTS.PURCHASE}>
                        Purchase
                      </SelectItem>
                      <SelectItem value={STANDARD_EVENTS.CUSTOM}>
                        Custom Event
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedEventType === "CustomEvent" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Custom Event Name</Label>
                    <Input
                      placeholder="e.g., BookingRequested"
                      value={customEventName}
                      onChange={(e) => setCustomEventName(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleSaveTrackingEvent}
                    disabled={isSavingEvent}
                  >
                    {isSavingEvent ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowTrackingConfig(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowTrackingConfig(true)}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Add Tracking Event
              </Button>
            )}
          </div>
        </>
      )}

      <Separator />

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => setShowDeleteDialog(true)}
        disabled={isDeleting}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {isDeleting ? "Deleting..." : "Delete Block"}
      </Button>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Block</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this block? This action cannot be undone.
              {definition?.canHaveChildren && " All child blocks will also be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
