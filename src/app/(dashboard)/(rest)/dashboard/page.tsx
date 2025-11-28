import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Bot, Workflow, Users, BarChart3 } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Welcome Section */}
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-primary">
          Welcome back, {userName}
        </h1>
        <p className="text-sm text-primary/60 mt-1">
          Here&apos;s what&apos;s happening with your CRM today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="w-full max-w-4xl mx-auto">
        <h2 className="text-sm font-semibold text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/assistant"
            className="flex flex-col items-center justify-center p-6 bg-background border border-black/10 dark:border-white/5 rounded-lg hover:border-primary/20 transition-colors"
          >
            <Bot className="h-8 w-8 text-primary/60 mb-3" />
            <span className="text-sm font-medium text-primary">Assistant</span>
            <span className="text-xs text-primary/50 mt-1">Chat with AI</span>
          </Link>

          <Link
            href="/workflows"
            className="flex flex-col items-center justify-center p-6 bg-background border border-black/10 dark:border-white/5 rounded-lg hover:border-primary/20 transition-colors"
          >
            <Workflow className="h-8 w-8 text-primary/60 mb-3" />
            <span className="text-sm font-medium text-primary">Workflows</span>
            <span className="text-xs text-primary/50 mt-1">Automate tasks</span>
          </Link>

          <Link
            href="/contacts"
            className="flex flex-col items-center justify-center p-6 bg-background border border-black/10 dark:border-white/5 rounded-lg hover:border-primary/20 transition-colors"
          >
            <Users className="h-8 w-8 text-primary/60 mb-3" />
            <span className="text-sm font-medium text-primary">Contacts</span>
            <span className="text-xs text-primary/50 mt-1">Manage leads</span>
          </Link>

          <Link
            href="/pipelines"
            className="flex flex-col items-center justify-center p-6 bg-background border border-black/10 dark:border-white/5 rounded-lg hover:border-primary/20 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-primary/60 mb-3" />
            <span className="text-sm font-medium text-primary">Pipelines</span>
            <span className="text-xs text-primary/50 mt-1">Track deals</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
