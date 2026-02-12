'use client';

import '@/lib/amplify-config';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Amplify automatically detects the ?code= parameter at the
    // configured redirectSignIn URL and exchanges it for tokens.
    // We just need to wait for that exchange to complete, then redirect.

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signInWithRedirect') {
        router.replace('/');
      }
      if (payload.event === 'signInWithRedirect_failure') {
        router.replace('/');
      }
    });

    // Fallback: if the user is already authenticated (e.g. token exchange
    // happened before the listener attached), redirect immediately.
    getCurrentUser()
      .then(() => router.replace('/'))
      .catch(() => {
        // Not authenticated yet — wait for Hub event
      });

    return unsubscribe;
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
}
