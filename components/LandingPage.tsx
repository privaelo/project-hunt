"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowUp, Users2, Sparkles, Share2, Zap } from "lucide-react";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReadinessStatus } from "@/lib/types";

const MOCK_PROJECTS: {
  name: string;
  space: string;
  spaceIcon: string;
  readiness: ReadinessStatus;
  upvotes: number;
  adopters: number;
  summary: string;
}[] = [
  {
    name: "Automated Email Routing for Approvals",
    space: "Power Automate",
    spaceIcon: "⚡",
    readiness: "ready_to_use",
    upvotes: 24,
    adopters: 12,
    summary:
      "Routes approval requests from a shared mailbox to the right person based on rules — no more manual forwarding.",
  },
  {
    name: "Excel Parts Tracker with Live Status",
    space: "Excel Scripts",
    spaceIcon: "📊",
    readiness: "mostly_working",
    upvotes: 18,
    adopters: 8,
    summary:
      "Pulls live inventory data into Excel and colour-codes parts by status. Originally built for one line, now used by three.",
  },
  {
    name: "Copilot Prompt Pack — Meeting Summaries",
    space: "Copilot",
    spaceIcon: "✨",
    readiness: "ready_to_use",
    upvotes: 31,
    adopters: 19,
    summary:
      "A collection of tested prompts for turning long Teams call transcripts into concise action-item summaries.",
  },
  {
    name: "Department OKR Tracker Dashboard",
    space: "Dashboards",
    spaceIcon: "📈",
    readiness: "mostly_working",
    upvotes: 11,
    adopters: 5,
    summary:
      "A Power BI template for tracking team OKRs with drill-down by quarter. Adapt the data model to your department.",
  },
];

export function LandingPage() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
        {/* Hero */}
        <section className="flex flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28">
          <div className="mb-6 flex flex-col items-center gap-3">
            <span
              className="text-4xl font-semibold text-emerald-700 sm:text-5xl"
              style={{ fontFamily: "var(--font-chonburi)" }}
            >
              Garden
            </span>
            <Image
              src="/TTGFullLogo.png"
              alt="Tech Tribes Global"
              width={140}
              height={28}
              priority
              className="opacity-75"
            />
          </div>

          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Share your solutions
          </h1>
          <p className="mt-4 max-w-xl text-base text-zinc-500 sm:text-lg">
          Garden helps you discover and share the tools and solutions being made across teams, because great work shouldn't stay hidden.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-up">Sign Up</Link>
            </Button>
          </div>
        </section>

        {/* Preview cards */}
        <section className="mx-auto max-w-4xl px-6 pb-20">
          <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-zinc-400">
            Example of what's inside
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MOCK_PROJECTS.map((project) => (
              <div
                key={project.name}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                {/* Space badge + readiness */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                    <span aria-hidden>{project.spaceIcon}</span>
                    {project.space}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <ReadinessBadge status={project.readiness} />
                  </div>
                </div>

                {/* Name */}
                <p className="text-sm font-semibold leading-snug text-zinc-900">
                  {project.name}
                </p>

                {/* Summary */}
                <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500">
                  {project.summary}
                </p>

                {/* Stats */}
                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <ArrowUp className="h-3.5 w-3.5" />
                    {project.upvotes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users2 className="h-3.5 w-3.5" />
                    {project.adopters} using this
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </TooltipProvider>
  );
}
