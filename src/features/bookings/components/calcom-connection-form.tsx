"use client";

import { ExternalLink, Loader2, PlugZap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TestResult = {
  success: boolean;
  user: {
    id: string | number;
    email: string;
    name: string;
    username: string;
  } | null;
} | null;

export function CalComConnectionForm(props: {
  apiKey: string;
  isSaving: boolean;
  isTesting: boolean;
  testResult: TestResult;
  onApiKeyChange: (value: string) => void;
  onSave: () => void;
  onTest: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-medium">Connection</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The credential is isolated to the active organization and location.
        </p>
      </div>
      <div className="max-w-xl space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="calcom-api-key">API key</Label>
          <a
            href="https://app.cal.com/settings/developer/api-keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Cal.com <ExternalLink className="size-3" />
          </a>
        </div>
        <Input
          id="calcom-api-key"
          type="password"
          autoComplete="off"
          value={props.apiKey}
          onChange={(event) => props.onApiKeyChange(event.target.value)}
          placeholder="cal_live_..."
        />
        {props.testResult && (
          <p
            className={
              props.testResult.success
                ? "text-xs text-emerald-600"
                : "text-xs text-destructive"
            }
          >
            {props.testResult.success
              ? `Verified${props.testResult.user?.name ? ` as ${props.testResult.user.name}` : ""}`
              : "Cal.com rejected this credential."}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!props.apiKey || props.isTesting}
          onClick={props.onTest}
        >
          {props.isTesting && <Loader2 className="size-4 animate-spin" />}
          Test
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!props.apiKey || props.isSaving}
          onClick={props.onSave}
        >
          {props.isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PlugZap className="size-4" />
          )}
          Connect
        </Button>
      </div>
    </div>
  );
}
