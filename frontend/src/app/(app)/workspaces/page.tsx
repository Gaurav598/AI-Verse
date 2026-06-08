"use client";
import { useState, useEffect } from "react";
import { FolderOpen, Plus, Search, MoreVertical, Clock, Star, Users, Briefcase, FileCode2, Image as ImageIcon, MessageSquare } from "lucide-react";
import Link from "next/link";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function BookIcon(props: any) {
  return <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Zm0 0h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />;
}

export default function WorkspacesPage() {
  const [search, setSearch] = useState("");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      const token = localStorage.getItem('aiverse_token');
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/workspaces?populate=*`, {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = data.data.map((w: any) => ({
            id: w.id,
            name: w.attributes?.name || 'Untitled Workspace',
            description: w.attributes?.description || 'No description provided.',
            color: "bg-purple-500",
            icon: FolderOpen,
            items: 0,
            lastUpdated: new Date(w.attributes?.updatedAt || Date.now()).toLocaleDateString(),
            shared: false
          }));
          setWorkspaces(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch workspaces", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  const createWorkspace = async () => {
    const name = prompt("Enter workspace name:");
    if (!name) return;
    
    const token = localStorage.getItem('aiverse_token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/workspaces`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ data: { name, description: "New AI workspace" } })
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]" style={{ background: "var(--bg-secondary)" }}>
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Workspaces</h1>
          <p className="text-sm text-[var(--text-secondary)]">Organize your conversations, code, and media</p>
        </div>
        <button onClick={createWorkspace} className="btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" />
          New Workspace
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ai-input w-full pl-9 pr-4 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <select className="ai-input px-3 py-2 text-sm text-[var(--text-secondary)]">
                <option>Recently updated</option>
                <option>Name (A-Z)</option>
                <option>Most items</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="text-[var(--text-muted)] col-span-full">Loading workspaces...</div>
            ) : workspaces.length === 0 ? (
              <div className="text-[var(--text-muted)] col-span-full">No workspaces found. Create one to get started.</div>
            ) : (
              workspaces.filter(w => w.name.toLowerCase().includes(search.toLowerCase())).map((workspace) => (
              <div key={workspace.id} className="tool-card p-5 group">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", workspace.color)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <workspace.icon />
                    </svg>
                  </div>
                  <button className="p-1 rounded text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)] transition-all">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <Link href={`/workspaces/${workspace.id}`} className="block mb-4">
                  <h3 className="text-base font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">{workspace.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{workspace.description}</p>
                </Link>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <FolderOpen className="w-3.5 h-3.5" />
                      {workspace.items}
                    </div>
                    {workspace.shared && (
                      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Users className="w-3.5 h-3.5" />
                        Shared
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Clock className="w-3 h-3" />
                    {workspace.lastUpdated}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pinned Items / Quick Access */}
          <div className="mt-10">
            <h2 className="text-base font-semibold text-white mb-4">Pinned Items</h2>
            <div className="space-y-2">
              {[
                { icon: MessageSquare, color: "text-violet-400", title: "API Architecture Discussion", workspace: "Startup Development" },
                { icon: FileCode2, color: "text-cyan-400", title: "Authentication Service Code", workspace: "Startup Development" },
                { icon: ImageIcon, color: "text-pink-400", title: "Landing Page Hero Image", workspace: "Content Creation" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center border border-[var(--border)] flex-shrink-0">
                    <item.icon className={cn("w-4 h-4", item.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.title}</div>
                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" />
                      {item.workspace}
                    </div>
                  </div>
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
