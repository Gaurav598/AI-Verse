"use client";
import { useState, useCallback } from "react";
import { Video, Wand2, Film, FileText, Lightbulb, Clock, Copy, Check, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const CONTENT_TYPES = [
  { id: "script", icon: FileText, label: "Full Script", description: "Complete video script with narration" },
  { id: "storyboard", icon: Film, label: "Storyboard", description: "Scene-by-scene visual breakdown" },
  { id: "hooks", icon: Lightbulb, label: "Hook Ideas", description: "5 powerful opening hooks" },
];

const PLATFORMS = ["YouTube", "Instagram Reels", "TikTok", "LinkedIn", "Twitter/X", "Podcast"];

const EXAMPLES = [
  { title: "SaaS product launch announcement", platform: "YouTube", duration: "3 min" },
  { title: "How to use AI for productivity", platform: "YouTube", duration: "10 min" },
  { title: "Behind the scenes at a startup", platform: "Instagram Reels", duration: "60 sec" },
  { title: "5 mistakes new developers make", platform: "TikTok", duration: "30 sec" },
  { title: "AI tools that changed my workflow", platform: "LinkedIn", duration: "5 min" },
];

export default function VideoPage() {
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("script");
  const [platform, setPlatform] = useState("YouTube");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async (customTopic?: string) => {
    const finalTopic = customTopic || topic;
    if (!finalTopic.trim() || isLoading) return;

    setOutput("");
    setIsLoading(true);

    const prompt = `${finalTopic} (Platform: ${platform})`;

    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
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
  }, [topic, type, platform, isLoading]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] flex-shrink-0" style={{ background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Video AI</h1>
            <p className="text-xs text-[var(--text-muted)]">Scripts, storyboards & production guides</p>
          </div>
        </div>

        {output && (
          <div className="flex gap-2">
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-secondary text-xs">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={() => generate()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-secondary text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[380px,1fr]">
        {/* Controls */}
        <div className="flex flex-col border-r border-[var(--border)] overflow-y-auto" style={{ background: "var(--bg-secondary)" }}>
          <div className="p-4 space-y-4">
            {/* Content type */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Content Type</label>
              <div className="space-y-2">
                {CONTENT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                      type === t.id
                        ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-white"
                    )}
                  >
                    <t.icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">{t.label}</div>
                      <div className="text-xs text-[var(--text-muted)]">{t.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Platform</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs border transition-all",
                      platform === p
                        ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--text-muted)]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic input */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Video Topic</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., How to build a SaaS product from zero to launch..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm text-white placeholder:text-[var(--text-muted)] outline-none resize-none focus:border-orange-500/50 transition-all"
              />
            </div>

            <button
              onClick={() => generate()}
              disabled={!topic.trim() || isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
                topic.trim() && !isLoading
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:shadow-lg hover:shadow-orange-500/20"
                  : "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Writing script...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate {CONTENT_TYPES.find(t => t.id === type)?.label}
                </>
              )}
            </button>

            {/* Examples */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Quick Start</label>
              <div className="space-y-1.5">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setTopic(ex.title); setPlatform(ex.platform); generate(ex.title); }}
                    className="w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white transition-all"
                  >
                    <Film className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{ex.title}</div>
                      <div className="text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                        <span>{ex.platform}</span>
                        <Clock className="w-2.5 h-2.5" />
                        <span>{ex.duration}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col overflow-y-auto" style={{ background: "var(--bg-primary)" }}>
          {output ? (
            <div className="p-6">
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:text-white prose-headings:font-bold prose-headings:mb-3
                prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed
                prose-strong:text-white prose-em:text-orange-300
                prose-ul:text-[var(--text-secondary)] prose-ol:text-[var(--text-secondary)]
                prose-li:marker:text-orange-400
                prose-hr:border-[var(--border)]
                prose-blockquote:border-l-orange-500 prose-blockquote:text-[var(--text-secondary)]
              ">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 mt-4 text-sm text-[var(--text-muted)]">
                  <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                  Writing...
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-900/40 to-amber-900/40 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-10 h-10 text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Create video content with AI</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
                  Generate professional scripts, storyboards, and hook ideas for any video platform.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
