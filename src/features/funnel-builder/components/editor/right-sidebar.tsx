"use client";

import { useAtom } from "jotai";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Paintbrush } from "lucide-react";
import { selectedBlockIdAtom, propertiesPanelOpenAtom } from "../../lib/editor-store";
import { PropertiesPanel } from "./panels/properties-panel";
import { StylesPanel } from "./panels/styles-panel";
import type { FunnelPage, FunnelBlock, FunnelBreakpoint } from "@prisma/client";

interface RightSidebarProps {
  page:
    | (FunnelPage & {
        blocks: (FunnelBlock & { breakpoints: FunnelBreakpoint[] })[];
      })
    | null
    | undefined;
}

export function RightSidebar({ page }: RightSidebarProps) {
  const [selectedBlockId] = useAtom(selectedBlockIdAtom);
  const [isOpen] = useAtom(propertiesPanelOpenAtom);

  if (!isOpen) {
    return null;
  }

  const selectedBlock = page?.blocks.find((b) => b.id === selectedBlockId);

  if (!selectedBlockId || !selectedBlock) {
    return (
      <div className="w-80 border-l bg-muted/10 flex items-center justify-center p-8">
        <div className="text-center text-sm text-muted-foreground">
          <div className="text-4xl mb-3">⚙️</div>
          <p>Select a block to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-muted/10 flex flex-col">
      <Tabs defaultValue="properties" className="flex flex-col h-full">
        <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
          <TabsTrigger value="properties" className="gap-2">
            <Settings className="h-4 w-4" />
            Properties
          </TabsTrigger>
          <TabsTrigger value="styles" className="gap-2">
            <Paintbrush className="h-4 w-4" />
            Styles
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="properties" className="m-0 p-4">
            <PropertiesPanel block={selectedBlock} />
          </TabsContent>

          <TabsContent value="styles" className="m-0 p-4">
            <StylesPanel block={selectedBlock} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
