'use client';

import { useEffect } from 'react';
import { signInWithRedirect } from 'aws-amplify/auth';

export default function SignUpPage() {
  useEffect(() => {
    // Cognito hosted UI shows both sign-in and sign-up options.
    signInWithRedirect();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Redirecting to sign up…</p>
    </div>
  );
}
