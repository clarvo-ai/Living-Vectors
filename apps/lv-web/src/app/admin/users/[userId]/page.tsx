'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSender, UserRole } from '@repo/db';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// User data returned by /api/admin/users/[userId]
interface AdminUserDetail {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
}

// Stats data returned by /api/admin/users/[userId]/stats
interface AdminUserStats {
  messageCount: number;
  learningCount: number;
}

// Messages data returned by /api/admin/users/[userId]/messages
interface AdminUserMessage {
  messageId: string;
  sender: MessageSender;
  content: string;
  createdAt: string;
}

// Learning connections data
interface LearningConnectionMessage {
  messageId: string;
  sender: MessageSender;
  content: string;
  createdAt: string;
}

interface LearningConnection {
  id: string;
  summary: string;
  createdAt: string;
  messages: LearningConnectionMessage[];
}

interface AdminUserDetailPageProps {
  params: {
    userId: string;
  };
}

export default function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminUserMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  // Learning connections state
  const [learningConnections, setLearningConnections] = useState<LearningConnection[]>([]);
  const [learningConnectionsLoading, setLearningConnectionsLoading] = useState(true);
  const [expandedLearnings, setExpandedLearnings] = useState<Set<string>>(new Set());
  const [expandedLearningMessages, setExpandedLearningMessages] = useState<Set<string>>(new Set());

  // Fetch user data and stats from the API
  useEffect(() => {
    // Fetch user details
    fetch(`/api/admin/users/${params.userId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('User not found');
          throw new Error('Failed to fetch user');
        }
        return res.json();
      })
      .then(setUser)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Fetch user stats
    fetch(`/api/admin/users/${params.userId}/stats`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
      })
      .then(setStats)
      .catch((err) => console.error('Stats error:', err.message))
      .finally(() => setStatsLoading(false));

    // Fetch user messages
    fetch(`/api/admin/users/${params.userId}/messages`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch messages');
        return res.json();
      })
      .then(setMessages)
      .catch((err) => console.error('Messages error:', err.message))
      .finally(() => setMessagesLoading(false));

    // Fetch learning connections
    fetch(`/api/admin/users/${params.userId}/learning-connections`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch learning connections');
        return res.json();
      })
      .then(setLearningConnections)
      .catch((err) => console.error('Learning connections error:', err.message))
      .finally(() => setLearningConnectionsLoading(false));
  }, [params.userId]);

  // Helper to toggle message expansion
  const toggleMessage = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // Helper to toggle learning expansion
  const toggleLearning = (learningId: string) => {
    setExpandedLearnings((prev) => {
      const next = new Set(prev);
      if (next.has(learningId)) {
        next.delete(learningId);
      } else {
        next.add(learningId);
      }
      return next;
    });
  };

  // Helper to toggle learning message expansion
  const toggleLearningMessage = (messageId: string) => {
    setExpandedLearningMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  if (loading) {
    return <p className="p-8 text-muted-foreground">Loading user…</p>;
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <Button variant="outline" onClick={() => router.push('/admin/users')}>
          ← Back to Users
        </Button>
      </div>
    );
  }

  if (!user) {
    return <p className="p-8 text-muted-foreground">User not found</p>;
  }

  return (
    <div className="p-8">
      <Button variant="ghost" className="mb-4" onClick={() => router.push('/admin/users')}>
        ← Back to Users
      </Button>

      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600/80">Total Messages</p>
                <p className="text-2xl font-bold text-blue-700">
                  {statsLoading ? '...' : (stats?.messageCount ?? '—')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-full">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-600/80">Total Learnings</p>
                <p className="text-2xl font-bold text-amber-700">
                  {statsLoading ? '...' : (stats?.learningCount ?? '—')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">ID</dt>
              <dd className="mt-1 font-mono text-sm">{user.id}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1">{user.email}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Display Name</dt>
              <dd className="mt-1">{user.name || '—'}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Role</dt>
              <dd className="mt-1">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {user.role}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">First Name</dt>
              <dd className="mt-1">{user.first_name || '—'}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
              <dd className="mt-1 text-sm">{new Date(user.createdAt).toLocaleString()}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last Name</dt>
              <dd className="mt-1">{user.last_name || '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Chat History Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>💬 Chat History</CardTitle>
        </CardHeader>
        <CardContent>
          {messagesLoading ? (
            <p className="text-muted-foreground">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-muted-foreground">No messages yet</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {messages.map((msg) => {
                const isExpanded = expandedMessages.has(msg.messageId);
                const isLong = msg.content.length > 200;

                return (
                  <div key={msg.messageId} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          msg.sender === 'USER'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {msg.sender}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {isLong && !isExpanded ? msg.content.slice(0, 200) + '…' : msg.content}
                    </p>
                    {isLong && !isExpanded && (
                      <button
                        onClick={() => toggleMessage(msg.messageId)}
                        className="text-xs text-muted-foreground hover:text-primary hover:underline mt-1"
                      >
                        Show more
                      </button>
                    )}
                    {isLong && isExpanded && (
                      <button
                        onClick={() => toggleMessage(msg.messageId)}
                        className="text-xs text-primary hover:underline mt-1"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Connections Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>🔗 Learning Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {learningConnectionsLoading ? (
            <p className="text-muted-foreground">Loading learning connections…</p>
          ) : learningConnections.length === 0 ? (
            <p className="text-muted-foreground">No learnings yet</p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {learningConnections.map((learning) => {
                const isExpanded = expandedLearnings.has(learning.id);

                return (
                  <div
                    key={learning.id}
                    className="border rounded-lg overflow-hidden bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border-emerald-200"
                  >
                    {/* Learning Header - Clickable */}
                    <button
                      onClick={() => toggleLearning(learning.id)}
                      className="w-full p-4 text-left hover:bg-emerald-100/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              💡 Learning
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(learning.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-emerald-900">{learning.summary}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {learning.messages.length} connected message
                            {learning.messages.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-emerald-600 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>

                    {/* Connected Messages - Expandable */}
                    {isExpanded && learning.messages.length > 0 && (
                      <div className="border-t border-emerald-200 bg-white/50 p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                          Source Messages
                        </p>
                        <div className="space-y-2 pl-4 border-l-2 border-emerald-300">
                          {learning.messages.map((msg) => {
                            const isMessageExpanded = expandedLearningMessages.has(msg.messageId);
                            const isMessageLong = msg.content.length > 300;

                            return (
                              <div
                                key={msg.messageId}
                                className="bg-white rounded-md p-3 border border-gray-100 shadow-sm"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                      msg.sender === 'USER'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}
                                  >
                                    {msg.sender}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap text-gray-700">
                                  {isMessageLong && !isMessageExpanded
                                    ? msg.content.slice(0, 300) + '…'
                                    : msg.content}
                                </p>
                                {isMessageLong && !isMessageExpanded && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleLearningMessage(msg.messageId);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-primary hover:underline mt-1"
                                  >
                                    Show more
                                  </button>
                                )}
                                {isMessageLong && isMessageExpanded && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleLearningMessage(msg.messageId);
                                    }}
                                    className="text-xs text-primary hover:underline mt-1"
                                  >
                                    Show less
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
