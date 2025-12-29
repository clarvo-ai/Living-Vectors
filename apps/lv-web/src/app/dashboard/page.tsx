'use client';

import { Button } from '@/components/ui/button';
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
import { Briefcase, ChevronDown, Circle, LogOut, Mic, Phone, Send, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeView, setActiveView] = useState<'calls' | 'opportunities' | 'profile'>('calls');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

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

  const handleStartVoiceCall = () => {
    console.log('Starting voice call...');
    // Add voice call logic here
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      console.log('Sending message:', messageInput);
      setMessageInput('');
      // Add message sending logic here
    }
  };

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
                      className="justify-between text-gray-500 hover:text-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 flex-shrink-0 text-gray-500" />
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
                      className="justify-between text-gray-500 hover:text-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 flex-shrink-0 text-gray-500" />
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
                      className="justify-between text-gray-500 hover:text-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 flex-shrink-0 text-gray-500" />
                        <span className="text-gray-600">Profile</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Bottom Profile Menu with Dropdown */}
          <SidebarFooter className="bg-gray-50">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="w-full h-auto p-2">
                      <div className="flex items-center gap-3 w-full">
                        {session.user?.image ? (
                          <img
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                            className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <span className="text-sm font-medium truncate block text-gray-600">
                            {session.user?.name || session.user?.email}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-500" />
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

          {selectedChat ? (
            /* Chat Mode */
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-semibold text-gray-900">AI Career Discussion</h2>
                    <div className="flex items-center space-x-2">
                      <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                      <span className="text-sm text-green-600">Online</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedChat(null)}
                    className="text-gray-500"
                  >
                    Close
                  </Button>
                </div>
              </header>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Example messages */}
                <div className="flex justify-start">
                  <div className="max-w-md bg-white rounded-2xl px-4 py-3 shadow-sm">
                    <p className="text-gray-800">
                      Hello! How can I help you with your career today?
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-md bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl px-4 py-3 shadow-sm">
                    <p className="text-white">
                      I'd like to discuss my career path and explore new opportunities.
                    </p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-md bg-white rounded-2xl px-4 py-3 shadow-sm">
                    <p className="text-gray-800">
                      Great! Let's start by understanding your current situation and goals.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input Section */}
              <div className="bg-white border-t border-gray-200 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Voice Mode (Default State) */
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="text-center max-w-md space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                    <Mic className="w-12 h-12 text-purple-600" />
                  </div>
                </div>

                {/* Title and Subtitle */}
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-gray-900">Start a Voice Conversation</h1>
                  <p className="text-lg text-gray-600">
                    Connect with our AI assistant to explore career opportunities
                  </p>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={handleStartVoiceCall}
                  size="lg"
                  className="bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all px-8 py-6 text-lg"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Start Voice Call
                </Button>

                {/* Or start a chat */}
                <div className="pt-4">
                  <button
                    onClick={() => setSelectedChat('new-chat')}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Or start a text conversation →
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
