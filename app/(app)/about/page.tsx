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
            Why I built Garden
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Garden started as a (slightly selfish) attempt to give my work a better spotlight than the endless void of giant Teams channels, but it didn&apos;t take long to realize I wasn&apos;t the only one who could benefit from a platform like this.
          </p>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Across Honda, people were building useful tools *often in parallel*, yet those scripts, dashboards, and automations rarely made it beyond a small circle.
          </p>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Garden is my attempt to fix that, even if just a little. It&apos;s a step toward making internal tools easier to discover, surfacing work that might be useful beyond the team it was built for, and bringing good ideas closer to the people who didn&apos;t even know they were looking for them.
          </p>
          <p className="text-xl text-zinc-600 leading-relaxed">
            But for me personally, I just want Garden to make creating things feel more fun, exciting, and worth sharing.
          </p>
          <p className="text-xl text-zinc-600 leading-relaxed">
            If you have ideas, issues, or requests, I&apos;d love to hear them. Email me: {" "}
            <a className="underline underline-offset-4" href="mailto:donovan_liao@na.honda.com">
              donovan_liao@na.honda.com
            </a>
            . Or ping me on Teams.
          </p>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center gap-4 pt-8 text-center">
          <h3 className="text-2xl font-semibold text-zinc-900">Have a tool to register?</h3>
          <Button size="lg" asChild className="mt-2">
            <Link href="/submit">Register a tool</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
