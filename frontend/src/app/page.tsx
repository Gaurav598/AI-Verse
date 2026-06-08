"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  MessageSquare, Code2, Image, Video, Zap, Shield, Globe,
  ArrowRight, ChevronRight, Star, Check, Menu, X,
  Sparkles, Brain, Layers, Terminal, Wand2, Play
} from "lucide-react";

// ── Utility ─────────────────────────────────────────────────────────────────
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Types ─────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Tools", href: "#tools" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

const TOOLS = [
  {
    id: "chat",
    icon: MessageSquare,
    label: "Chat",
    color: "from-violet-600 to-purple-600",
    glow: "rgba(139, 92, 246, 0.4)",
    description: "Engage in deep, context-aware conversations with our advanced AI. Ask anything, explore ideas, get instant answers.",
    features: ["Multi-turn conversations", "Context memory", "Custom personas", "Markdown support"],
    badge: "GPT-4 Level",
    href: "/chat",
  },
  {
    id: "code",
    icon: Code2,
    label: "Code",
    color: "from-cyan-600 to-blue-600",
    glow: "rgba(6, 182, 212, 0.4)",
    description: "Generate, debug, and explain code in 50+ programming languages. Your AI pair programmer that never gets tired.",
    features: ["50+ languages", "Bug detection", "Code review", "Documentation gen"],
    badge: "GPT-4 Level",
    href: "/code",
  },
  {
    id: "image",
    icon: Image,
    label: "Image",
    color: "from-pink-600 to-rose-600",
    glow: "rgba(236, 72, 153, 0.4)",
    description: "Transform text descriptions into stunning visual art. Create logos, illustrations, concepts, and more with AI.",
    features: ["Multiple art styles", "HD resolution", "Prompt enhancement", "Variations"],
    badge: "Gemini Pro Vision",
    href: "/image",
  },
  {
    id: "video",
    icon: Video,
    label: "Video",
    color: "from-orange-600 to-amber-600",
    glow: "rgba(249, 115, 22, 0.4)",
    description: "Create professional video scripts, storyboards, and production guides. AI-powered video pre-production.",
    features: ["Script writing", "Storyboarding", "Shot planning", "B-roll ideas"],
    badge: "Beta",
    href: "/video",
  },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Unified Intelligence",
    description: "One platform, multiple AI capabilities. Switch between chat, code, image and video without losing context.",
  },
  {
    icon: Layers,
    title: "Workspace Organization",
    description: "Organize everything in projects and workspaces. Pin important chats, tag outputs, and find anything instantly.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized inference pipeline with streaming responses. Get answers before you can blink.",
  },
  {
    icon: Shield,
    title: "Private by Default",
    description: "Your data, your rules. End-to-end encryption, zero data training on your conversations.",
  },
  {
    icon: Globe,
    title: "Works Everywhere",
    description: "Browser, desktop, mobile — AIverse follows you everywhere. Full feature parity across devices.",
  },
  {
    icon: Sparkles,
    title: "Prompt Library",
    description: "Save, share, and remix the most powerful prompts. Community library with 1000+ templates.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for exploring AI capabilities",
    features: ["50 AI messages/day", "Basic code generation", "5 image generations/day", "1 workspace", "Community prompts"],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For power users and professionals",
    features: ["Unlimited messages", "Advanced code gen", "100 images/day", "Unlimited workspaces", "Prompt library access", "Priority processing", "API access"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    description: "For teams building with AI",
    features: ["Everything in Pro", "5 team seats", "Shared workspaces", "Team prompt library", "Usage analytics", "Admin dashboard", "Priority support"],
    cta: "Contact Sales",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Arjun Sharma",
    role: "Senior Software Engineer",
    company: "Razorpay",
    avatar: "AS",
    text: "AIverse completely changed how I write code. The code tool understands context better than anything I've tried. 10x productivity isn't an exaggeration.",
    stars: 5,
  },
  {
    name: "Priya Mehta",
    role: "Product Designer",
    company: "Swiggy",
    avatar: "PM",
    text: "The image generation is insane. I prototype design concepts in minutes. The workspace feature helps me stay organized across 10+ ongoing projects.",
    stars: 5,
  },
  {
    name: "Rahul Verma",
    role: "Content Creator",
    company: "Independent",
    avatar: "RV",
    text: "From script writing to thumbnail concepts — AIverse is the only tool I need. The video module alone saves me 6+ hours every week.",
    stars: 5,
  },
];

