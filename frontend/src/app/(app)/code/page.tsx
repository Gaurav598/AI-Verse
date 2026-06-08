"use client";
import { useState, useRef, useCallback } from "react";
import { Code2, Send, Copy, Check, ChevronDown, Wand2, Bug, BookOpen, Zap, FileCode2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java",
  "C++", "C#", "PHP", "Ruby", "Swift", "Kotlin", "SQL", "Bash",
];

const ACTIONS = [
  { id: "generate", icon: Wand2, label: "Generate", description: "Write code from description" },
  { id: "debug", icon: Bug, label: "Debug", description: "Find and fix bugs" },
  { id: "explain", icon: BookOpen, label: "Explain", description: "Understand existing code" },
  { id: "optimize", icon: Zap, label: "Optimize", description: "Improve performance" },
];

const EXAMPLES = [
  { lang: "TypeScript", prompt: "Build a generic debounce function" },
  { lang: "Python", prompt: "Implement a LRU cache using OrderedDict" },
  { lang: "SQL", prompt: "Write a query to find top 10 customers by revenue" },
  { lang: "Go", prompt: "Create a concurrent HTTP rate limiter" },
  { lang: "TypeScript", prompt: "Build a type-safe event emitter" },
  { lang: "Python", prompt: "Implement binary search tree with traversal" },
];

export default function CodePage() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("TypeScript");
  const [action, setAction] = useState("generate");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const generate = useCallback(async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim() || isLoading) return;

    setOutput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt.trim(), language, action }),
      });

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
                setOutput(accumulated);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, language, action, isLoading]);

  const handleCopy = async () => {
    const codeMatch = output.match(/```[\w]*\n([\s\S]*?)```/);
    const toCopy = codeMatch ? codeMatch[1] : output;
    await navigator.clipboard.writeText(toCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] flex-shrink-0" style={{ background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Code AI</h1>
            <p className="text-xs text-[var(--text-muted)]">Generate, debug, and explain code</p>
          </div>
        </div>

        {output && (
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-secondary text-xs">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left panel — input */}
        <div className="flex flex-col border-r border-[var(--border)]" style={{ background: "var(--bg-secondary)" }}>
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Action selector */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Action</label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAction(a.id)}
                    className={cn(
                      "flex items-start gap-2 p-3 rounded-xl border text-left transition-all",
                      action === a.id
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-white"
                    )}
                  >
                    <a.icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">{a.label}</div>
                      <div className="text-xs text-[var(--text-muted)]">{a.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Language selector */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Language</label>
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm text-white hover:border-cyan-500/40 transition-all"
                  style={{ background: "var(--bg-card)" }}
                >
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-cyan-400" />
                    {language}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                </button>

                {showLangMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 glass border border-[var(--border)] rounded-xl p-1 z-50 grid grid-cols-2 gap-0.5 max-h-48 overflow-y-auto">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-left text-sm transition-all",
                          language === lang
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white"
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Prompt input */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                {action === "generate" ? "Describe what you want to build" : action === "debug" ? "Paste your buggy code" : action === "explain" ? "Paste code to explain" : "Paste code to optimize"}
              </label>
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  action === "generate"
                    ? `e.g., A function that validates email addresses using regex...`
                    : `Paste your ${language} code here...`
                }
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm text-white placeholder:text-[var(--text-muted)] outline-none resize-none focus:border-cyan-500/50 transition-all font-mono"
              />
            </div>

            <button
              onClick={() => generate()}
              disabled={!prompt.trim() || isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
                prompt.trim() && !isLoading
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/20"
                  : "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {ACTIONS.find(a => a.id === action)?.label} with AI
                </>
              )}
            </button>

            {/* Example prompts */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Quick Examples</label>
              <div className="space-y-1.5">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setLanguage(ex.lang);
                      setPrompt(ex.prompt);
                      generate(ex.prompt);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white transition-all group"
                  >
                    <Code2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="flex-1 truncate">{ex.prompt}</span>
                    <span className="text-[var(--text-muted)] flex-shrink-0">{ex.lang}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — output */}
        <div className="flex flex-col" style={{ background: "var(--bg-primary)" }}>
          {output ? (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:text-white prose-headings:font-bold
                prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed
                prose-code:bg-[var(--bg-secondary)] prose-code:text-cyan-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                prose-pre:bg-[#0d0d14] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-xl prose-pre:overflow-auto
                prose-strong:text-white
                prose-ul:text-[var(--text-secondary)] prose-ol:text-[var(--text-secondary)]
                prose-li:marker:text-cyan-400
              ">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 mt-4 text-sm text-[var(--text-muted)]">
                  <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  Generating...
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                  <Code2 className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Ready to generate code</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                  Describe what you want to build, or paste existing code to debug, explain, or optimize.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
