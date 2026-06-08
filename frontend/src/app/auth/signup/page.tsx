"use client";
import Link from "next/link";
import { useState } from "react";
import { Sparkles, Eye, EyeOff, ArrowRight, Check } from "lucide-react";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const username = `${firstName} ${lastName}`.trim() || email.split("@")[0];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}/api/auth/local/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (data.jwt) {
        localStorage.setItem('aiverse_token', data.jwt);
        localStorage.setItem('aiverse_user', JSON.stringify(data.user));
        window.location.href = "/dashboard";
      } else {
        alert(data.error?.message || "Registration failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--bg-primary)" }}>
      <div className="orb orb-purple w-96 h-96 top-0 right-0 opacity-20" />
      <div className="orb orb-pink w-72 h-72 bottom-0 left-0 opacity-15" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center gap-2 justify-center mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AIverse</span>
          </Link>
          <h2 className="text-2xl font-bold text-white">Create your account</h2>
          <p className="text-[var(--text-secondary)] mt-1">Start your free AI workspace today</p>
        </div>

        <div className="tool-card p-8 space-y-6">
          {/* Social */}
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
              <span className="px-4 text-xs text-[var(--text-muted)]" style={{ background: "var(--bg-card)" }}>
                or sign up with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">First name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Gaurav" required className="ai-input w-full px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">Last name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Sharma" className="ai-input w-full px-4 py-3 text-sm" />
              </div>
            </div>

            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="ai-input w-full px-4 py-3 text-sm" />
            </div>

            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  minLength={8}
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

            <div className="flex items-start gap-2">
              <input type="checkbox" id="terms" required className="mt-1 w-4 h-4 rounded border-[var(--border)] accent-purple-600" />
              <label htmlFor="terms" className="text-xs text-[var(--text-secondary)] leading-relaxed">
                I agree to the{" "}
                <a href="#" className="text-purple-400 hover:underline">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-purple-400 hover:underline">Privacy Policy</a>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Free Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Free plan highlights */}
          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
            {["Free plan includes 50 messages/day", "No credit card required", "Upgrade anytime"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
