import { Users } from "lucide-react";
import Link from "next/link";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SavedAudienceRow } from "@/features/audiences/types";
import type { CampaignSegmentTypeValue } from "@/features/campaigns/lib/campaign-audience-contracts";

const ALL_CLIENTS_VALUE = "__all_clients__";
const LEGACY_AUDIENCE_VALUE = "__legacy_audience__";

export function CampaignAudienceSelector({
  audiences,
  recipientCount,
  savedAudienceId,
  segmentType,
  onChange,
}: {
  audiences: SavedAudienceRow[];
  recipientCount: number;
  savedAudienceId: string | null;
  segmentType: CampaignSegmentTypeValue;
  onChange: (savedAudienceId: string | null) => void;
}): JSX.Element {
  const value = savedAudienceId
    ? savedAudienceId
    : segmentType === "ALL"
      ? ALL_CLIENTS_VALUE
      : LEGACY_AUDIENCE_VALUE;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Target audience</CardTitle>
            <CardDescription>
              Use the same saved segments across CRM and campaigns.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/clients?view=audiences">Manage audiences</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="savedAudienceId">Audience</Label>
          <Select
            value={value}
            onValueChange={(nextValue) => {
              if (nextValue === ALL_CLIENTS_VALUE) {
                onChange(null);
                return;
              }
              if (audiences.some((audience) => audience.id === nextValue)) {
                onChange(nextValue);
              }
            }}
          >
            <SelectTrigger id="savedAudienceId">
              <SelectValue placeholder="Select audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLIENTS_VALUE}>
                All members with email
              </SelectItem>
              {segmentType !== "ALL" && !savedAudienceId ? (
                <SelectItem value={LEGACY_AUDIENCE_VALUE} disabled>
                  Legacy campaign audience
                </SelectItem>
              ) : null}
              {audiences.map((audience) => (
                <SelectItem key={audience.id} value={audience.id}>
                  {audience.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
          <Users className="size-4 text-muted-foreground" />
          <p className="text-sm">
            <span className="font-medium">
              {recipientCount.toLocaleString()}
            </span>{" "}
            emailable member{recipientCount !== 1 ? "s" : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
