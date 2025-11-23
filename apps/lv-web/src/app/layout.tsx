import { Metadata } from 'next';
import { ClientProviders } from './client-providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fullstack Template',
  description: 'A simple fullstack template with authentication and user management.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full" suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
