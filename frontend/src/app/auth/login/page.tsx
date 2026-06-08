"use client";
import Link from "next/link";
import { useState } from "react";
import { Sparkles, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/auth/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password })
      });
      const data = await res.json();
      if (data.jwt) {
        localStorage.setItem('aiverse_token', data.jwt);
        localStorage.setItem('aiverse_user', JSON.stringify(data.user));
        window.location.href = "/dashboard";
      } else {
        alert(data.error?.message || "Login failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
        <div className="orb orb-purple w-80 h-80 -top-20 -left-20 opacity-30" />
        <div className="orb orb-pink w-64 h-64 bottom-20 right-10 opacity-20" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AIverse</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-4">
              Your AI workspace<br />
              <span className="gradient-text">awaits</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-lg">
              Chat, code, create images, and produce video content — all in one unified platform.
            </p>
          </div>

          {/* Feature highlights */}
          {[
            "Unlimited AI conversations",
            "Code generation in 50+ languages",
            "AI image generation",
            "Video script & storyboard creation",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
              </div>
              <span className="text-[var(--text-secondary)] text-sm">{f}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-xs text-[var(--text-muted)]">
          Trusted by 150,000+ creators worldwide
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link href="/" className="flex items-center gap-2 justify-center mb-6 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">AIverse</span>
            </Link>
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-[var(--text-secondary)] mt-1">Sign in to your workspace</p>
          </div>

          {/* Social login */}
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm-1-13h2v6h-2Zm0 8h2v2h-2Z"/>
              </svg>
              Google
            </button>
            <button className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm-1-13h2v6h-2Zm0 8h2v2h-2Z"/>
              </svg>
              GitHub
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs text-[var(--text-muted)]" style={{ background: "var(--bg-primary)" }}>
                or continue with email
              </span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="ai-input w-full px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                Password
                <a href="#" className="text-purple-400 hover:text-purple-300 text-xs">Forgot password?</a>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="ai-input w-full px-4 py-3 text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-secondary)]">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-purple-400 hover:text-purple-300 font-medium">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
