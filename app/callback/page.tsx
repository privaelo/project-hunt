'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (
        payload.event === 'signedIn' ||
        payload.event === 'signInWithRedirect'
      ) {
        router.replace('/');
      }
      if (payload.event === 'signInWithRedirect_failure') {
        router.replace('/');
      }
    });

    // Fallback: if the token exchange already completed before the
    // listener attached, redirect immediately.
    getCurrentUser()
      .then(() => {
        router.replace('/');
      })
      .catch(() => {
        // Waiting for Hub event
      });

    return unsubscribe;
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
}
