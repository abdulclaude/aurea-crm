"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IconCreditCard2 as CreditCardIcon } from "central-icons/IconCreditCard2";
import { IconSquareArrowTopRight as ExternalLinkIcon } from "central-icons/IconSquareArrowTopRight";
import { IconCircleCheck as CheckCircleIcon } from "central-icons/IconCircleCheck";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function BillingSettingsPage() {
  const trpc = useTRPC();

  // This would ideally call a tRPC endpoint to get subscription status
  // For now, we'll show a basic UI that links to Polar
  const isLoading = false;

  const handleManageBilling = () => {
    // Open Polar billing portal in a new tab
    // In production, you would generate a customer portal session URL
    const polarPortalUrl =
      process.env.NEXT_PUBLIC_POLAR_PORTAL_URL ||
      "https://polar.sh/dashboard/billing";
    window.open(polarPortalUrl, "_blank");
  };

  return (
    <div className="container mx-auto py-8 px-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing information
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Plan Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCardIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Current Plan</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your subscription is managed through Polar
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="default">Active</Badge>
                  <span className="text-xs text-muted-foreground">
                    Professional Plan
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Billing Portal</span>
              <Button onClick={handleManageBilling} variant="outline">
                <ExternalLinkIcon className="mr-2 h-4 w-4" />
                Open Polar Portal
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Manage your subscription, update payment methods, view invoices,
              and more through the Polar billing portal.
            </p>
          </div>
        </Card>

        {/* Features Included */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">What's Included</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Unlimited Workflows</p>
                <p className="text-xs text-muted-foreground">
                  Create and run unlimited workflow automations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Advanced Integrations</p>
                <p className="text-xs text-muted-foreground">
                  Connect with Gmail, Calendar, Slack, and more
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">AI-Powered Features</p>
                <p className="text-xs text-muted-foreground">
                  Access to Gemini, GPT-4, and Claude integrations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Priority Support</p>
                <p className="text-xs text-muted-foreground">
                  Get help from our team when you need it
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Billing Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Cycle</span>
              <span className="font-medium">Monthly</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Billing Date</span>
              <span className="font-medium">
                {new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toLocaleDateString()}
              </span>
            </div>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">
              For detailed billing history and to manage your payment methods,
              please visit the Polar portal.
            </p>
          </div>
        </Card>

        {/* Help Section */}
        <Card className="p-6 bg-muted/50">
          <h3 className="text-sm font-semibold mb-2">Need Help?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            If you have questions about your subscription or billing, our
            support team is here to help.
          </p>
          <Button variant="outline" size="sm">
            Contact Support
          </Button>
        </Card>
      </div>
    </div>
  );
}
