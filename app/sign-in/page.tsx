'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Authenticator } from '@aws-amplify/ui-react';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] py-8">
      <Authenticator initialState="signIn">
        {() => <RedirectOnAuth />}
      </Authenticator>
    </div>
  );
}

function RedirectOnAuth() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return <p className="text-muted-foreground">Signing you in…</p>;
}
