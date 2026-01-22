// import { authOptions } from '@repo/lib';
import { authOptions } from '@repo/lib';
import NextAuth from 'next-auth';

// Type definitions packages/ts-shared/lib/auth/auth.ts

// withApiLogger
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
