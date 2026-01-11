'use client';

import DashboardLayout from '../dashboard/layout';

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
