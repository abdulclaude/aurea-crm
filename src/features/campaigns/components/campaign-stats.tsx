"use client";

import { ArrowLeft, Send, Users, Eye, MousePointer, AlertTriangle, Ban } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CampaignStatsProps {
  campaign: {
    id: string;
    name: string;
    subject: string;
    status: string;
    sentAt: Date | null;
    totalRecipients: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
    emailDomain?: {
      domain: string;
    } | null;
  };
}

export function CampaignStats({ campaign }: CampaignStatsProps) {
  const openRate =
    campaign.delivered > 0
      ? ((campaign.opened / campaign.delivered) * 100).toFixed(1)
      : "0.0";
  const clickRate =
    campaign.opened > 0
      ? ((campaign.clicked / campaign.opened) * 100).toFixed(1)
      : "0.0";
  const bounceRate =
    campaign.totalRecipients > 0
      ? ((campaign.bounced / campaign.totalRecipients) * 100).toFixed(1)
      : "0.0";

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
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{campaign.name}</h1>
              <Badge variant="default">Sent</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{campaign.subject}</p>
          </div>
        </div>
      </div>

      {/* Sent info */}
      {campaign.sentAt && (
        <p className="text-sm text-muted-foreground">
          Sent on {format(new Date(campaign.sentAt), "MMMM d, yyyy 'at' h:mm a")}
          {campaign.emailDomain && ` via ${campaign.emailDomain.domain}`}
        </p>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.totalRecipients.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {campaign.delivered.toLocaleString()} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <p className="text-xs text-muted-foreground">
              {campaign.opened.toLocaleString()} opens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate}%</div>
            <p className="text-xs text-muted-foreground">
              {campaign.clicked.toLocaleString()} clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bounceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {campaign.bounced.toLocaleString()} bounced
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics</CardTitle>
          <CardDescription>
            Full breakdown of campaign performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-muted-foreground" />
                <span>Total Recipients</span>
              </div>
              <span className="font-medium">{campaign.totalRecipients.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-green-500" />
                <span>Delivered</span>
              </div>
              <span className="font-medium">{campaign.delivered.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span>Unique Opens</span>
              </div>
              <span className="font-medium">{campaign.opened.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-purple-500" />
                <span>Unique Clicks</span>
              </div>
              <span className="font-medium">{campaign.clicked.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>Bounced</span>
              </div>
              <span className="font-medium">{campaign.bounced.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Complained (Spam)</span>
              </div>
              <span className="font-medium">{campaign.complained.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-orange-500" />
                <span>Unsubscribed</span>
              </div>
              <span className="font-medium">{campaign.unsubscribed.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
