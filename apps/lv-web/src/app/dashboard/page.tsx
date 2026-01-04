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
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InterviewContent } from '../interview/InterviewContent';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeView, setActiveView] = useState<'calls' | 'opportunities' | 'profile'>('calls');

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
                  {/* Calls */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveView('calls')}
                      isActive={activeView === 'calls'}
                      tooltip="Calls"
                      className="justify-between hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 flex-shrink-0 text-blue-600" />
                        <span className="text-gray-600">Calls</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Opportunities */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveView('opportunities')}
                      isActive={activeView === 'opportunities'}
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
                      onClick={() => setActiveView('profile')}
                      isActive={activeView === 'profile'}
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
        <main className="flex-1 flex flex-col">
          {/* Sidebar Trigger (Hamburger Menu) */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
            <SidebarTrigger />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeView === 'calls' && (
              <div className="h-full p-6">
                <InterviewContent />
              </div>
            )}

            {activeView === 'opportunities' && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Briefcase className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Opportunities</h2>
                  <p className="text-gray-600">Your career opportunities will appear here</p>
                </div>
              </div>
            )}

            {activeView === 'profile' && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Profile</h2>
                  <p className="text-gray-600">Your profile settings will appear here</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
