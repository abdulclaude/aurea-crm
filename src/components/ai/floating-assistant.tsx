"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
} from "framer-motion";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  CornerDownLeft,
  Loader2,
  RefreshCw,
  Sparkles,
  Square,
  Users,
  CalendarDays,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useFloatingAssistant,
  type FloatingAssistantConversationTab,
} from "@/stores/floating-assistant";
import { createId } from "@paralleldrive/cuid2";

const ENTER_TRANSITION = {
  type: "spring",
  stiffness: 700,
  damping: 40,
  mass: 0.8,
} as const;

const EXIT_TRANSITION = { duration: 0.18, ease: [0.4, 0, 1, 1] } as const;

const SLIDE_TRANSITION = {
  type: "spring",
  stiffness: 500,
  damping: 35,
  mass: 0.6,
} as const;

const SUGGESTIONS = [
  {
    icon: Users,
    label: "Member overview",
    prompt:
      "Give me a summary of active memberships and member retention this month.",
  },
  {
    icon: CalendarDays,
    label: "Class performance",
    prompt:
      "Which classes have the lowest occupancy and what can I do to improve them?",
  },
  {
    icon: TrendingUp,
    label: "Revenue insights",
    prompt:
      "What are the top drivers of revenue this month and where are the gaps?",
  },
] as const;

function shouldCloseForTarget(
  target: EventTarget | null,
  panel: HTMLElement | null,
) {
  if (!panel || !(target instanceof Node)) return false;
  if (panel.contains(target)) return false;
  if (target instanceof Element) {
    if (target.closest("[data-radix-popper-content-wrapper]")) return false;
    if (target.closest("[data-floating-assistant-tabs]")) return false;
  }
  return true;
}

function DockShell({ children }: { children: React.ReactNode }) {
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalNode(document.body);
  }, []);
  if (!portalNode) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-40">{children}</div>,
    portalNode,
  );
}

