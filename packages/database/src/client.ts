import { PrismaClient } from '../prisma/generated/client';
import { DatabaseLogMetadata } from './types';

// Utility function to safely get headers in different environments
const getRequestHeaders = async (): Promise<Headers | null> => {
  try {
    // Only dynamically import headers in a server context
    if (typeof window === 'undefined') {
      try {
        // Dynamic import for next/headers to avoid static imports that would break in pages router
        const { headers } = await import('next/headers');
        return headers();
      } catch (error) {
        // next/headers not available (likely in pages directory)
        return null;
      }
    }
  } catch (error) {
    // Ignore any errors - headers simply won't be available
  }
  return null;
};

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      async $allOperations({ model, args, query }) {
        // Skip logging for sensitive operations
        if (model === 'Session' || model === 'Account' || model === 'VerificationToken') {
          const result = await query(args);
          return result;
        }
        // Get HTTP path and method if available
        let method = 'UNKNOWN';
        let callerPath = 'unknown';

        // Safely try to get headers
        const headersList = await getRequestHeaders();
        if (headersList) {
          const methodHeader = headersList.get('x-http-method');
          const pathHeader = headersList.get('x-invoke-path');
          method = methodHeader ?? 'UNKNOWN';
          callerPath = pathHeader ?? 'unknown';
        }

        // Extract include/select info for joins
        const includeInfo = args.include
          ? Object.fromEntries(Object.keys(args.include).map((key) => [key, true]))
          : {};
        const selectInfo = args.select
          ? Object.fromEntries(Object.keys(args.select).map((key) => [key, true]))
          : {};
        const hasJoins = Object.keys(includeInfo).length > 0 || Object.keys(selectInfo).length > 0;

        try {
          // Execute query with metadata
          const result = await query(args);
          // Log successful operation
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          // Log error operation
          const metadata: DatabaseLogMetadata = {
            model: model || 'unknown',
            operation: args.operation,
            path: callerPath,
            joins: hasJoins
              ? {
                  include: includeInfo,
                  select: selectInfo,
                }
              : undefined,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          };

          console.error('Prisma Operation Failed:', {
            model: model || 'unknown',
            operation: args.operation,
            path: callerPath,
            error: errorMessage,
          });

          throw error;
        }
      },
    },
  });
};

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>;

declare global {
  let prisma: ExtendedPrismaClient;
}

interface CustomNodeJsGlobal extends Global {
  prisma: ExtendedPrismaClient;
}
// Too many clients error fix.
declare const globalThis: CustomNodeJsGlobal;

export const prisma =
  globalThis.prisma || (typeof window === 'undefined' ? prismaClientSingleton() : undefined);

if (process.env.NODE_ENV === 'development') globalThis.prisma = prisma;
