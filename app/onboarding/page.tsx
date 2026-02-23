'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexAuth } from 'convex/react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.users.currentWithFocusAreas);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);
  const [userIntent, setUserIntent] = useState<'looking' | 'sharing' | 'both' | null>(null);

  // Update state when user data loads (only once)
  useEffect(() => {
    if (user && !initializedRef.current) {
      initializedRef.current = true;
      startTransition(() => {
        if (user.userIntent) {
          setUserIntent(user.userIntent);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (user?.onboardingCompleted) {
      router.push('/');
    }
  }, [user, router]);

  const canProceed = userIntent !== null;

  const handleComplete = async () => {
    if (!canProceed) return;

    setIsSubmitting(true);
    try {
      await completeOnboarding({
        userIntent: userIntent || undefined,
      });
      router.push('/');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white flex items-center justify-center px-4 py-12">
      <Card className="relative w-full max-w-3xl border border-zinc-200">
        <Image
          src="/TTG_Rebranded_Badge.png"
          alt="Tech Tribes badge"
          width={60}
          height={60}
          className="absolute right-4 top-4 opacity-75"
          priority
        />
        <CardHeader className="border-b border-zinc-100 pr-16 sm:pr-20">
          <CardTitle className="text-2xl text-zinc-900">Welcome to Garden</CardTitle>
          <CardDescription className="mt-2 text-base space-y-1">
            <p className="pt-2">Quick questions to get you started.</p>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* User Intent Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-900">What brings you to Garden?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={() => setUserIntent('looking')}
                variant={userIntent === 'looking' ? 'default' : 'outline'}
                className="h-auto py-3"
              >
                See what others built
              </Button>
              <Button
                onClick={() => setUserIntent('sharing')}
                variant={userIntent === 'sharing' ? 'default' : 'outline'}
                className="h-auto py-3"
              >
                Share what I&apos;m building
              </Button>
              <Button
                onClick={() => setUserIntent('both')}
                variant={userIntent === 'both' ? 'default' : 'outline'}
                className="h-auto py-3"
              >
                Both
              </Button>
            </div>
          </div>

          {!canProceed && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Please select what brings you to Garden.
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-3 justify-end border-t border-zinc-100">
          <Button onClick={handleComplete} disabled={isSubmitting || !canProceed}>
            {isSubmitting ? 'Completing...' : 'Complete setup'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
