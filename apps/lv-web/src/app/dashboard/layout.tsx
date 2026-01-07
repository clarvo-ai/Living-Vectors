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
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isHovering, setIsHovering] = useState(false);

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
      <div className="flex h-screen w-full" style={{ backgroundColor: '#edeef2' }}>
        {/* Sidebar */}
        <Sidebar
          collapsible="icon"
          variant="sidebar"
          style={{ backgroundColor: '#edeef2' }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <SidebarContent style={{ backgroundColor: '#edeef2' }}>
            {/* Logo and Sidebar icon */}
            <div className="px-4 py-6 group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center group-data-[state=expanded]:flex group-data-[state=expanded]:justify-between group-data-[state=expanded]:items-center relative">
              <h1
                className={`text-xl font-bold text-slate-800 transition-opacity duration-200 ${isHovering ? 'group-data-[state=collapsed]:opacity-0' : 'group-data-[state=collapsed]:opacity-100'}`}
              >
                LV
              </h1>
              {/* Sidebar icon - overlays LV when collapsed, right side when expanded */}
              <div
                className={`scale-125 group-data-[state=collapsed]:absolute group-data-[state=collapsed]:inset-0 group-data-[state=collapsed]:flex group-data-[state=collapsed]:items-center group-data-[state=collapsed]:justify-center transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'group-data-[state=collapsed]:opacity-0'}`}
              >
                <SidebarTrigger />
              </div>
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
                      style={
                        pathname?.startsWith('/dashboard/interview')
                          ? { backgroundColor: '#dfe3eb' }
                          : {}
                      }
                      className="justify-between hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        <Phone
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: '#465280' }}
                        />
                        <span
                          className={
                            pathname?.startsWith('/dashboard/interview')
                              ? 'text-gray-900'
                              : 'text-gray-600'
                          }
                        >
                          Interview
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Opportunities */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => router.push('/dashboard/opportunities')}
                      isActive={pathname?.startsWith('/dashboard/opportunities')}
                      tooltip="Opportunities"
                      style={
                        pathname?.startsWith('/dashboard/opportunities')
                          ? { backgroundColor: '#dfe3eb' }
                          : {}
                      }
                      className="justify-between hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: '#465280' }}
                        />
                        <span
                          className={
                            pathname?.startsWith('/dashboard/opportunities')
                              ? 'text-gray-900'
                              : 'text-gray-600'
                          }
                        >
                          Opportunities
                        </span>
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
                      style={
                        pathname?.startsWith('/dashboard/profile')
                          ? { backgroundColor: '#dfe3eb' }
                          : {}
                      }
                      className="justify-between hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        <User
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: '#465280' }}
                        />
                        <span
                          className={
                            pathname?.startsWith('/dashboard/profile')
                              ? 'text-gray-900'
                              : 'text-gray-600'
                          }
                        >
                          Profile
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Bottom Profile Menu with Dropdown */}
          <SidebarFooter
            style={{ backgroundColor: '#edeef2', borderColor: '#d0d2d8' }}
            className="border-t"
          >
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
          {pathname?.startsWith('/dashboard/interview') ? (
            <>
              {/* Top bar for interview page */}
              <div
                className="w-full border-b px-6 py-4"
                style={{ backgroundColor: '#f3f4f8', borderColor: '#edeef2' }}
              >
                <h2 className="text-xl font-semibold text-gray-900">Interview</h2>
              </div>
              {/* Full-width content area */}
              <div className="flex-1 overflow-auto" style={{ backgroundColor: '#f3f4f8' }}>
                {children}
              </div>
            </>
          ) : (
            /* Content Area for other pages */
            <div className="flex-1 overflow-hidden" style={{ backgroundColor: '#f3f4f8' }}>
              {children}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
