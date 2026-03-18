"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowBigUp, Users2, Share2, BookMarked, TrendingUp } from "lucide-react";
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
  {
    name: "Slack Bot for IT Ticket Triage",
    space: "Integrations",
    spaceIcon: "🔗",
    readiness: "ready_to_use",
    upvotes: 22,
    adopters: 15,
    summary:
      "Posts new ServiceNow tickets to the right Slack channel and pings the on-call engineer automatically.",
  },
  {
    name: "Onboarding Checklist Automation",
    space: "HR Tools",
    spaceIcon: "📋",
    readiness: "ready_to_use",
    upvotes: 14,
    adopters: 9,
    summary:
      "Assigns tasks to manager, IT, and new hire on day one via SharePoint. No manual handoffs needed.",
  },
  {
    name: "Python Script: Invoice Data Extractor",
    space: "Python",
    spaceIcon: "🐍",
    readiness: "early_prototype",
    upvotes: 9,
    adopters: 3,
    summary:
      "Reads PDF invoices and outputs a structured CSV. Handles most common supplier formats with minimal config.",
  },
];

export function LandingPage() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white">
        {/* Hero — dark with emerald glow */}
        <section className="relative overflow-hidden bg-zinc-950 px-6 pb-28 pt-24 text-center sm:pt-36">
          {/* Ambient glow blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-[480px] w-[640px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-emerald-600/8 blur-2xl" />
            <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-zinc-800/60 blur-2xl" />
          </div>

          <div className="relative">
            {/* Headline — kept exactly as-is */}
            <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Honda&apos;s catalog of internal digital tools
            </h1>

            {/* Sub-headline */}
            <p className="mx-auto mt-5 max-w-lg text-lg text-zinc-400 sm:text-xl">
              Find what already exists. Share what you&apos;ve built.
            </p>

            {/* CTA */}
            <div className="mt-10 flex justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-white px-8 text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Link
                  href="/sign-in"
                  aria-label="Continue with Microsoft"
                  className="flex items-center gap-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-5 w-5 grid-cols-2 gap-[2px] rounded-[2px]"
                  >
                    <span className="bg-[#f25022]" />
                    <span className="bg-[#7fba00]" />
                    <span className="bg-[#00a4ef]" />
                    <span className="bg-[#ffb900]" />
                  </span>
                  <span className="font-medium">Continue with Microsoft</span>
                </Link>
              </Button>
            </div>

            {/* Feature highlights */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-500">
              <span className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-emerald-500" />
                Register tools your team has built
              </span>
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Surface what&apos;s worth adopting
              </span>
              <span className="flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-emerald-500" />
                Browse by category across the org
              </span>
            </div>
          </div>
        </section>

        {/* Preview cards — auto-scrolling marquee */}
        <section className="overflow-hidden bg-zinc-50 py-20">
          <style>{`
            @keyframes marquee {
              from { transform: translateX(0); }
              to   { transform: translateX(-50%); }
            }
            .marquee-track {
              animation: marquee 40s linear infinite;
              will-change: transform;
            }
            .marquee-track:hover {
              animation-play-state: paused;
            }
          `}</style>

          <h2 className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Examples of what&apos;s in the catalog (not real entries)
          </h2>

          <div className="relative">
            {/* Fade masks */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-zinc-50 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-zinc-50 to-transparent" />

            {/* Scrolling track — items duplicated for seamless loop */}
            <div className="marquee-track flex gap-4 px-4" style={{ width: "max-content" }}>
              {[...MOCK_PROJECTS, ...MOCK_PROJECTS].map((project, i) => (
                <div
                  key={i}
                  className="group w-72 flex-none rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:shadow-md"
                >
                  {/* Space badge + readiness */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                      <span aria-hidden>{project.spaceIcon}</span>
                      {project.space}
                    </span>
                    <ReadinessBadge status={project.readiness} />
                  </div>

                  {/* Name */}
                  <p className="text-sm font-semibold leading-snug text-zinc-900 transition-colors duration-200 group-hover:text-emerald-700">
                    {project.name}
                  </p>

                  {/* Summary */}
                  <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500">
                    {project.summary}
                  </p>

                  {/* Stats */}
                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <ArrowBigUp className="h-3.5 w-3.5" fill="none" />
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
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
