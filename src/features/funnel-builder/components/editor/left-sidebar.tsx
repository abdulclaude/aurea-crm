"use client";

import { useAtom } from "jotai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Layers, Plus } from "lucide-react";
import { activeSidebarAtom } from "../../lib/editor-store";
import { PagesPanel } from "./panels/pages-panel";
import { DesignPanel } from "./panels/design-panel";
import { BlocksPanel } from "./panels/blocks-panel";
import type { Funnel, FunnelPage } from "@prisma/client";

interface LeftSidebarProps {
  funnelId: string;
  funnel: Funnel & { pages: FunnelPage[] };
}

export function LeftSidebar({ funnelId, funnel }: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useAtom(activeSidebarAtom);

  return (
    <div className="w-80 border-r bg-muted/10 flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "pages" | "design" | "blocks")
        }
        className="flex flex-col h-full"
      >
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
          <TabsTrigger value="pages" className="gap-2">
            <FileText className="h-4 w-4" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="design" className="gap-2">
            <Layers className="h-4 w-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="blocks" className="gap-2">
            <Plus className="h-4 w-4" />
            Blocks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="flex-1 overflow-hidden m-0">
          <PagesPanel funnelId={funnelId} pages={funnel.pages} />
        </TabsContent>

        <TabsContent value="design" className="flex-1 overflow-hidden m-0">
          <DesignPanel />
        </TabsContent>

        <TabsContent value="blocks" className="flex-1 overflow-hidden m-0">
          <BlocksPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
