'use client';

import '@/lib/amplify-config';

import { ReactNode, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ConvexReactClient, useConvexAuth, useMutation } from 'convex/react';
import { ConvexProviderWithAuth } from 'convex/react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

import { api } from '@/convex/_generated/api';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromCognito}>
      <EnsureUser />
      {children}
    </ConvexProviderWithAuth>
  );
}

function EnsureUser() {
  const ensureUser = useMutation(api.users.ensureUser);
  const { isAuthenticated } = useConvexAuth();
  const hasEnsured = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      hasEnsured.current = false;
      return;
    }
    if (hasEnsured.current) return;

    let cancelled = false;

    async function run() {
      try {
        await ensureUser();
        if (!cancelled) {
          hasEnsured.current = true;
        }
      } catch {
        // Mutation failed — will retry on next auth state change or remount
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ensureUser]);

  return null;
}

function useAuthFromCognito() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString() ?? null;
        setIsAuthenticated(!!idToken);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    void checkAuth();

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (
        payload.event === 'signedIn' ||
        payload.event === 'tokenRefresh'
      ) {
        void checkAuth();
      } else if (payload.event === 'signedOut') {
        setIsAuthenticated(false);
      }
    });

    return unsubscribe;
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const session = await fetchAuthSession({
          forceRefresh: forceRefreshToken,
        });
        return session.tokens?.idToken?.toString() ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}
