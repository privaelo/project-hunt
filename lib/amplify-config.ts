"use client";

import { Amplify } from "aws-amplify";

const signOutUri =
  process.env.NEXT_PUBLIC_COGNITO_SIGN_OUT_URI ??
  new URL("/", process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!).origin;

console.log('[AMPLIFY CONFIG]', {
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
  redirectUri: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI,
  signOutUri,
});

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!],
          redirectSignOut: [signOutUri],
          responseType: "code",
        },
      },
    },
  },
});
