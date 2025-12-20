import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and has ADMIN role
  if (!session?.user) {
    // Redirect to login if not authenticated
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    // Redirect to dashboard if not admin
    redirect('/dashboard');
  }

  return <>{children}</>;
}
