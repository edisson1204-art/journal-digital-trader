"use client";

import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to Stripe Checkout flow
    console.log("Signup initiated", { email, name });
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo size="md" /></Link>
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-border-card rounded-card p-8 shadow-card">
          <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
            Start your free trial
          </h1>
          <p className="text-sm text-text-muted text-center mb-8">
            Join Trading Intelligence for{" "}
            <span className="text-green-primary font-semibold">$9/month</span>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-text-secondary mb-1.5">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-secondary mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors"
                placeholder="Min. 8 characters"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all shadow-green-glow text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-card"
            >
              Continue to Payment →
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-green-primary hover:underline">Log in</Link>
          </p>

          <p className="text-center text-[11px] text-text-muted mt-4">
            By signing up you agree to our{" "}
            <Link href="/terms" className="hover:text-text-secondary transition-colors">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="hover:text-text-secondary transition-colors">Privacy Policy</Link>.
          </p>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          🔒 Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
