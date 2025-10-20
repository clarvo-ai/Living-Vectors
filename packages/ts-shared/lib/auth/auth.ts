import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma, Account as PrismaAccount } from '@repo/db';
import { Account, AuthOptions, User } from 'next-auth';
import { AdapterUser } from 'next-auth/adapters';
import GoogleProvider from 'next-auth/providers/google';

export const isDev = process.env.NODE_ENV === 'development';

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

export const authOptions: AuthOptions = {
  pages: {
    error: '/auth/error',
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // LinkedInProvider({
    //   clientId: process.env.LINKEDIN_CLIENT_ID!,
    //   clientSecret: process.env.LINKEDIN_PRIMARY_CLIENT_SECRET!,
    //   client: { token_endpoint_auth_method: 'client_secret_post' },
    //   issuer: 'https://www.linkedin.com',
    //   profile: (profile: LinkedInProfile) => ({
    //     id: profile.sub,
    //     name: profile.name,
    //     email: profile.email,
    //     image: profile.picture,
    //   }),
    //   wellKnown: 'https://www.linkedin.com/oauth/.well-known/openid-configuration',
    //   authorization: {
    //     params: {
    //       scope: 'openid profile email',
    //     },
    //   },
    // }),
  ],
  callbacks: {
    async signIn({ user, account, credentials, email, profile }) {
      console.log('signIn', user, account, credentials, email, profile);

      let existingAccount: PrismaAccount | null = null;
      let newUser: User | undefined;
      // For other providers
      if (account && user) {
        try {
          // First check if the user already exists by email
          const existingUser = user.email
            ? await prisma.user.findUnique({
                where: { email: user.email },
                include: { accounts: true },
              })
            : null;

          // Check if there's an existing account with this provider
          existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (existingUser && !existingAccount) {
            // User exists but doesn't have an account with this provider
            // Create a new linked account for this provider
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                ...getAccountData(account, user, profile),
              },
            });

            // Get profile data for image
            const profileData = parseOAuthProfileData(account, profile);

            // Update image if available
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                image: profileData.picture_url || existingUser.image || null,
              },
            });

            // Use the existing user's ID for the rest of the flow
            user.id = existingUser.id;
          } else if (!existingAccount) {
            // No existing account with this provider and no user with this email
            // Create a new user and account
            newUser = await handleCreateNewUser(user, account, profile);
          } else {
            console.log('User logging in', user);
          }

          if (existingAccount) {
            // Get profile data for image
            const profileData = parseOAuthProfileData(account, profile);

            // Update existing account with latest profile data
            await prisma.account.update({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              data: {
                first_name: profileData.first_name ?? existingAccount.first_name,
                last_name: profileData.last_name ?? existingAccount.last_name,
                picture_url: profileData.picture_url ?? existingAccount.picture_url,
              },
            });

            await prisma.user.update({
              where: { id: user.id },
              data: {
                image: profileData.picture_url || user.image || null,
              },
            });
          }
        } catch (error) {
          console.error('Auth error:', error);
        }
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      // print sesssion
      // get session from request
      // const session = await getServerSession(authOptions);
      // console.log('session', session);
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
    async session({ session, user }) {
      try {
        if (!session?.user) {
          return session;
        }

        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
          },
        };
      } catch (error) {
        console.log('error', error);
        return session;
      }
    },
    async jwt({ token }) {
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'ciu8uertio3iurhnflj387dhfjk3jh',
};

async function handleCreateNewUser(user: User | AdapterUser, account: Account, profile?: any) {
  // Get profile data for image
  const profileData = parseOAuthProfileData(account, profile);

  const createdUser = await prisma.user.create({
    data: {
      name: user.name || '',
      email: user.email || '',
      image: profileData.picture_url || user.image || null,
      accounts: {
        create: { ...getAccountData(account, user, profile) },
      },
    },
  });

  return createdUser;
}

/**
 * Safely extracts OAuth profile data for account fields
 * Supports multiple providers with different field names
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const parseOAuthProfileData = (account: Account, profile?: any) => {
  const result = {
    first_name: null as string | null,
    last_name: null as string | null,
    picture_url: null as string | null,
  };

  // Try to extract from profile object first (most reliable)
  if (profile && typeof profile === 'object') {
    // Common field variations for first name
    result.first_name =
      profile.given_name || profile.first_name || profile.firstName || profile.givenName || null;

    // Common field variations for last name
    result.last_name =
      profile.family_name || profile.last_name || profile.lastName || profile.familyName || null;

    // Common field variations for picture
    result.picture_url =
      profile.picture ||
      profile.picture_url ||
      profile.pictureUrl ||
      profile.avatar ||
      profile.avatar_url ||
      profile.avatarUrl ||
      null;
  }

  return result;
};

const getAccountData = (account: Account, user: User, profile?: any) => {
  const profileData = parseOAuthProfileData(account, profile);

  return {
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    refresh_token: account.refresh_token,
    access_token: account.access_token,
    expires_at: account.expires_at,
    token_type: account.token_type,
    scope: account.scope,
    id_token: account.id_token,
    session_state: account.session_state,
    email: user.email || '',
    first_name: profileData.first_name,
    last_name: profileData.last_name,
    picture_url: profileData.picture_url,
  };
};
