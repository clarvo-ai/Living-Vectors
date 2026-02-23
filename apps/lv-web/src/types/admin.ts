import { MessageSender, UserRole } from '@repo/db';

/**
 * User data returned by /api/admin/users/[userId]
 */
export interface AdminUserDetail {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
}

/**
 * Stats data returned by /api/admin/users/[userId]/stats
 */
export interface AdminUserStats {
  messageCount: number;
  learningCount: number;
}

/**
 * Message data returned by /api/admin/users/[userId]/messages
 */
export interface AdminUserMessage {
  messageId: string;
  sender: MessageSender;
  content: string;
  createdAt: string;
}

/**
 * Learning connection data returned by /api/admin/users/[userId]/learning-connections
 */
export interface LearningConnection {
  id: string;
  summary: string;
  createdAt: string;
  messages: string[];
}
