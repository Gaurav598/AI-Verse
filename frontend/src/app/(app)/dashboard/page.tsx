"use client";
import Link from "next/link";
import { MessageSquare, Code2, Image, Video, ArrowRight, TrendingUp, Zap, Clock, Plus, Star, Activity } from "lucide-react";

const TOOLS = [
  {
    icon: MessageSquare,
    label: "Chat AI",
    description: "Have intelligent conversations with advanced AI",
    href: "/chat",
    color: "from-violet-600 to-purple-600",
    glow: "rgba(139, 92, 246, 0.2)",
    stats: "Unlimited",
    badge: "Most Used",
  },
  {
    icon: Code2,
    label: "Code AI",
    description: "Generate, debug, and explain code in any language",
    href: "/code",
    color: "from-cyan-600 to-blue-600",
    glow: "rgba(6, 182, 212, 0.2)",
    stats: "50+ langs",
    badge: "Popular",
  },
  {
    icon: Image,
    label: "Image AI",
    description: "Transform text into stunning visual art and designs",
    href: "/image",
    color: "from-pink-600 to-rose-600",
    glow: "rgba(236, 72, 153, 0.2)",
    stats: "HD Output",
    badge: "New",
  },
  {
    icon: Video,
    label: "Video AI",
    description: "Create scripts, storyboards and video production guides",
    href: "/video",
    color: "from-orange-600 to-amber-600",
    glow: "rgba(249, 115, 22, 0.2)",
    stats: "Pro Feature",
    badge: "Beta",
  },
];

const RECENT_ACTIVITY = [
  { tool: "chat", title: "Explain transformer architecture", time: "2 minutes ago", icon: MessageSquare, color: "text-violet-400" },
  { tool: "code", title: "Build a binary search function", time: "1 hour ago", icon: Code2, color: "text-cyan-400" },
  { tool: "image", title: "Cyberpunk city at night, neon lights", time: "3 hours ago", icon: Image, color: "text-pink-400" },
  { tool: "chat", title: "Write a product requirements doc", time: "Yesterday", icon: MessageSquare, color: "text-violet-400" },
  { tool: "video", title: "Product launch video script", time: "Yesterday", icon: Video, color: "text-orange-400" },
];

const USAGE_STATS = [
  { label: "Conversations Today", value: "23", change: "+12%", up: true },
  { label: "Images Generated", value: "8", change: "+5%", up: true },
  { label: "Code Snippets", value: "15", change: "+33%", up: true },
  { label: "Tokens Used", value: "142K", change: "-8%", up: false },
];

const PROMPT_TEMPLATES = [
  { title: "Debug my code", tool: "code", icon: Code2, color: "text-cyan-400" },
  { title: "Explain like I'm 5", tool: "chat", icon: MessageSquare, color: "text-violet-400" },
  { title: "Generate logo concepts", tool: "image", icon: Image, color: "text-pink-400" },
  { title: "Write a YouTube script", tool: "video", icon: Video, color: "text-orange-400" },
  { title: "Code review checklist", tool: "code", icon: Code2, color: "text-cyan-400" },
  { title: "Brainstorm startup ideas", tool: "chat", icon: MessageSquare, color: "text-violet-400" },
];

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Good morning, Gaurav 👋</h1>
          <p className="text-[var(--text-secondary)] text-sm">You have <span className="text-purple-400 font-medium">5 active workspaces</span> and <span className="text-purple-400 font-medium">23 conversations</span> this week.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/chat" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            New Conversation
          </Link>
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {USAGE_STATS.map((stat) => (
          <div key={stat.label} className="tool-card p-4">
            <div className="text-xs text-[var(--text-muted)] mb-2">{stat.label}</div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className={`text-xs font-medium flex items-center gap-1 ${stat.up ? "text-green-400" : "text-red-400"}`}>
              <TrendingUp className={`w-3 h-3 ${!stat.up ? "rotate-180" : ""}`} />
              {stat.change} vs last week
            </div>
          </div>
        ))}
      </div>

      {/* AI Tools grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">AI Tools</h2>
          <span className="text-xs text-[var(--text-muted)]">Powered by Gemini Pro</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <div
                className="tool-card p-5 h-full group cursor-pointer"
                style={{ ["--glow" as string]: tool.glow }}
              >
                {/* Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg`}>
                    <tool.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full glass border border-[var(--border)] text-[var(--text-muted)]">
                    {tool.badge}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white mb-1">{tool.label}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{tool.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">{tool.stats}</span>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two column: Recent + Quick prompts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="tool-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
            <h3 className="text-base font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center flex-shrink-0">
                  <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-secondary)] truncate group-hover:text-white transition-colors">
                    {item.title}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{item.time}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick prompt templates */}
        <div className="tool-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-[var(--text-muted)]" />
            <h3 className="text-base font-semibold text-white">Quick Prompts</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PROMPT_TEMPLATES.map((prompt, i) => (
              <Link
                key={i}
                href={`/${prompt.tool}`}
                className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border)] transition-all group"
              >
                <prompt.icon className={`w-4 h-4 ${prompt.color} flex-shrink-0`} />
                <span className="text-xs text-[var(--text-secondary)] group-hover:text-white transition-colors leading-tight">
                  {prompt.title}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <Link href="/prompts" className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <Star className="w-4 h-4" />
              Browse prompt library →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-purple-900/40 to-violet-900/20 border border-purple-500/20">
        <div className="orb orb-purple w-48 h-48 -right-10 -top-10 opacity-20 absolute" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Pro Tip</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Use workspaces to organize your projects</h3>
            <p className="text-sm text-[var(--text-secondary)]">Group related conversations, images, and code snippets together for easy access.</p>
          </div>
          <Link href="/workspaces" className="btn-primary flex-shrink-0 ml-4 text-sm">
            Create Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
