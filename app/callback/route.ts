import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Cognito redirects back with ?code=... which Amplify's client-side
  // Hub listener handles automatically. Redirect to the app root so
  // the client-side Amplify code can complete the OAuth exchange.
  const url = new URL('/', request.url);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url);
}
