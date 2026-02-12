'use client';

import { useEffect } from 'react';
import { signInWithRedirect } from 'aws-amplify/auth';

export default function SignInPage() {
  useEffect(() => {
    signInWithRedirect();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Redirecting to sign in…</p>
    </div>
  );
}
