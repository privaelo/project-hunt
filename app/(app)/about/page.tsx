"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-prose flex-col gap-20 px-6 pb-24 pt-20">
        {/* Hero */}
        <section className="space-y-6">
          <h1 className="text-6xl font-bold tracking-tight text-zinc-900">
            Tools built where the work happens
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Garden is a simple place for Honda associates to share and discover tools that make work easier. Post what you built, scripts, dashboards, Power Automate flows, Copilot prompt templates, CAD macros, templates, and more, so it doesn&apos;t get lost in chats and folders.
          </p>
        </section>

        {/* Origin */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-900">Why Garden exists</h2>
          <p className="text-lg text-zinc-600 leading-relaxed">
            I built Garden after watching useful scripts, dashboards, and quick fixes disappear into chats and personal folders. Great work was happening, but it was hard to find again, hard to share, and hard to learn from. Garden is a home for that work, so Honda associates can discover what exists, reuse it, and connect with the people building it.
          </p>
        </section>

        {/* Feedback */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-zinc-900">Feedback</h2>
          <p className="text-lg text-zinc-600 leading-relaxed">
            If you have ideas, issues, or requests, I&apos;d love to hear them. Email{" "}
            <a className="underline underline-offset-4" href="mailto:donovan_liao@na.honda.com">
              donovan_liao@na.honda.com
            </a>
            .
          </p>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center gap-4 pt-8 text-center">
          <h3 className="text-2xl font-semibold text-zinc-900">Have something to share?</h3>
          <p className="text-lg text-zinc-600">
            If it made work easier, it belongs here.
          </p>
          <Button size="lg" asChild className="mt-2">
            <Link href="/submit">Share what you built</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
