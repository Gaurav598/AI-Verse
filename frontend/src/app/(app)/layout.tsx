"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MessageSquare, Code2, Image, Video, LayoutDashboard,
  Sparkles, Settings, User, ChevronLeft, ChevronRight,
  Plus, Search, Bell, LogOut, FolderOpen, BookOpen,
  Zap, Clock, Star
} from "lucide-react";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const SIDEBAR_TOOLS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", color: "text-slate-400" },
  { icon: MessageSquare, label: "Chat", href: "/chat", color: "text-violet-400" },
  { icon: Code2, label: "Code", href: "/code", color: "text-cyan-400" },
  { icon: Image, label: "Image", href: "/image", color: "text-pink-400" },
  { icon: Video, label: "Video", href: "/video", color: "text-orange-400" },
];

const SIDEBAR_BOTTOM = [
  { icon: FolderOpen, label: "Workspaces", href: "/workspaces" },
  { icon: BookOpen, label: "Prompts", href: "/prompts" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-[var(--border)] transition-all duration-300 relative z-10",
          collapsed ? "w-16" : "w-60"
        )}
        style={{ background: "var(--bg-secondary)" }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-[var(--border)] flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-base font-bold gradient-text truncate">AIverse</span>
            )}
          </Link>
        </div>

        {/* New Conversation button */}
        {!collapsed && (
          <div className="p-3 border-b border-[var(--border)]">
            <Link
              href="/chat"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </Link>
          </div>
        )}

        {/* Tools nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {collapsed && (
            <div className="mb-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="w-full flex items-center justify-center p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {SIDEBAR_TOOLS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "sidebar-item flex items-center gap-3 px-3 py-2.5",
                  active ? "active" : ""
                )}
              >
                <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-purple-400" : item.color)} />
                {!collapsed && (
                  <span className={cn("text-sm font-medium", active ? "text-white" : "text-[var(--text-secondary)]")}>
                    {item.label}
                  </span>
                )}
                {!collapsed && active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />
                )}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-2 border-t border-[var(--border)]" />

          {/* Recent conversations */}
          {!collapsed && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Recent
              </div>
              {[
                { label: "Build a REST API in Node.js", tool: "code", time: "2m ago" },
                { label: "Logo for AI startup", tool: "image", time: "1h ago" },
                { label: "Explain quantum computing", tool: "chat", time: "3h ago" },
              ].map((item, i) => (
                <button
                  key={i}
                  className="w-full sidebar-item flex items-center gap-2 px-3 py-2 text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                  <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{item.label}</span>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{item.time}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        {/* Bottom nav */}
        <div className="p-2 border-t border-[var(--border)] space-y-0.5">
          {SIDEBAR_BOTTOM.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "sidebar-item flex items-center gap-3 px-3 py-2.5",
                pathname === item.href ? "active" : ""
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]" />
              {!collapsed && (
                <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
              )}
            </Link>
          ))}

          {/* User avatar */}
          <div className={cn("flex items-center gap-2 px-3 py-2 mt-1 rounded-lg", collapsed ? "justify-center" : "")}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
              G
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">Gaurav</div>
                <div className="text-xs text-[var(--text-muted)] truncate">Pro plan</div>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors z-20"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border)] flex-shrink-0" style={{ background: "var(--bg-secondary)" }}>
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-secondary)] cursor-text min-w-[280px]">
              <Search className="w-3.5 h-3.5" />
              <span>Search conversations, prompts...</span>
              <kbd className="ml-auto text-xs bg-[var(--border)] px-1.5 py-0.5 rounded">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">Pro</span>
            </div>
            <button className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all">
              <Bell className="w-4 h-4" />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500" />
            </button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
              G
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
