"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, User, Copy, RotateCcw, ThumbsUp, ThumbsDown, Wand2, Plus, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
};

type Model = { id: string; label: string; description: string };

const MODELS: Model[] = [
  { id: "gemini-1.5-flash", label: "Gemini Flash", description: "Fast & efficient" },
  { id: "gemini-1.5-pro", label: "Gemini Pro", description: "Most capable" },
];

const STARTER_PROMPTS = [
  "Explain quantum computing in simple terms",
  "Write a product requirements document for a mobile app",
  "What are the best practices for REST API design?",
  "Help me debug my React component",
  "Write a professional email declining a meeting",
  "Explain the difference between TCP and UDP",
];

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 mt-1">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="message-ai px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 mb-6 group", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={cn("max-w-[75%] space-y-2", isUser ? "items-end" : "items-start", "flex flex-col")}>
        <div className={cn(
          "px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "message-user text-white"
            : "message-ai text-[var(--text-secondary)]"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:text-white prose-headings:font-bold
              prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed
              prose-code:bg-[var(--bg-primary)] prose-code:text-purple-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              prose-pre:bg-[var(--bg-primary)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-xl
              prose-strong:text-white prose-a:text-purple-400
              prose-ul:text-[var(--text-secondary)] prose-ol:text-[var(--text-secondary)]
              prose-li:marker:text-purple-400
            ">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCopy(message.content)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)] transition-all text-xs flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-green-400 hover:bg-[var(--bg-hover)] transition-all">
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-hover)] transition-all">
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(text.slice(0, 20));
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role === "user" ? "user" : "model" as "user" | "model",
        text: m.content,
      }));

      const token = localStorage.getItem('aiverse_token');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: history, model: selectedModel.id }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulated, isStreaming: true }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err.message}. Please try again.`, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] flex-shrink-0" style={{ background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Chat AI</h1>
            <p className="text-xs text-[var(--text-muted)]">Context-aware conversations</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-white transition-all"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {selectedModel.label}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showModelMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 glass border border-[var(--border)] rounded-xl p-1 z-50">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m); setShowModelMenu(false); }}
                    className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-all text-left"
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", selectedModel.id === m.id ? "bg-purple-400" : "bg-[var(--border)]")} />
                    <div>
                      <div className="text-sm text-white">{m.label}</div>
                      <div className="text-xs text-[var(--text-muted)]">{m.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-secondary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mb-6 animate-float">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">What can I help you with?</h2>
            <p className="text-[var(--text-secondary)] mb-10">
              I'm your AI assistant powered by Gemini. Ask me anything — from complex analysis to creative writing.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="p-4 rounded-xl text-left text-sm glass border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-purple-500/40 transition-all group"
                >
                  <Wand2 className="w-3.5 h-3.5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onCopy={handleCopy} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-[var(--border)] flex-shrink-0" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-3 p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] focus-within:border-purple-500/50 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AIverse... (Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[var(--text-muted)] outline-none resize-none max-h-40 leading-relaxed"
              style={{ minHeight: "24px" }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 160) + "px";
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                input.trim() && !isLoading
                  ? "bg-gradient-to-br from-violet-600 to-purple-700 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105 text-white"
                  : "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs text-[var(--text-muted)] mt-2">
            AIverse uses Gemini AI · Responses may not always be accurate · Verify important information
          </p>
        </div>
      </div>
    </div>
  );
}
