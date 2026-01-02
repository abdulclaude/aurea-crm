"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useDiscordGuilds,
  useDiscordChannels,
  useSlackChannels,
  useUpdateDiscordMetadata,
  useUpdateSlackMetadata,
} from "../hooks/use-apps";
import type { AppProvider } from "@prisma/client";

type SupportedAppProvider = Extract<AppProvider, "DISCORD" | "SLACK">;

type AppChannelSetupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: SupportedAppProvider;
  onSuccess?: () => void;
};

export const AppChannelSetupDialog = ({
  open,
  onOpenChange,
  provider,
  onSuccess,
}: AppChannelSetupDialogProps) => {
  const [selectedGuildId, setSelectedGuildId] = useState<string>("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  const isDiscord = provider === "DISCORD";

  // Discord queries - only fetch when Discord is selected
  const { data: discordGuilds, isLoading: isLoadingGuilds } =
    useDiscordGuilds(isDiscord && open);
  const { data: discordChannels, isLoading: isLoadingDiscordChannels } =
    useDiscordChannels(isDiscord && selectedGuildId ? selectedGuildId : null);

  // Slack queries - only fetch when Slack is selected
  const { data: slackChannels, isLoading: isLoadingSlackChannels } =
    useSlackChannels(!isDiscord && open);

  // Mutations
  const { mutate: updateDiscordMetadata, isPending: isUpdatingDiscord } =
    useUpdateDiscordMetadata();
  const { mutate: updateSlackMetadata, isPending: isUpdatingSlack } =
    useUpdateSlackMetadata();

  const isLoading = isDiscord
    ? isLoadingGuilds || isLoadingDiscordChannels
    : isLoadingSlackChannels;
  const isUpdating = isDiscord ? isUpdatingDiscord : isUpdatingSlack;

  const handleSave = () => {
    if (isDiscord) {
      if (!selectedGuildId || !selectedChannelId) {
        toast.error("Please select both a server and channel");
        return;
      }

      updateDiscordMetadata(
        {
          guildId: selectedGuildId,
          channelId: selectedChannelId,
        },
        {
          onSuccess: () => {
            toast.success("Discord server and channel configured");
            onOpenChange(false);
            onSuccess?.();
          },
          onError: () => {
            toast.error("Failed to save Discord configuration");
          },
        }
      );
    } else {
      if (!selectedChannelId) {
        toast.error("Please select a channel");
        return;
      }

      updateSlackMetadata(
        {
          channelId: selectedChannelId,
        },
        {
          onSuccess: () => {
            toast.success("Slack channel configured");
            onOpenChange(false);
            onSuccess?.();
          },
          onError: () => {
            toast.error("Failed to save Slack configuration");
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isDiscord ? "Configure Discord" : "Configure Slack"}
          </DialogTitle>
          <DialogDescription>
            {isDiscord
              ? "Select the default Discord server and channel for your workflows"
              : "Select the default Slack channel for your workflows"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {isDiscord && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="guild">Server</Label>
              <Select
                value={selectedGuildId}
                onValueChange={(value) => {
                  setSelectedGuildId(value);
                  setSelectedChannelId(""); // Reset channel when server changes
                }}
                disabled={isLoadingGuilds}
              >
                <SelectTrigger id="guild">
                  <SelectValue
                    placeholder={
                      isLoadingGuilds
                        ? "Loading servers..."
                        : "Select a server"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {discordGuilds?.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id}>
                      {guild.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="channel">Channel</Label>
            <Select
              value={selectedChannelId}
              onValueChange={setSelectedChannelId}
              disabled={isLoading || (isDiscord && !selectedGuildId)}
            >
              <SelectTrigger id="channel">
                <SelectValue
                  placeholder={
                    isLoading
                      ? "Loading channels..."
                      : isDiscord && !selectedGuildId
                        ? "Select a server first"
                        : "Select a channel"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {isDiscord
                  ? discordChannels?.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        # {channel.name}
                      </SelectItem>
                    ))
                  : (slackChannels as Array<{ id: string; name: string; isPrivate: boolean }> | undefined)?.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.isPrivate ? "🔒" : "#"} {channel.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || isLoading}>
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
