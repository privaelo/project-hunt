'use client';

import '@aws-amplify/ui-react/styles.css';
import { useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';

type AuthPageProps = {
  initialState: 'signIn' | 'signUp';
};

const formFields = {
  signIn: {
    username: {
      placeholder: 'Your Honda email',
    },
  },
  signUp: {
    name: {
      label: 'Full Name',
      placeholder: 'John Doe',
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

const components = {
  ConfirmSignUp: {
    Footer() {
      return (
        <div className="text-center mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-lg text-red-800">
            The email will probably be sent to your junk folder. Please check there!
          </p>
        </div>
      );
    },
  },
};

export function AuthPage({ initialState }: AuthPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] py-8">
      <Authenticator
        initialState={initialState}
        loginMechanisms={['email']}
        signUpAttributes={['name']}
        formFields={formFields}
        components={components}
      >
        {() => <RedirectOnAuth />}
      </Authenticator>
    </div>
  );
}

function RedirectOnAuth() {
  useEffect(() => {
    // Use a full page navigation so auth-only global CSS is unloaded
    // immediately when leaving the auth route.
    window.location.replace('/');
  }, []);
  return <p className="text-muted-foreground">Signing you in…</p>;
}
