"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Copy,
  Cpu,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  User,
  Wand2,
} from "lucide-react";
import Autocomplete from "@/components/common/Autocomplete/Autocomplete";
import SelectField from "@/components/common/SelectField/SelectField";
import Button from "@/components/common/Button/Button";
import Typography from "@/components/common/Typography/Typography";
import type { RagRecord } from "@/components/container/rag/types";
import type { AiModelRecord } from "@/components/container/ai-model/types";
import { chatWithRagFromDbAction } from "@/server/actions";

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; isThinking?: boolean };

const SUGGESTIONS: Array<{ title: string; prompt: string; icon: typeof Wand2 }> = [
  {
    title: "Summarize my knowledge base",
    prompt: "Give me a concise summary of what is covered in the selected RAG sources.",
    icon: BookOpen,
  },
  {
    title: "Ask a deep question",
    prompt: "What are the most important insights I should know from these documents?",
    icon: Sparkles,
  },
  {
    title: "Draft an outline",
    prompt: "Draft a structured outline of the key topics in the selected sources.",
    icon: Wand2,
  },
  {
    title: "Compare and contrast",
    prompt: "Compare the main concepts across the selected documents and highlight differences.",
    icon: Cpu,
  },
];

function uid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function HomeChat({
  rags,
  chatModels,
}: {
  rags: RagRecord[];
  chatModels: AiModelRecord[];
}) {
  const ragOptions = useMemo(
    () =>
      rags.map((r) => ({
        value: r.id,
        label: (
          <span className="flex items-center gap-2">
            <span className="font-medium">{r.name}</span>
            <span className="text-xs text-muted-foreground">({r.status})</span>
          </span>
        ),
        searchText: r.name,
        disabled: r.status !== "ready",
      })),
    [rags],
  );

  const modelOptions = useMemo(
    () =>
      chatModels.map((m) => ({
        value: m.id,
        label: `${m.name} (${m.modelId})`,
      })),
    [chatModels],
  );

  const defaultModelId =
    chatModels.find((m) => m.isDefault && m.status === "active")?.id ??
    chatModels.find((m) => m.status === "active")?.id ??
    chatModels[0]?.id ??
    null;

  const [selectedRagIds, setSelectedRagIds] = useState<(string | number)[]>([]);
  const [modelId, setModelId] = useState<string | number | null>(defaultModelId);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 200);
    el.style.height = `${Math.max(next, 56)}px`;
  }, [input]);

  const typeIntoAssistantMessage = useCallback(
    async (messageId: string, fullText: string) => {
      const speedMs = 10;
      let rendered = "";

      for (let i = 0; i < fullText.length; i += 1) {
        rendered += fullText[i] ?? "";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.role === "assistant"
              ? { ...m, content: rendered, isThinking: false }
              : m,
          ),
        );
        if (i % 3 === 0) await sleep(speedMs);
      }
    },
    [],
  );

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || isSending) return;
      if (!modelId) return;

      setIsSending(true);
      setInput("");

      const userMsg: ChatMessage = { id: uid(), role: "user", content: trimmed };
      const assistantId = uid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        isThinking: true,
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        const result = await chatWithRagFromDbAction({
          modelId: String(modelId),
          prompt: trimmed,
          ragIds: selectedRagIds.map(String),
          topK: 8,
        });

        if (!result.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.role === "assistant"
                ? { ...m, content: result.error, isThinking: false }
                : m,
            ),
          );
          return;
        }

        await typeIntoAssistantMessage(assistantId, result.data.content ?? "");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to chat";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === "assistant"
              ? { ...m, content: msg, isThinking: false }
              : m,
          ),
        );
      } finally {
        setIsSending(false);
        inputRef.current?.focus();
      }
    },
    [isSending, modelId, selectedRagIds, typeIntoAssistantMessage],
  );

  const send = useCallback(() => sendPrompt(input), [input, sendPrompt]);

  const resetChat = useCallback(() => {
    if (isSending) return;
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }, [isSending]);

  const copyMessage = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1400);
    } catch {
      // noop
    }
  }, []);

  const disabled =
    isSending || !modelId || chatModels.length === 0 || rags.length === 0;

  const selectedModel = chatModels.find((m) => m.id === modelId);
  const selectedRagCount = selectedRagIds.length;

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-surface via-background to-background"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[60%] -translate-x-1/2 rounded-full bg-brand-200/30 blur-3xl"
      />

      <header className="flex items-center justify-between gap-4 border-b border-border/60 bg-background/70 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-800 text-white shadow-sm ring-1 ring-brand-700/30">
            <Sparkles size={18} />
          </div>
          <div className="leading-tight">
            <Typography variant="h6" component="h1" className="mb-0! text-sm sm:text-base">
              AI Chat
            </Typography>
            <Typography variant="caption" color="muted" className="hidden sm:block">
              Ground your conversation in RAG sources and a chosen model.
            </Typography>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 ? (
            <Button
              variant="outlined"
              size="small"
              onClick={resetChat}
              disabled={isSending}
              startIcon={<RefreshCw size={14} />}
            >
              New chat
            </Button>
          ) : null}
        </div>
      </header>

      <section className="border-b border-border/60 bg-surface/40 px-4 py-2.5 backdrop-blur sm:px-6">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-x-auto">
            <span className="hidden items-center gap-1.5 pr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline-flex">
              <Wand2 size={12} className="text-brand-500" />
              Context
            </span>

            <span className="hidden h-5 w-px bg-border sm:inline-block" />

            <ToolbarField
              icon={<BookOpen size={13} />}
              label="RAG"
              active={selectedRagCount > 0}
              badge={
                selectedRagCount > 0 ? (
                  <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-semibold leading-none text-white">
                    {selectedRagCount}
                  </span>
                ) : null
              }
            >
              <Autocomplete
                multiple
                size="small"
                placeholder={rags.length ? "Select RAGs" : "No RAGs"}
                options={ragOptions}
                value={selectedRagIds}
                onChange={setSelectedRagIds}
                fullWidth
              />
            </ToolbarField>

            <ToolbarField
              icon={<Cpu size={13} />}
              label="Model"
              active={Boolean(selectedModel)}
            >
              <SelectField
                size="small"
                placeholder={chatModels.length ? "Select model" : "No models"}
                options={modelOptions}
                value={modelId}
                onChange={setModelId}
                fullWidth
              />
            </ToolbarField>
          </div>

          <div className="hidden shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:flex">
            <span
              className={[
                "inline-block h-1.5 w-1.5 rounded-full",
                modelId
                  ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                  : "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]",
              ].join(" ")}
            />
            {modelId ? "Ready" : "Pick a model"}
          </div>
        </div>
      </section>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-auto scroll-smooth px-4 py-6 sm:px-8"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {messages.length === 0 ? (
            <EmptyState
              disabled={disabled}
              onPick={(prompt) => {
                setInput(prompt);
                inputRef.current?.focus();
              }}
            />
          ) : null}

          {messages.map((m) => {
            const isUser = m.role === "user";
            const isAssistantTyping =
              m.role === "assistant" && !m.isThinking && m.content.length > 0 && isSending;
            return (
              <article
                key={m.id}
                className={[
                  "group flex items-start gap-3 fade-in-up",
                  isUser ? "flex-row-reverse" : "flex-row",
                ].join(" ")}
              >
                <Avatar role={m.role} />

                <div
                  className={[
                    "flex max-w-[90%] sm:max-w-[85%] flex-col gap-1",
                    isUser ? "items-end" : "items-start",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "relative whitespace-pre-wrap wrap-break-word rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm transition-shadow",
                      isUser
                        ? "rounded-tr-sm border-accent bg-accent text-accent-foreground"
                        : "rounded-tl-sm border-border bg-surface text-foreground",
                    ].join(" ")}
                  >
                    {m.role === "assistant" && m.isThinking ? (
                      <ThinkingDots />
                    ) : (
                      <>
                        {m.content}
                        {isAssistantTyping ? (
                          <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse rounded-sm bg-muted-foreground/70" />
                        ) : null}
                      </>
                    )}
                  </div>

                  {m.role === "assistant" && !m.isThinking && m.content.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => void copyMessage(m.id, m.content)}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 transition hover:bg-surface-strong hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                      aria-label="Copy message"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check size={12} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-border/60 bg-background/70 px-4 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <div
            className={[
              "relative flex items-end gap-2 rounded-2xl border bg-surface px-3 py-2 shadow-sm transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20",
              disabled ? "opacity-70" : "",
            ].join(" ")}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={
                !modelId
                  ? "Select a model to start chatting…"
                  : selectedRagCount > 0
                    ? "Ask anything about your selected RAG sources…"
                    : "Type a message — Enter to send, Shift+Enter for newline"
              }
              className="min-h-[56px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/80 focus:outline-none disabled:cursor-not-allowed"
              disabled={disabled}
              maxLength={4000}
            />

            <Button
              variant="contained"
              size="small"
              disabled={disabled || input.trim().length === 0}
              onClick={() => void send()}
              className="aspect-square! min-w-[40px]! h-[40px]! p-0! flex items-center justify-center self-end"
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between px-1">
            <Typography variant="caption" color="muted">
              {!modelId
                ? "Please select an AI model to start."
                : selectedRagCount === 0
                  ? "Tip: select RAG sources for grounded answers."
                  : `Grounded on ${selectedRagCount} RAG${selectedRagCount > 1 ? "s" : ""}.`}
            </Typography>
            <Typography variant="caption" color="muted">
              <span className="font-mono">{input.length}</span>
              <span className="opacity-60">/4000</span>
            </Typography>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        :global(.fade-in-up) {
          animation: fade-in-up 200ms ease-out both;
        }

        /* Make wrapped selectors blend into the toolbar pill */
        :global(.toolbar-field-trigger .mui-autocomplete-outline),
        :global(.toolbar-field-trigger .mui-selectfield-outline) {
          border: 0 !important;
        }
        :global(.toolbar-field-trigger .mui-autocomplete-input-wrapper),
        :global(.toolbar-field-trigger .mui-selectfield-input-wrapper) {
          min-height: 32px !important;
          padding: 0 6px 0 0 !important;
        }
        :global(.toolbar-field-trigger .mui-autocomplete-trigger),
        :global(.toolbar-field-trigger .mui-selectfield-select) {
          padding: 4px 0 !important;
          font-size: 0.8125rem !important;
          min-height: 32px !important;
        }
        :global(.toolbar-field-trigger .mui-autocomplete-helper),
        :global(.toolbar-field-trigger .mui-selectfield-helper) {
          display: none !important;
        }
        :global(.toolbar-field-trigger .mui-autocomplete-chip) {
          padding: 1px 4px 1px 6px !important;
          font-size: 0.7rem !important;
        }
      `}</style>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent text-accent-foreground shadow-sm"
        aria-label="You"
      >
        <User size={15} />
      </div>
    );
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-linear-to-br from-brand-100 to-brand-300 text-brand-900 shadow-sm"
      aria-label="Assistant"
    >
      <Sparkles size={15} />
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <span className="inline-flex items-end gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-300ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
      </span>
      <span className="text-xs">Thinking…</span>
    </span>
  );
}

function ToolbarField({
  icon,
  label,
  active,
  badge,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "group flex min-w-0 items-center gap-1.5 rounded-full border bg-background/80 pl-2.5 pr-1 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 hover:border-brand-300",
        active ? "border-brand-300" : "border-border",
      ].join(" ")}
    >
      <span
        className={[
          "flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider",
          active ? "text-brand-700" : "text-muted-foreground",
        ].join(" ")}
      >
        {icon}
        {label}
        {badge}
      </span>
      <span className="h-4 w-px bg-border/70" />
      <div className="toolbar-field-trigger min-w-[120px] flex-1 sm:min-w-[140px] md:min-w-[180px]">
        {children}
      </div>
    </div>
  );
}

function EmptyState({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 pt-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-400 to-brand-800 text-white shadow-md ring-1 ring-brand-700/30">
        <Sparkles size={26} />
      </div>
      <div className="space-y-1">
        <Typography variant="h5" component="h2" className="mb-0!">
          How can I help today?
        </Typography>
        <Typography variant="body2" color="muted">
          Pick a starter below or type your own question.
        </Typography>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 xs:grid-cols-2">
        {SUGGESTIONS.map(({ title, prompt, icon: Icon }) => (
          <button
            key={title}
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-surface/60 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-surface-strong hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-800 transition group-hover:bg-brand-200">
              <Icon size={14} />
            </span>
            <span className="text-sm font-medium text-foreground">{title}</span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
