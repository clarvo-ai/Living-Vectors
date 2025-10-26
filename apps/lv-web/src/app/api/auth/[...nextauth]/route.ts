// import { authOptions } from '@repo/lib';
import { authOptions } from '@repo/lib';
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string | null;
      email: string | null;
      image: string | null;
      name: string | null;
    };
  }
}
// withApiLogger
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
