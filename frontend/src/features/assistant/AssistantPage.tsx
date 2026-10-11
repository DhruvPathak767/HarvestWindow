import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  ExternalLink,
  BookOpen,
  Trash2,
  Plus,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Tractor,
  Layers,
  Info,
} from "lucide-react";
import { useStore, ALL_FARMS } from "@/store/AppStore";
import { assistantClient } from "@/services/api/assistantClient";
import type {
  AssistantConversation,
  AssistantMessage,
  Citation,
  AssistantStatus,
} from "@/types/assistant";
import { Button } from "@/components/common/ui";
import { cn } from "@/utils/cn";

const SUGGESTED_QUESTIONS = [
  "When is my crop expected to be ready for harvest?",
  "Which crops have the highest weather risk on my farm?",
  "Summarize my farm's current crop and harvest risks.",
  "Explain my latest yield prediction and its drivers.",
  "What should I inspect if my leaf image showed disease symptoms?",
  "What operational tasks should I prioritize this week?",
];

export default function AssistantPage() {
  const { farms, selectedFarmId, selectFarm } = useStore();
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load status and conversations on mount
  useEffect(() => {
    let mounted = true;

    assistantClient
      .getStatus()
      .then((s) => {
        if (mounted) setStatus(s);
      })
      .catch(() => {});

    loadConversations();

    return () => {
      mounted = false;
    };
  }, []);

  const loadConversations = async () => {
    try {
      const list = await assistantClient.listConversations({ limit: 20 });
      setConversations(list);
    } catch {
      // Graceful fallback
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load selected conversation
  const selectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setError(null);
    try {
      const conv = await assistantClient.getConversation(convId);
      if (conv.messages) {
        setMessages(conv.messages);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load conversation history.");
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setInputMessage("");
    textareaRef.current?.focus();
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await assistantClient.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        startNewConversation();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete conversation.");
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage("");
    setError(null);

    // Optimistic user message
    const tempUserMsg: AssistantMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const targetFarmId = selectedFarmId === ALL_FARMS ? (farms[0]?.id || null) : selectedFarmId;

      const response = await assistantClient.sendMessage({
        message: text,
        conversationId: activeConversationId,
        farmId: targetFarmId,
      });

      const assistantMsg: AssistantMessage = {
        id: response.messageId,
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        farmContextUsed: response.farmContextUsed,
        createdAt: response.generatedAt,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (!activeConversationId) {
        setActiveConversationId(response.conversationId);
        loadConversations();
      }
    } catch (err: any) {
      setError(err.message || "Unable to synthesize response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

  return (
    <div className="flex h-[calc(100vh-65px)] flex-col bg-cream/30 lg:flex-row">
      {/* -------------------- SIDEBAR: Conversation History -------------------- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-line bg-white p-4 transition-transform lg:static lg:block lg:translate-x-0",
          historyOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2 text-forest-deep font-display font-bold text-sm">
            <MessageSquare className="h-4 w-4 text-gold" />
            <span>Chat Sessions</span>
          </div>
          <Button size="sm" variant="ghost" onClick={startNewConversation} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>

        <div className="mt-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {conversations.length === 0 ? (
            <p className="p-3 text-xs text-muted text-center">No previous conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  selectConversation(c.id);
                  setHistoryOpen(false);
                }}
                className={cn(
                  "group flex items-center justify-between rounded-md p-2.5 text-xs transition-colors cursor-pointer",
                  activeConversationId === c.id
                    ? "bg-forest-deep text-cream font-medium"
                    : "hover:bg-soft text-forest-deep"
                )}
              >
                <div className="truncate flex-1 pr-2">
                  <p className="truncate">{c.title || "Untitled query"}</p>
                  <p className={cn("text-[10px] mt-0.5", activeConversationId === c.id ? "text-cream/70" : "text-muted")}>
                    {new Date(c.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => deleteConversation(c.id, e)}
                  className={cn(
                    "opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/20 transition-opacity",
                    activeConversationId === c.id ? "text-cream" : "text-danger"
                  )}
                  title="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Overlay for mobile drawer */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* -------------------- MAIN CHAT PANE -------------------- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Control Bar */}
        <header className="flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="lg:hidden p-1.5 rounded-md border border-line text-forest-deep"
              aria-label="Toggle history"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-forest-deep text-gold shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base font-bold text-forest-deep">
                  Agricultural AI Assistant
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[10.5px] font-semibold text-forest">
                  <Sparkles className="h-3 w-3 text-gold" />
                  Grounded Agronomic RAG
                </span>
              </div>
              <p className="text-[11.5px] text-muted">
                Source-backed agronomic guidance & farm prediction explanations
              </p>
            </div>
          </div>

          {/* Farm Context Switcher */}
          <div className="flex items-center gap-2">
            <Tractor className="h-4 w-4 text-forest hidden sm:inline" />
            <select
              value={selectedFarmId}
              onChange={(e) => selectFarm(e.target.value)}
              className="rounded-md border border-line bg-cream/50 px-2.5 py-1 text-xs font-medium text-forest-deep focus:border-forest focus:outline-none"
            >
              <option value={ALL_FARMS}>All Farms Context</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.district})
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-6">
          {/* Introductory Hero when empty */}
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl text-center py-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-forest/10 text-forest mb-4">
                <Sparkles className="h-7 w-7 text-gold" />
              </div>
              <h2 className="font-display text-xl font-bold text-forest-deep sm:text-2xl">
                Ask about your crops, harvests, or risks
              </h2>
              <p className="mt-2 text-sm text-muted max-w-lg mx-auto">
                Grounds responses in authorized records for{" "}
                <span className="font-semibold text-forest-deep">
                  {selectedFarm?.name || "your registered farms"}
                </span>{" "}
                and authoritative references from ICAR, FAO, IISS, and PAU.
              </p>

              {/* Suggested Questions Grid */}
              <div className="mt-8 text-left">
                <p className="text-xs font-semibold tracking-wider text-muted uppercase mb-3 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-gold" />
                  Suggested questions to get started
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="group flex items-start gap-2.5 rounded-lg border border-line/80 bg-white p-3 text-left text-xs font-medium text-forest-deep transition-all hover:border-living hover:bg-forest/5 hover:shadow-sm"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trust & Citation Badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted border-t border-line/60 pt-4">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-forest" />
                  Multi-tenant isolated
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5 text-forest" />
                  FAO & ICAR accredited sources
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-forest" />
                  Zero fabricated farm facts
                </span>
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-2xl rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "bg-forest-deep text-cream rounded-br-none"
                    : "bg-white text-forest-deep border border-line rounded-bl-none"
                )}
              >
                {/* Assistant Header Badge */}
                {msg.role === "assistant" && (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-line/60">
                    <span className="flex items-center gap-1.5 font-display text-xs font-bold text-forest">
                      <Bot className="h-3.5 w-3.5 text-gold" />
                      Agronomic AI Assistant
                    </span>
                    {msg.farmContextUsed && (
                      <span className="inline-flex items-center gap-1 rounded bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest">
                        <Tractor className="h-2.5 w-2.5" />
                        Farm data linked
                      </span>
                    )}
                  </div>
                )}

                {/* Message Body Content */}
                <div className="whitespace-pre-wrap space-y-2">
                  {msg.content.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {/* Citations / Sources Box */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-line/70">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2 flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-gold" />
                      Accredited Agricultural Sources ({msg.sources.length}):
                    </p>
                    <div className="space-y-1.5">
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url || src.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-md bg-cream/60 px-2.5 py-1.5 text-xs text-forest-deep hover:bg-gold/15 transition-colors group"
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold block truncate text-[11.5px]">
                              {src.title}
                            </span>
                            <span className="text-[10px] text-muted">
                              {src.publisher} {src.publicationDate ? `• ${src.publicationDate}` : ""}
                            </span>
                          </div>
                          <ExternalLink className="h-3 w-3 text-muted group-hover:text-forest shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted px-1">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest-deep text-gold shadow-sm">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-bl-none border border-line bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-forest font-medium">
                  <span className="h-2 w-2 rounded-full bg-gold animate-ping" />
                  Synthesizing agronomic response & retrieving citations...
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              {(error.toLowerCase().includes("sign in") || error.toLowerCase().includes("authentication")) && (
                <Link
                  to="/sign-in"
                  className="rounded bg-forest-deep px-2.5 py-1 text-[11px] font-semibold text-cream hover:bg-forest transition-colors shrink-0 shadow-sm"
                >
                  Sign In
                </Link>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <footer className="border-t border-line bg-white p-4 sm:p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="mx-auto max-w-4xl"
          >
            <div className="relative flex items-end rounded-xl border border-line bg-cream/40 p-2 focus-within:border-forest focus-within:bg-white transition-all shadow-sm">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about harvest timing, weather risks, yield estimates, or crop health..."
                rows={2}
                disabled={loading}
                className="w-full resize-none bg-transparent px-3 py-1.5 text-xs sm:text-sm text-forest-deep placeholder:text-muted focus:outline-none disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={!inputMessage.trim() || loading}
                className="shrink-0 h-9 px-3.5 rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted px-1">
              <span>Press Enter to send, Shift + Enter for new line</span>
              <span className="flex items-center gap-1 font-mono">
                <ShieldCheck className="h-3 w-3 text-forest" />
                Zero-Cost Mode Active • FAO/ICAR Grounded
              </span>
            </div>
          </form>
        </footer>
      </main>
    </div>
  );
}
