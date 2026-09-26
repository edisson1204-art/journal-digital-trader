"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to auth provider
    console.log("Login initiated", { email });
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo size="md" /></Link>
        </div>

        <div className="bg-bg-card border border-border-card rounded-card p-8 shadow-card">
          <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-text-muted text-center mb-8">
            Log in to your Trading Intelligence account
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors"
                placeholder="Your password"
              />
            </div>

            <div className="flex justify-end">
              <Link href="#" className="text-xs text-text-muted hover:text-green-primary transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all shadow-green-glow text-sm focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-card"
            >
              Log In
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-green-primary hover:underline">Start for $9/month</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
