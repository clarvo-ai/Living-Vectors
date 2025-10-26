import { prisma } from '@repo/db';
import EmailProvider from 'next-auth/providers/email';
import { isDev } from './auth';

export const getDevEmailProvider = () => {
  return EmailProvider({
    async sendVerificationRequest({ url }) {
      console.log('\n🔑 Development Sign-in:');
      console.log('\x1b[36m%s\x1b[0m', url);
      console.log('\n Copy to browser or ctrl+click the above to sign in');
    },
    type: 'email',
  });
};

export const handleDevSignIn = async (email: string | null | undefined) => {
  if (!email) return false;
  if (isDev) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (!existingUser) {
        await prisma.user.create({
          data: {
            name: 'Test User',
            email,
          },
        });
      }
      return true;
    } catch (error) {
      console.error('Development sign-in error:', error);
      return false;
    }
  }
  return true;
};