const STATS = [
  { value: "2M+", label: "AI Interactions Daily" },
  { value: "150K+", label: "Active Creators" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "< 800ms", label: "Avg Response Time" },
];

// ── Components ────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled ? "glass border-b border-[var(--border)]" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/40 transition-shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">AIverse</span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/auth/signup" className="btn-primary text-sm py-2 px-4">
            Get Started Free
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-[var(--border)] p-4 space-y-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block px-4 py-2 text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-white/5"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-2">
            <Link href="/auth/login" className="btn-secondary text-sm text-center">Sign in</Link>
            <Link href="/auth/signup" className="btn-primary text-sm text-center">Get Started Free</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  const [typedText, setTypedText] = useState("");
  const phrases = ["Generate stunning visuals.", "Write production code.", "Chat with AI.", "Create video scripts."];
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[phraseIdx];
    const speed = deleting ? 40 : 80;
    const pause = deleting && charIdx === 0 ? 400 : charIdx === phrase.length ? 1500 : 0;

    const timer = setTimeout(() => {
      if (deleting) {
        if (charIdx > 0) {
          setTypedText(phrase.slice(0, charIdx - 1));
          setCharIdx(charIdx - 1);
        } else {
          setDeleting(false);
          setPhraseIdx((phraseIdx + 1) % phrases.length);
        }
      } else {
        if (charIdx < phrase.length) {
          setTypedText(phrase.slice(0, charIdx + 1));
          setCharIdx(charIdx + 1);
        } else {
          setDeleting(true);
        }
      }
    }, pause || speed);

    return () => clearTimeout(timer);
  }, [charIdx, deleting, phraseIdx]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background orbs */}
      <div className="orb orb-purple w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
      <div className="orb orb-pink w-[400px] h-[400px] top-1/4 right-1/4 opacity-20" />
      <div className="orb orb-blue w-[300px] h-[300px] bottom-1/4 left-1/4 opacity-15" />

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-purple-500/30 text-purple-400 text-sm mb-8 animate-pulse-glow">
          <Zap className="w-3.5 h-3.5" />
          <span>Powered by Gemini 1.5 Pro · GPT-4 · DALL-E 3</span>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
          One Workspace.<br />
          <span className="gradient-text">Infinite Possibilities.</span>
        </h1>

        {/* Typewriter subtitle */}
        <p className="text-2xl md:text-3xl text-[var(--text-secondary)] mb-4 h-10">
          <span className="text-white font-medium">{typedText}</span>
          <span className="inline-block w-0.5 h-7 bg-purple-400 ml-1 animate-pulse align-middle" />
        </p>

        <p className="text-lg text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto">
          AIverse unifies chat, code, image, and video AI tools in a single elegant workspace.
          Stop switching between 5 different apps. Start creating.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="btn-primary flex items-center gap-2 text-base px-8 py-3.5 rounded-xl"
          >
            <span>Launch AIverse</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#tools"
            className="btn-secondary flex items-center gap-2 text-base px-8 py-3.5 rounded-xl"
          >
            <Play className="w-4 h-4 text-purple-400" />
            <span>See it in action</span>
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex items-center justify-center gap-6 text-sm text-[var(--text-secondary)]">
          <div className="flex -space-x-2">
            {["A", "B", "C", "D", "E"].map((l, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center text-xs font-bold"
                style={{ background: `hsl(${(i * 60 + 240) % 360}, 60%, 50%)` }}
              >
                {l}
              </div>
            ))}
          </div>
          <span>Loved by <strong className="text-white">150,000+</strong> creators</span>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
            <span className="text-white font-semibold ml-1">4.9/5</span>
          </div>
        </div>
      </div>

      {/* Hero preview card */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent z-10" />
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-16 border-y border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-[var(--text-secondary)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ToolsSection() {
  const [active, setActive] = useState("chat");
  const tool = TOOLS.find(t => t.id === active)!;

  return (
    <section id="tools" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Four Powerful Tools</p>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            Everything you need,<br />
            <span className="gradient-text">in one place</span>
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            Stop juggling between ChatGPT, GitHub Copilot, Midjourney, and Runway. AIverse brings it all together.
          </p>
        </div>

        {/* Tool tabs */}
        <div className="flex justify-center gap-3 mb-12 flex-wrap">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  active === t.id
                    ? `bg-gradient-to-r ${t.color} text-white shadow-lg`
                    : "glass text-[var(--text-secondary)] hover:text-white border border-[var(--border)]"
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tool showcase */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Details */}
          <div className="space-y-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white"
              style={{ background: `linear-gradient(135deg, ${tool.glow.replace('0.4', '1')})` }}
            >
              <tool.icon className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium glass border border-[var(--border)] text-[var(--text-secondary)] mb-3">
                {tool.badge}
              </div>
              <h3 className="text-3xl font-bold mb-3 text-white">{tool.label} AI</h3>
              <p className="text-[var(--text-secondary)] text-lg leading-relaxed">{tool.description}</p>
            </div>

            <ul className="space-y-3">
              {tool.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-purple-400" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={tool.href}
              className={cn("btn-primary inline-flex items-center gap-2 bg-gradient-to-r", tool.color)}
            >
              Try {tool.label} AI
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mock UI preview */}
          <div className="tool-card p-1 rounded-2xl" style={{ boxShadow: `0 0 60px ${tool.glow}` }}>
            <div className="rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1 mx-4 h-6 rounded glass border border-[var(--border)] flex items-center px-3">
                  <span className="text-xs text-[var(--text-muted)]">aiverse.app/{tool.id}</span>
                </div>
              </div>

              {/* Mock content */}
              <ToolMockup toolId={active} color={tool.color} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolMockup({ toolId, color }: { toolId: string; color: string }) {
  if (toolId === "chat") {
    return (
      <div className="p-6 space-y-4 min-h-[380px]">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center text-xs font-bold">U</div>
          <div className="flex-1">
            <div className="message-user inline-block px-4 py-2.5 text-sm text-white">
              Explain the difference between REST and GraphQL
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="message-ai px-4 py-3 text-sm text-[var(--text-secondary)] flex-1">
            <p className="text-white font-medium mb-2">REST vs GraphQL — Key Differences</p>
            <p className="mb-2"><strong className="text-purple-400">REST</strong> uses multiple endpoints, each returning fixed data structures. Great for simple CRUD operations.</p>
            <p><strong className="text-purple-400">GraphQL</strong> uses a single endpoint where clients specify exactly what data they need, eliminating over/under-fetching...</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] mt-auto">
          <input className="flex-1 bg-transparent text-sm text-[var(--text-secondary)] outline-none" placeholder="Ask anything..." readOnly />
          <button className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  if (toolId === "code") {
    return (
      <div className="p-6 min-h-[380px]">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-[var(--text-secondary)]">Generate a binary search function in TypeScript</span>
        </div>
        <div className="code-block p-4 text-xs font-mono">
          <div className="text-[var(--text-muted)] mb-2">// TypeScript · Binary Search</div>
          <div><span className="text-blue-400">function</span> <span className="text-yellow-300">binarySearch</span>(<span className="text-orange-400">arr</span>: <span className="text-green-400">number</span>[], <span className="text-orange-400">target</span>: <span className="text-green-400">number</span>): <span className="text-green-400">number</span> {"{"}</div>
          <div className="pl-4"><span className="text-blue-400">let</span> left = <span className="text-purple-400">0</span>, right = arr.length - <span className="text-purple-400">1</span>;</div>
          <div className="pl-4"><span className="text-blue-400">while</span> (left &lt;= right) {"{"}</div>
          <div className="pl-8"><span className="text-blue-400">const</span> mid = Math.<span className="text-yellow-300">floor</span>((left + right) / <span className="text-purple-400">2</span>);</div>
          <div className="pl-8"><span className="text-blue-400">if</span> (arr[mid] === target) <span className="text-blue-400">return</span> mid;</div>
          <div className="pl-8">arr[mid] &lt; target ? left = mid + <span className="text-purple-400">1</span> : right = mid - <span className="text-purple-400">1</span>;</div>
          <div className="pl-4">{"}"}</div>
          <div className="pl-4"><span className="text-blue-400">return</span> -<span className="text-purple-400">1</span>;</div>
          <div>{"}"}</div>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="btn-secondary text-xs py-1.5 px-3">Copy</button>
          <button className="btn-secondary text-xs py-1.5 px-3">Explain</button>
          <button className="btn-secondary text-xs py-1.5 px-3">Add tests</button>
        </div>
      </div>
    );
  }

  if (toolId === "image") {
    return (
      <div className="p-6 min-h-[380px]">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          <span className="text-[var(--text-muted)]">Prompt: </span>
          A futuristic cyberpunk city at night, neon lights reflecting on wet streets, ultra-detailed, 8K
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className="aspect-square rounded-xl flex items-center justify-center text-xs text-[var(--text-muted)]"
              style={{
                background: `linear-gradient(${135 + i * 45}deg, hsl(${280 + i*20}, 60%, 15%), hsl(${320 + i * 10}, 50%, 10%))`,
                border: "1px solid var(--border)"
              }}
            >
              <div className="text-center">
                <Image className="w-8 h-8 mx-auto mb-1 opacity-30" />
                <span>Generated</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-[380px] space-y-3">
      <p className="text-sm text-[var(--text-secondary)]">
        <span className="text-[var(--text-muted)]">Topic: </span>
        Product launch video for an AI startup
      </p>
      {["Scene 1 — Opening Hook", "Scene 2 — Problem Statement", "Scene 3 — Solution Demo", "Scene 4 — CTA"].map((scene, i) => (
        <div key={i} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] flex items-start gap-3">
          <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center text-xs text-orange-400 flex-shrink-0 mt-0.5">
            {i + 1}
          </div>
          <div>
            <div className="text-sm font-medium text-white mb-1">{scene}</div>
            <div className="text-xs text-[var(--text-muted)]">Duration: {[3,5,8,4][i]}s · Visual: B-roll suggested</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Platform Features</p>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            Built for the way<br />
            <span className="gradient-text">professionals work</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="tool-card p-6 group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <f.icon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4">
            Loved by <span className="gradient-text">150,000+ creators</span>
          </h2>
          <p className="text-[var(--text-secondary)]">Real people, real results.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="tool-card p-6">
              <div className="flex items-center gap-1 mb-4">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: `hsl(${t.name.charCodeAt(0) * 5 % 360}, 60%, 45%)` }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{t.role} · {t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            Simple, <span className="gradient-text">transparent pricing</span>
          </h2>
          <p className="text-[var(--text-secondary)]">Start free, scale as you grow. Cancel anytime.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "rounded-2xl p-6 flex flex-col relative",
                plan.highlight
                  ? "bg-gradient-to-b from-purple-900/60 to-[var(--bg-card)] border-2 border-purple-500 shadow-2xl shadow-purple-500/20"
                  : "tool-card"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-purple-500 text-white text-xs font-bold">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-[var(--text-secondary)]">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <Check className={cn("w-4 h-4 flex-shrink-0", plan.highlight ? "text-purple-400" : "text-[var(--text-muted)]")} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signup"
                className={cn(
                  "block text-center py-3 rounded-xl font-semibold text-sm transition-all",
                  plan.highlight
                    ? "btn-primary"
                    : "btn-secondary"
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="orb orb-purple w-[800px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-extrabold mb-6">
          Ready to enter<br />
          <span className="gradient-text">the AI-verse?</span>
        </h2>
        <p className="text-xl text-[var(--text-secondary)] mb-10">
          Join 150,000+ creators who are building faster, thinking bigger, and creating more with AIverse.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/signup" className="btn-primary flex items-center gap-2 text-base px-8 py-4 rounded-xl">
            <Sparkles className="w-5 h-5" />
            Start for Free
          </Link>
          <Link href="/dashboard" className="btn-secondary text-base px-8 py-4 rounded-xl">
            Explore the Dashboard
          </Link>
        </div>
        <p className="mt-6 text-sm text-[var(--text-muted)]">
          No credit card required · Free plan forever · Cancel anytime
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">AIverse</span>
            </Link>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
              Your unified multi-modal AI workspace. Chat, code, create images, and produce video content — all in one place.
            </p>
          </div>

          {[
            { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
            { title: "Tools", links: ["Chat AI", "Code AI", "Image AI", "Video AI"] },
            { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--border)] pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <span>© 2026 AIverse. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Navbar />
      <HeroSection />
      <StatsSection />
      <ToolsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
