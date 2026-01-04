'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@repo/ui/components/sidebar';
import { Briefcase, ChevronDown, LogOut, Phone, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full bg-gray-50">
        {/* Sidebar */}
        <Sidebar collapsible="icon" variant="sidebar" className="bg-gray-50">
          <SidebarContent className="bg-gray-50">
            {/* Logo */}
            <div className="px-4 py-6 group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center group-data-[state=expanded]:flex group-data-[state=expanded]:justify-start">
              <h1 className="text-xl font-bold text-slate-800">LV</h1>
            </div>

            <SidebarGroup>
              <SidebarGroupContent className="flex flex-col items-center">
                <SidebarMenu className="w-full">
                  {/* Interview */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => router.push('/dashboard/interview')}
                      isActive={pathname?.startsWith('/dashboard/interview')}
                      tooltip="Interview"
                      className="justify-between hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 flex-shrink-0 text-blue-600" />
                        <span className="text-gray-600">Interview</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Opportunities */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => router.push('/dashboard/opportunities')}
                      isActive={pathname?.startsWith('/dashboard/opportunities')}
                      tooltip="Opportunities"
                      className="justify-between hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 flex-shrink-0 text-blue-600" />
                        <span className="text-gray-600">Opportunities</span>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-300 text-gray-700 text-xs rounded-full font-medium">
                        3
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Profile */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => router.push('/dashboard/profile')}
                      isActive={pathname?.startsWith('/dashboard/profile')}
                      tooltip="Profile"
                      className="justify-between hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 flex-shrink-0 text-blue-600" />
                        <span className="text-gray-600">Profile</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Bottom Profile Menu with Dropdown */}
          <SidebarFooter className="bg-gray-50 border-t border-gray-200">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="w-full h-auto p-2 group-data-[state=collapsed]:p-3 group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center">
                      <div className="flex items-center gap-3 w-full group-data-[state=collapsed]:w-auto">
                        {session.user?.image ? (
                          <img
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                            className="w-8 h-8 min-w-8 min-h-8 rounded-full flex-shrink-0 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 min-w-8 min-h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left group-data-[state=collapsed]:hidden">
                          <span className="text-sm font-medium truncate block text-gray-600">
                            {session.user?.name || session.user?.email}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-500 group-data-[state=collapsed]:hidden" />
                      </div>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="text-red-600 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Sidebar Trigger (Hamburger Menu) */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
            <SidebarTrigger />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
