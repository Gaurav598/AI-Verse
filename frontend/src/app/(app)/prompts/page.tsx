"use client";
import { useState, useEffect } from "react";
import { BookOpen, Search, Plus, Code2, MessageSquare, Image as ImageIcon, Video, Copy, Star, Play, Check } from "lucide-react";
import Link from "next/link";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const CATEGORIES = ["All", "Chat", "Code", "Image", "Video"];



export default function PromptsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrompts = async () => {
      const token = localStorage.getItem('aiverse_token');
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/prompts`, {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = data.data.map((p: any) => ({
            id: p.id,
            title: p.attributes?.title || 'Untitled Prompt',
            description: p.attributes?.description || '',
            tool: p.attributes?.tool || 'Chat',
            icon: MessageSquare, // mapping logic can be expanded
            color: "text-violet-400",
            bgColor: "bg-violet-500/10",
            content: p.attributes?.content || '',
            uses: p.attributes?.uses || 0
          }));
          setPrompts(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch prompts", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, []);

  const createPrompt = async () => {
    const title = prompt("Enter prompt title:");
    const content = prompt("Enter prompt content:");
    if (!title || !content) return;
    
    const token = localStorage.getItem('aiverse_token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/prompts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ data: { title, content, tool: "Chat", description: "Custom prompt" } })
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPrompts = prompts.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.tool === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = async (id: number, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]" style={{ background: "var(--bg-secondary)" }}>
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Prompt Library</h1>
          <p className="text-sm text-[var(--text-secondary)]">Save, discover, and reuse powerful AI instructions</p>
        </div>
        <button onClick={createPrompt} className="btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" />
          Create Prompt
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    activeCategory === cat
                      ? "bg-purple-600 text-white"
                      : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--text-muted)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-72 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ai-input w-full pl-9 pr-4 py-2 text-sm rounded-full"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {isLoading ? (
              <div className="text-[var(--text-muted)] col-span-full">Loading prompts...</div>
            ) : filteredPrompts.map((prompt) => (
              <div key={prompt.id} className="tool-card flex flex-col group">
                <div className="p-5 flex-1 border-b border-[var(--border)]">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-semibold", prompt.bgColor, prompt.color)}>
                      <prompt.icon className="w-3 h-3" />
                      {prompt.tool}
                    </div>
                    <button className="text-[var(--text-muted)] hover:text-yellow-400 transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">{prompt.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">{prompt.description}</p>
                  
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--bg-card)] pointer-events-none" />
                    <p className="text-xs font-mono text-[var(--text-muted)] line-clamp-3 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                      {prompt.content}
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-[var(--bg-secondary)] flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">{prompt.uses.toLocaleString()} uses</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(prompt.id, prompt.content)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-secondary text-xs"
                    >
                      {copiedId === prompt.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === prompt.id ? "Copied" : "Copy"}
                    </button>
                    <Link
                      href={`/${prompt.tool.toLowerCase()}?prompt=${encodeURIComponent(prompt.content)}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-primary text-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredPrompts.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No prompts found</h3>
              <p className="text-sm text-[var(--text-secondary)]">Try adjusting your search or category filter</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
