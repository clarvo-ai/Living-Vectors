'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getGeminiResponse } from '@/lib/services/pyapi';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatInput } from './components/ChatInput';
import { Message } from './components/ChatMessage';
import { EndInterviewDialog } from './components/EndInterviewDialog';
import { InterviewHeader } from './components/InterviewHeader';
import { MessagesList } from './components/MessagesList';

export default function InterviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-ai-message',
      role: 'ai',
      content: "Hello! I'm here to figure you out. First, are you dedicated?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEndInterviewDialog, setShowEndInterviewDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Require auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Scroll behaviour
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // This is the part where a message would be sent to the API
      // and the response is received from the API
      // Logic for the request processing is in
      // src/app/api/interview/chat/route.ts
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error('User ID missing');
      }

      //frontend calls the backend API to get the AI response
      //this function also saves the message to the database
      const data = await getGeminiResponse(userId, userMessage.content);

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      // In case an error occurs
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  //Send message on Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndInterview = () => {
    router.push('/dashboard');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
      <div
        data-testid="loading-spinner"
        className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"
      ></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(45deg, var(--bg-gradient-start) 0%, var(--bg-gradient-middle) 50%, var(--bg-gradient-end) 100%)`,
      }}
    >
      <InterviewHeader
        onEndInterviewClick={() => setShowEndInterviewDialog(true)}
        userName={session.user?.name || session.user?.email}
      />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="h-[calc(100vh-12rem)] flex flex-col shadow-lg">
          <CardHeader className="border-b pb-4">
            <ChatHeader currentGoal="Build Trust & Explore Current Motivation" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden pt-6">
            <MessagesList
              messages={messages}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
            />
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              onKeyDown={handleKeyDown}
            />
          </CardContent>
        </Card>
      </main>

      <EndInterviewDialog
        open={showEndInterviewDialog}
        onOpenChange={setShowEndInterviewDialog}
        onConfirm={handleEndInterview}
      />
    </div>
  );
}
