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
            Where builders share what they&apos;re making
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Garden is a simple, social place for Honda associates to share and discover tools that make work easier. Post what you built, scripts, dashboards, Power Automate flows, Copilot prompt templates, CAD macros, templates, and more, so it doesn&apos;t get lost in chats and folders.
          </p>
        </section>

        {/* Origin */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-900">Why Garden exists</h2>
          <p className="text-lg text-zinc-600 leading-relaxed">
            I built Garden after watching helpful scripts, dashboards, and quick fixes disappear into chats and personal folders. Great work was happening, but sharing it felt like a chore. Valuable creations got buried in threads, hard to find, easy to forget. I wanted to create a space where sharing is fun, browsing is interesting/useful, and good work gets the attention it deserves.
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
            . Or dm me on Teams.
          </p>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center gap-4 pt-8 text-center">
          <h3 className="text-2xl font-semibold text-zinc-900">Have something to share?</h3>
          <p className="text-lg text-zinc-600">
            If you built it, it belongs here.
          </p>
          <Button size="lg" asChild className="mt-2">
            <Link href="/submit">Share what you&apos;re working on</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
