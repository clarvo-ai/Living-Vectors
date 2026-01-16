import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminUserMessage } from '@/types/admin';

interface ChatHistoryListProps {
  messages: AdminUserMessage[];
  messagesLoading: boolean;
  expandedMessages: Set<string>;
  onToggleMessage: (messageId: string) => void;
}

export function ChatHistoryList({
  messages,
  messagesLoading,
  expandedMessages,
  onToggleMessage,
}: ChatHistoryListProps) {
  return (
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
                      onClick={() => onToggleMessage(msg.messageId)}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline mt-1"
                    >
                      Show more
                    </button>
                  )}
                  {isLong && isExpanded && (
                    <button
                      onClick={() => onToggleMessage(msg.messageId)}
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
  );
}
