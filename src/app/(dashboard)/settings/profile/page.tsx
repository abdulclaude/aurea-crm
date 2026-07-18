"use client";

import { useEffect, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { ProfilePictureUploader } from "@/features/users/components/profile-picture-uploader";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProfileSettingsPage() {
  const trpc = useTRPC();
  const { theme, setTheme } = useTheme();

  const { data: profile, isLoading, refetch } = useQuery(
    trpc.users.getProfile.queryOptions(),
  );

  const [name, setName] = useState(profile?.name || "");
  const [profilePicture, setProfilePicture] = useState<string | null>(
    profile?.image || null,
  );

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setProfilePicture(profile.image);
    }
  }, [profile]);

  const updateProfile = useMutation(trpc.users.updateProfile.mutationOptions());

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        name,
        image: profilePicture,
      });
      toast.success("Profile updated successfully");
      refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div>
      <div className="p-6">
        <div className="flex flex-col justify-center gap-2">
          <Badge variant="secondary" className="w-max rounded-full p-1 px-2.5">
            Account
          </Badge>
          <h1 className="text-lg font-bold">Profile Settings</h1>
        </div>
        <p className="text-muted-foreground text-xs">
          Manage your personal information and preferences
        </p>
      </div>

      <Separator className="bg-black/10 dark:bg-white/5" />

      <div>
        <div className="p-6">
          <h2 className="text-sm font-medium mb-4">Profile Picture</h2>
          <ProfilePictureUploader
            value={profilePicture}
            onChange={(url) => setProfilePicture(url ?? null)}
            userName={name}
            disabled={updateProfile.isPending}
          />
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        <div className="p-6">
          <h2 className="text-sm font-medium mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 gap-4 max-w-2xl md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={updateProfile.isPending}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        <div className="p-6">
          <h2 className="text-sm font-medium mb-4">Appearance</h2>
          <div className="space-y-2 max-w-md">
            <Label htmlFor="theme" className="text-xs font-medium">
              Theme
            </Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose how Aurea CRM looks to you
            </p>
          </div>
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        <div className="flex justify-end p-6">
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="min-w-[120px] w-max"
            variant="gradient"
          >
            {updateProfile.isPending ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
