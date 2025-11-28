"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
    trpc.users.getProfile.queryOptions()
  );

  const [name, setName] = useState(profile?.name || "");
  const [profilePicture, setProfilePicture] = useState<string | null>(
    profile?.image || null
  );

  // Update local state when profile data is loaded
  useState(() => {
    if (profile) {
      setName(profile.name);
      setProfilePicture(profile.image);
    }
  });

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
        error instanceof Error ? error.message : "Failed to update profile"
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
    <div className="container mx-auto py-8 px-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information and preferences
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Profile Picture */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Profile Picture
            </Label>
            <ProfilePictureUploader
              value={profilePicture}
              onChange={(url) => setProfilePicture(url ?? null)}
              userName={name}
              disabled={updateProfile.isPending}
            />
          </div>

          <Separator />

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
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

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
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

          <Separator />

          {/* Appearance */}
          <div className="space-y-2">
            <Label htmlFor="theme" className="text-sm font-medium">
              Appearance
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

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="min-w-[120px]"
            >
              {updateProfile.isPending ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