export function FloatingAssistant() {
  const { isOpen, initialQuery, initialQueryAction, setInitialQuery, close } =
    useFloatingAssistant();
  const activeTabRect = useFloatingAssistant((s) => s.activeTabRect);
  const sharedConversationId = useFloatingAssistant((s) => s.conversationId);
  const setSharedConversationId = useFloatingAssistant(
    (s) => s.setConversationId,
  );
  const newConversationSignal = useFloatingAssistant(
    (s) => s.newConversationSignal,
  );
  const conversationSwitchSignal = useFloatingAssistant(
    (s) => s.conversationSwitchSignal,
  );
  const startNewConversation = useFloatingAssistant(
    (s) => s.startNewConversation,
  );
  const addConversationTab = useFloatingAssistant((s) => s.addConversationTab);
  const removeConversationTab = useFloatingAssistant(
    (s) => s.removeConversationTab,
  );

  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const observedNewSignalRef = useRef(newConversationSignal);
  const observedSwitchSignalRef = useRef(conversationSwitchSignal);
  const lastUserMessageRef = useRef("");
  const conversationIdRef = useRef<string | undefined>(undefined);

  const panelLeftX = useMotionValue(0);
  const hasSetInitialLeftRef = useRef(false);

  const { calculatedLeft, calculatedBottom } = useMemo(() => {
    if (typeof window === "undefined")
      return { calculatedLeft: 0, calculatedBottom: 24 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 24;
    const maxW = 768;
    const panelWidth = Math.min(maxW, vw - padding * 2);

    if (!activeTabRect) {
      return {
        calculatedLeft: Math.max(padding, (vw - panelWidth) / 2),
        calculatedBottom: padding,
      };
    }

    let left = activeTabRect.centerX - panelWidth / 2;
    left = Math.max(padding, Math.min(left, vw - panelWidth - padding));
    const bottom = Math.max(padding, vh - activeTabRect.barTop + 8);
    return { calculatedLeft: left, calculatedBottom: bottom };
  }, [activeTabRect]);

  useEffect(() => {
    if (!isOpen) {
      hasSetInitialLeftRef.current = false;
      return;
    }
    if (!hasSetInitialLeftRef.current) {
      panelLeftX.set(calculatedLeft);
      hasSetInitialLeftRef.current = true;
    } else {
      animate(panelLeftX, calculatedLeft, SLIDE_TRANSITION);
    }
  }, [calculatedLeft, isOpen, panelLeftX]);

  const { messages, sendMessage, stop, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
    experimental_throttle: 50,
    onFinish: ({ message }) => {
      const convId = conversationIdRef.current;
      if (convId) {
        const existingTab = useFloatingAssistant
          .getState()
          .conversationTabs.find((t) => t.id === convId);
        if (!existingTab) {
          addConversationTab({
            id: convId,
            title: lastUserMessageRef.current.slice(0, 40) || "New chat",
            updatedAt: Date.now(),
          });
        }
      }
      void message;
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 180;
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (shouldCloseForTarget(e.target, panelRef.current)) close();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [close, isOpen]);

  const resetConversation = useCallback(() => {
    if (isStreaming) stop();
    setMessages([]);
    setText("");
    setInitialQuery(null);
    lastUserMessageRef.current = "";
    conversationIdRef.current = undefined;
  }, [isStreaming, setInitialQuery, setMessages, stop]);

  useEffect(() => {
    if (observedNewSignalRef.current === newConversationSignal) return;
    observedNewSignalRef.current = newConversationSignal;
    resetConversation();
    conversationIdRef.current = createId();
    setSharedConversationId(conversationIdRef.current);
  }, [newConversationSignal, resetConversation, setSharedConversationId]);

  useEffect(() => {
    if (observedSwitchSignalRef.current === conversationSwitchSignal) return;
    observedSwitchSignalRef.current = conversationSwitchSignal;
    if (!sharedConversationId) return;
    resetConversation();
    conversationIdRef.current = sharedConversationId;
  }, [conversationSwitchSignal, resetConversation, sharedConversationId]);

  useEffect(() => {
    if (!initialQuery) return;
    if (initialQueryAction === "submit") {
      submit(initialQuery);
      setInitialQuery(null);
      return;
    }
    setText(initialQuery);
    setInitialQuery(null);
  }, [initialQuery, initialQueryAction, setInitialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(
    (raw?: string) => {
      const t = (raw ?? text).trim();
      if (!t || isStreaming) return;
      lastUserMessageRef.current = t;
      if (!conversationIdRef.current) {
        conversationIdRef.current = createId();
        setSharedConversationId(conversationIdRef.current);
      }
      setText("");
      isAtBottomRef.current = true;
      sendMessage({ text: t });
      window.setTimeout(() => scrollToBottom("auto"), 50);
    },
    [isStreaming, scrollToBottom, sendMessage, setSharedConversationId, text],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  };

  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <DockShell>
      <AnimatePresence initial={false} mode="sync">
        {isOpen ? (
          <motion.div
            key="panel"
            className="pointer-events-none absolute"
            style={{
              left: panelLeftX,
              bottom: calculatedBottom,
              width: `min(48rem, calc(100vw - 48px))`,
              transformOrigin: "bottom center",
            }}
            initial={{ opacity: 0, scale: 0.96, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 10,
              filter: "blur(4px)",
              transition: EXIT_TRANSITION,
            }}
            transition={ENTER_TRANSITION}
          >
            <div
              ref={panelRef}
              className="pointer-events-auto relative w-full transform-gpu"
            >
              <div className="relative flex h-[78vh] max-h-[calc(100dvh-6rem)] min-h-[30rem] w-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-black/10">
                {/* Close button */}
                <div className="absolute right-3 top-3 z-10">
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close assistant"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Messages / empty state */}
                <div className="min-h-0 flex-1 overflow-clip">
                  {hasMessages ? (
                    <div
                      ref={scrollRef}
                      onScroll={handleScroll}
                      className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      <div className="space-y-4 px-5 pb-4 pt-12">
                        {messages.map((m) => {
                          const textContent =
                            m.parts
                              ?.filter((p) => p.type === "text")
                              .map((p) =>
                                "text" in p ? (p as { text: string }).text : "",
                              )
                              .join("") ?? "";
                          return (
                            <div
                              key={m.id}
                              className={cn(
                                "flex gap-2.5",
                                m.role === "user"
                                  ? "justify-end"
                                  : "justify-start",
                              )}
                            >
                              {m.role === "assistant" && (
                                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                                  <Sparkles className="size-3 text-indigo-500" />
                                </div>
                              )}
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
                                  m.role === "user"
                                    ? "rounded-br-sm bg-indigo-500 text-white"
                                    : "rounded-bl-sm bg-accent text-black",
                                )}
                              >
                                <span className="whitespace-pre-wrap">
                                  {textContent}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {status === "submitted" && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2.5"
                          >
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                              <Loader2 className="size-3 animate-spin text-indigo-500" />
                            </div>
                            <div className="flex gap-1 items-center rounded-2xl rounded-bl-sm bg-accent px-4 py-3">
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {error && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                            {error.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-5 px-6">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50">
                          <Sparkles className="size-6 text-indigo-500" />
                        </div>
                        <h2 className="text-center text-base font-medium tracking-tight text-black">
                          How can I help with your studio?
                        </h2>
                        <p className="text-center text-xs text-muted-foreground max-w-xs">
                          Ask me about members, classes, revenue, or anything
                          else.
                        </p>
                      </div>
                      <div className="flex flex-wrap max-w-lg items-center justify-center gap-2">
                        {SUGGESTIONS.map((s) => {
                          const Icon = s.icon;
                          return (
                            <button
                              key={s.label}
                              type="button"
                              onClick={() => submit(s.prompt)}
                              className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-left text-xs text-muted-foreground transition-all hover:border-black/15 hover:bg-accent hover:text-black"
                            >
                              <Icon className="size-3.5 shrink-0" />
                              <span>{s.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Input area */}
                <div className="shrink-0 border-t border-border p-3">
                  <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:ring-1 focus-within:ring-ring transition-shadow">
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything about your studio…"
                      rows={1}
                      disabled={isStreaming}
                      className="flex-1 resize-none bg-transparent text-[13px] text-black placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
                      style={{ minHeight: "22px", maxHeight: "112px" }}
                    />
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={() => stop()}
                        aria-label="Stop"
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground transition-colors hover:bg-accent/80 hover:text-black"
                      >
                        <Square className="size-3.5 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => submit()}
                        disabled={!text.trim()}
                        aria-label="Send"
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
                          text.trim()
                            ? "bg-indigo-500 text-white hover:bg-indigo-600"
                            : "bg-muted text-muted-foreground/30 cursor-not-allowed",
                        )}
                      >
                        <CornerDownLeft className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 px-1">
                    <p className="text-[10px] text-muted-foreground/50">
                      Aurea AI
                    </p>
                    {hasMessages && !isStreaming && (
                      <button
                        type="button"
                        onClick={resetConversation}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                      >
                        <RefreshCw className="size-2.5" />
                        New chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </DockShell>
  );
}

export function FloatingAssistantTrigger() {
  return null; // Tabs are the trigger now
}
