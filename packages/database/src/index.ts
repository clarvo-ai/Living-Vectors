export * from '../prisma/generated/client'; // exports generated types from prisma
export { prisma } from './client'; // exports instance of prisma
export { seed } from './seed'; // exports seed function
export * from './client'; // This brings in User, Account, etc.
