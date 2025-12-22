'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexAuth } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';
import { FocusAreaPicker } from '@/components/FocusAreaPicker';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.users.currentWithFocusAreas);
  const focusAreasGrouped = useQuery(api.focusAreas.listActiveGrouped);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);
  const [focusAreaIds, setFocusAreaIds] = useState<Id<'focusAreas'>[]>([]);
  const [userIntent, setUserIntent] = useState<'looking' | 'sharing' | 'both' | null>(null);

  // Update state when user data loads (only once)
  useEffect(() => {
    if (user && !initializedRef.current) {
      initializedRef.current = true;
      startTransition(() => {
        if (user.focusAreaIds) {
          setFocusAreaIds(user.focusAreaIds);
        }
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

  const canProceed = focusAreaIds.length > 0 && userIntent !== null;

  const handleComplete = async () => {
    if (!canProceed) return;

    setIsSubmitting(true);
    try {
      await completeOnboarding({
        focusAreaIds,
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
      <Card className="w-full max-w-3xl border border-zinc-200">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="text-2xl text-zinc-900">Welcome to Garden</CardTitle>
          <CardDescription className="mt-2 text-base space-y-1">
            <p className="pt-2">Help us personalize your experience by answering a few quick questions.</p>
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
                Looking for tools
              </Button>
              <Button
                onClick={() => setUserIntent('sharing')}
                variant={userIntent === 'sharing' ? 'default' : 'outline'}
                className="h-auto py-3"
              >
                Sharing tools
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

          {/* Focus Areas Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-900">Select your focus areas</h3>
            <FocusAreaPicker
              focusAreasGrouped={focusAreasGrouped}
              selectedFocusAreas={focusAreaIds}
              onSelectionChange={setFocusAreaIds}
            />
          </div>

          {!canProceed && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {!userIntent && 'Please select what brings you to Garden. '}
              {userIntent && focusAreaIds.length === 0 && 'Select at least one focus area to continue.'}
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
