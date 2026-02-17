'use client';

import '@aws-amplify/ui-react/styles.css';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Authenticator } from '@aws-amplify/ui-react';

const formFields = {
  signIn: {
    username: {
      placeholder: 'Your Honda email',
    },
  },
  signUp: {
    name: {
      label: 'Full Name',
      placeholder: 'Donovan Liao',
      order: 1,
    },
    email: {
      placeholder: 'Your Honda email',
      order: 2,
    },
    password: {
      order: 3,
    },
    confirm_password: {
      order: 4,
    },
  },
};

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] py-8">
      <Authenticator
        initialState="signIn"
        loginMechanisms={['email']}
        signUpAttributes={['name']}
        formFields={formFields}
      >
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
