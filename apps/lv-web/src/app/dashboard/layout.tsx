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
  useSidebar,
} from '@repo/ui/components/sidebar';
import { Briefcase, ChevronDown, LogOut, Menu, Phone, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { toggleSidebar, open } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isHovering, setIsHovering] = useState(false);

  // Save to sessionStorage when sidebar state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sidebar-open', JSON.stringify(open));
    }
  }, [open]);

  const handleSidebarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only toggle if clicking on the sidebar itself, not on any button
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('button') === null) {
      toggleSidebar();
    }
  };

  const handleMobileNavigation = (path: string) => {
    router.push(path);
    // Close sidebar on mobile after navigation
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
      {/* Mobile sidebar trigger - hidden on larger screens */}
      <div className="md:hidden fixed top-3 left-4 z-50 pointer-events-auto">
        <button
          onClick={() => toggleSidebar()}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          cursor: isHovering ? 'col-resize' : 'default',
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleSidebarClick}
      >
        <SidebarContent
          style={{ backgroundColor: 'var(--bg-sidebar)' }}
          className="overflow-y-auto overflow-x-hidden"
        >
          {/* Logo and Sidebar icon */}
          <div className="px-4 py-6 group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center group-data-[state=expanded]:flex group-data-[state=expanded]:justify-between group-data-[state=expanded]:items-center relative w-full">
            <h1
              className={`text-xl font-bold text-slate-800 transition-opacity duration-200 flex-shrink-0 ${isHovering ? 'group-data-[state=collapsed]:opacity-0' : 'group-data-[state=collapsed]:opacity-100'}`}
            >
              LV
            </h1>
            {/* Sidebar icon - hidden on mobile, shown on desktop */}
            <div
              className={`hidden md:flex scale-125 group-data-[state=collapsed]:absolute group-data-[state=collapsed]:inset-0 group-data-[state=collapsed]:flex group-data-[state=collapsed]:items-center group-data-[state=collapsed]:justify-center group-data-[state=expanded]:absolute group-data-[state=expanded]:right-4 transition-opacity duration-200 flex-shrink-0 ${isHovering ? 'opacity-100' : 'group-data-[state=collapsed]:opacity-0'}`}
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
                    onClick={() => handleMobileNavigation('/dashboard/interview')}
                    isActive={pathname?.startsWith('/dashboard/interview')}
                    tooltip="Interview"
                    style={
                      pathname?.startsWith('/dashboard/interview')
                        ? { backgroundColor: 'var(--bg-hover)' }
                        : {}
                    }
                    className="justify-between hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <Phone
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: 'var(--icon-sidebar)' }}
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
                    onClick={() => handleMobileNavigation('/dashboard/opportunities')}
                    isActive={pathname?.startsWith('/dashboard/opportunities')}
                    tooltip="Opportunities"
                    style={
                      pathname?.startsWith('/dashboard/opportunities')
                        ? { backgroundColor: 'var(--bg-hover)' }
                        : {}
                    }
                    className="justify-between hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: 'var(--icon-sidebar)' }}
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
                    onClick={() => handleMobileNavigation('/dashboard/profile')}
                    isActive={pathname?.startsWith('/dashboard/profile')}
                    tooltip="Profile"
                    style={
                      pathname?.startsWith('/dashboard/profile')
                        ? { backgroundColor: 'var(--bg-hover)' }
                        : {}
                    }
                    className="justify-between hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <User
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: 'var(--icon-sidebar)' }}
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
          style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-top)' }}
          className="border-t"
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="w-full h-auto p-2 group-data-[state=collapsed]:p-3 group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center">
                    <div className="flex items-center gap-3 w-full group-data-[state=collapsed]:w-auto">
                      {session.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt={session.user.name || 'User'}
                          width={32}
                          height={32}
                          className="w-8 h-8 min-w-8 min-h-8 rounded-full flex-shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 min-w-8 min-h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left group-data-[state=collapsed]:hidden">
                        <span className="text-sm font-medium truncate block text-gray-900">
                          {session.user?.name || session.user?.email}
                        </span>
                        <span className="text-xs truncate block text-gray-500">
                          {session.user?.email}
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
        {/* Header for all pages */}
        <div
          className="w-full border-b px-6 py-4"
          style={{ backgroundColor: 'var(--bg-light)', borderColor: 'var(--border-gray)' }}
        >
          <h2 className="text-xl font-semibold text-gray-900 md:pl-0 pl-10">
            {pathname?.startsWith('/dashboard/interview')
              ? 'Interview'
              : pathname?.startsWith('/dashboard/profile')
                ? 'Profile Settings'
                : pathname?.startsWith('/dashboard/opportunities')
                  ? 'Opportunities'
                  : 'Dashboard'}
          </h2>
        </div>
        {/* Full-width content area */}
        <div className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--bg-light)' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [initialOpen, setInitialOpen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Load sidebar state from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('sidebar-open');
      setInitialOpen(saved ? JSON.parse(saved) : false);
    }
  }, []);

  // Don't render until we've loaded the initial state
  if (initialOpen === undefined) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={initialOpen}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}
