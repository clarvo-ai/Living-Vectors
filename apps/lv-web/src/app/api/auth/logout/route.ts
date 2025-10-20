import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({ success: true });

  // Clear all NextAuth related cookies (both prod and dev versions)
  // Session token
  response.cookies.delete('next-auth.session-token');
  response.cookies.delete('__Secure-next-auth.session-token');
  response.cookies.delete('__Host-next-auth.session-token');

  // CSRF token
  response.cookies.delete('next-auth.csrf-token');
  response.cookies.delete('__Secure-next-auth.csrf-token');
  response.cookies.delete('__Host-next-auth.csrf-token');

  // Callback URL
  response.cookies.delete('next-auth.callback-url');
  response.cookies.delete('__Secure-next-auth.callback-url');
  response.cookies.delete('__Host-next-auth.callback-url');

  return response;
}
