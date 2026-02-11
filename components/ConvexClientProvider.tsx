'use client';

import '@/lib/amplify-config';

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConvexReactClient, useMutation } from 'convex/react';
import { ConvexProviderWithAuth } from 'convex/react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
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
  const hasEnsured = useRef(false);

  useEffect(() => {
    if (hasEnsured.current) return;

    async function check() {
      try {
        await getCurrentUser();
        hasEnsured.current = true;
        await ensureUser();
      } catch {
        // Not authenticated — nothing to do
      }
    }
    void check();
  }, [ensureUser]);

  return null;
}

function useAuthFromCognito() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString() ?? null;
        tokenRef.current = idToken;
        setIsAuthenticated(!!idToken);
      } catch {
        tokenRef.current = null;
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    void checkAuth();

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'tokenRefresh') {
        void checkAuth();
      } else if (payload.event === 'signedOut') {
        tokenRef.current = null;
        setIsAuthenticated(false);
      }
    });

    return unsubscribe;
  }, []);

  const fetchAccessToken = useCallback(async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: false });
      const idToken = session.tokens?.idToken?.toString() ?? null;
      tokenRef.current = idToken;
      return idToken;
    } catch {
      return null;
    }
  }, []);

  return useMemo(() => ({
    isLoading,
    isAuthenticated,
    fetchAccessToken,
  }), [isLoading, isAuthenticated, fetchAccessToken]);
}
