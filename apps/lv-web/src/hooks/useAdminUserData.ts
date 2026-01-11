import { useEffect, useState } from 'react';
import type {
  AdminUserDetail,
  AdminUserStats,
  AdminUserMessage,
  LearningConnection,
} from '@/types/admin';

export function useAdminUserData(userId: string) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminUserMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [learningConnections, setLearningConnections] = useState<LearningConnection[]>([]);
  const [learningConnectionsLoading, setLearningConnectionsLoading] = useState(true);

  useEffect(() => {
    // Fetch user details
    fetch(`/api/admin/users/${userId}`)
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
    fetch(`/api/admin/users/${userId}/stats`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
      })
      .then(setStats)
      .catch((err) => console.error('Stats error:', err.message))
      .finally(() => setStatsLoading(false));

    // Fetch user messages
    fetch(`/api/admin/users/${userId}/messages`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch messages');
        return res.json();
      })
      .then(setMessages)
      .catch((err) => console.error('Messages error:', err.message))
      .finally(() => setMessagesLoading(false));

    // Fetch learning connections
    fetch(`/api/admin/users/${userId}/learning-connections`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch learning connections');
        return res.json();
      })
      .then(setLearningConnections)
      .catch((err) => console.error('Learning connections error:', err.message))
      .finally(() => setLearningConnectionsLoading(false));
  }, [userId]);

  return {
    user,
    stats,
    loading,
    statsLoading,
    error,
    messages,
    messagesLoading,
    learningConnections,
    learningConnectionsLoading,
  };
}
