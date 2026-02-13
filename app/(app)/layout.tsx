'use client';

import { OnboardingGuard } from './OnboardingGuard';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Authenticated, Unauthenticated } from 'convex/react' 

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGuard>
      <Authenticated>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1">{children}</main>
        </SidebarProvider>
      </Authenticated>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <p className="max-w-xl text-xl font-semibold tracking-tight text-zinc-800 sm:text-2xl">
            Please sign in if you&apos;d like to peruse
          </p>
        </div>
      </Unauthenticated>
    </OnboardingGuard>
  );
}
