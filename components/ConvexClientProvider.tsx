'use client';

import '@/lib/amplify-config';

import { ReactNode, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ConvexReactClient, useMutation } from 'convex/react';
import { ConvexProviderWithAuth } from 'convex/react';
// signInWithRedirect must be imported here (layout level) so its
// side-effect OAuth callback listener is registered on every page.
// In Next.js, code-splitting drops it if only imported on the callback page.
import { fetchAuthSession, getCurrentUser, signInWithRedirect } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

import { api } from '@/convex/_generated/api';

// Prevent tree-shaking from removing the signInWithRedirect import
void signInWithRedirect;

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
        payload.event === 'signInWithRedirect' ||
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
