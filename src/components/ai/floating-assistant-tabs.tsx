"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFloatingAssistant } from "@/stores/floating-assistant";

export function FloatingAssistantTabs() {
  const tabs = useFloatingAssistant((state) => state.conversationTabs);
  const activeConversationId = useFloatingAssistant(
    (state) => state.conversationId,
  );
  const isOpen = useFloatingAssistant((state) => state.isOpen);
  const requestConversationSwitch = useFloatingAssistant(
    (state) => state.requestConversationSwitch,
  );
  const removeConversationTab = useFloatingAssistant(
    (state) => state.removeConversationTab,
  );
  const startNewConversation = useFloatingAssistant(
    (state) => state.startNewConversation,
  );
  const setActiveTabRect = useFloatingAssistant(
    (state) => state.setActiveTabRect,
  );

  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const newChatRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const barEl = barRef.current;
    if (!barEl) return;

    const measure = () => {
      let activeEl: HTMLElement | null = null;
      if (activeConversationId && isOpen) {
        activeEl = tabRefs.current.get(activeConversationId) ?? null;
      }
      if (!activeEl && isOpen) {
        activeEl = newChatRef.current;
      }

      const barRect = barEl.getBoundingClientRect();
      if (!activeEl) {
        setActiveTabRect({
          centerX: barRect.left + barRect.width / 2,
          barTop: barRect.top,
        });
        return;
      }
      const tabRect = activeEl.getBoundingClientRect();
      setActiveTabRect({
        centerX: tabRect.left + tabRect.width / 2,
        barTop: barRect.top,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(barEl);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeConversationId, isOpen, tabs.length, setActiveTabRect]);

  const setTabRef = (id: string, el: HTMLElement | null) => {
    if (el) tabRefs.current.set(id, el);
    else tabRefs.current.delete(id);
  };

  return (
    <div
      ref={barRef}
      data-floating-assistant-tabs
      className="shrink-0 overflow-hidden bg-sidebar border-t border-border px-0 pt-1"
    >
      <LayoutGroup id="floating-assistant-tabs">
        <div className="flex min-w-0 items-center justify-end gap-0.5 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AnimatePresence initial={false} mode="sync">
            {tabs.map((tab) => {
              const isActive = tab.id === activeConversationId && isOpen;

              return (
                // Plain div holds the measurement ref — avoids React 19 element.ref warning
                // that fires when framer-motion internally reads element.ref on motion.div
                <div
                  key={tab.id}
                  ref={(el) => setTabRef(tab.id, el)}
                  style={{ overflow: "hidden", flexShrink: 0 }}
                >
                  <motion.div
                    layout
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{
                      width: 0,
                      opacity: 0,
                      transition: {
                        width: { duration: 0.24, ease: [0.2, 0, 0, 1] },
                        opacity: { duration: 0.16, ease: "easeIn" },
                      },
                    }}
                    transition={{
                      layout: { duration: 0.24, ease: [0.2, 0, 0, 1] },
                      width: { duration: 0.24, ease: [0.2, 0, 0, 1] },
                      opacity: { duration: 0.12 },
                    }}
                    style={{ overflow: "hidden" }}
                    className="shrink-0"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{
                        opacity: 0,
                        scale: 0.96,
                        transition: {
                          opacity: { duration: 0.12, ease: "easeIn" },
                          scale: { duration: 0.2, ease: "easeIn" },
                        },
                      }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: "hidden" }}
                      className={cn(
                        "group/container relative flex h-7 w-max max-w-[10rem] cursor-pointer items-center rounded-full text-[11px] transition-colors",
                        isActive
                          ? "text-black"
                          : "text-muted-foreground hover:text-black",
                      )}
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="floating-assistant-active-tab"
                          className="absolute inset-0 rounded-full border border-black/[0.08] bg-black/[0.06]"
                          transition={{
                            type: "spring",
                            stiffness: 520,
                            damping: 42,
                            mass: 0.8,
                          }}
                        />
                      ) : (
                        <span className="absolute inset-0 rounded-full border border-transparent bg-transparent transition-[background-color,border-color] duration-150 group-hover/container:border-black/[0.06] group-hover/container:bg-black/[0.04]" />
                      )}

                      <button
                        type="button"
                        onClick={() => requestConversationSwitch(tab.id)}
                        className="relative z-10 flex h-full min-w-0 flex-1 cursor-pointer items-center overflow-hidden rounded-full px-3 py-0 text-left"
                        title={tab.title}
                      >
                        <span className="min-w-0 truncate whitespace-nowrap">
                          {tab.title}
                        </span>
                      </button>

                      <div
                        className={cn(
                          "pointer-events-none absolute inset-y-0 right-0 z-20 w-12 rounded-r-full opacity-0 transition-opacity duration-150 [mask-image:linear-gradient(to_left,black_40%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_left,black_40%,transparent_100%)] group-hover/container:opacity-100",
                          isActive ? "bg-black/[0.06]" : "bg-sidebar",
                        )}
                      />

                      <motion.button
                        type="button"
                        aria-label={`Close ${tab.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeConversationTab(tab.id);
                        }}
                        initial={false}
                        transition={{ duration: 0.12 }}
                        className="pointer-events-none absolute right-1.5 top-1/2 z-30 flex size-4 -translate-y-1/2 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground opacity-0 transition-[background-color,color,opacity] duration-150 hover:bg-black/[0.06] hover:text-black focus-visible:outline-none group-hover/container:pointer-events-auto group-hover/container:opacity-100"
                      >
                        <X className="size-2.5" />
                      </motion.button>
                    </motion.div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>

          <motion.button
            ref={newChatRef}
            layout
            type="button"
            aria-label="New chat"
            title="New chat with Aurea AI"
            onClick={() => startNewConversation()}
            className="flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-black"
          >
            <MessageCircle className="size-3 shrink-0" />
            <span className="hidden whitespace-nowrap sm:inline">Aurea AI</span>
          </motion.button>
        </div>
      </LayoutGroup>
    </div>
  );
}
