'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@repo/ui/components/textarea';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage, Message } from './components/chatmessage';

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
      const response = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: data.id,
        role: data.role,
        content: data.content,
        timestamp: new Date(data.timestamp),
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <a href="/dashboard" className="hover:underline focus:outline-none">
                <h1 className="text-3xl font-bold text-gray-900 cursor-pointer">Interview</h1>
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session.user?.name || session.user?.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="h-[calc(100vh-12rem)] flex flex-col">
          <CardHeader>
            <CardTitle>AI interview</CardTitle>
            {messages.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0">
              {/* This is a list of all the messages in the conversation */}
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {/* This is a loading indicator that is shown when the AI is generating a response */}
              {isLoading && (
                <div className="flex justify-start" data-testid="chat-loading-indicator">
                  <div className="bg-gray-200 rounded-lg px-4 py-2">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              {/* This is a ref to the bottom of the messages area 
                  Used to scroll to the bottom of the messages area when a new message is added*/}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                className="resize-none"
                rows={3}
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
