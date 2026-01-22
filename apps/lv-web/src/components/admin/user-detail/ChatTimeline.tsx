import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminUserMessage } from '@/types/admin';

interface ChatTimelineProps {
  messages: AdminUserMessage[];
  messagesLoading: boolean;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  expandedMessages: Set<string>;
  highlightedMessageIds: Set<string>;
  onToggleMessage: (messageId: string) => void;
}

export function ChatTimeline({
  messages,
  messagesLoading,
  chatContainerRef,
  messageRefs,
  expandedMessages,
  highlightedMessageIds,
  onToggleMessage,
}: ChatTimelineProps) {
  return (
    <div className="flex-1 min-w-0">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">💬 Chat Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {messagesLoading ? (
            <p className="text-muted-foreground p-4">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-muted-foreground p-4">No messages yet</p>
          ) : (
            <div
              ref={chatContainerRef}
              className="space-y-3 max-h-[600px] overflow-y-auto p-4"
            >
              {messages.map((msg) => {
                const isExpanded = expandedMessages.has(msg.messageId);
                const isLong = msg.content.length > 200;
                const isHighlighted = highlightedMessageIds.has(msg.messageId);

                return (
                  <div
                    key={msg.messageId}
                    ref={(el) => {
                      if (el) messageRefs.current.set(msg.messageId, el);
                    }}
                    data-message-id={msg.messageId}
                    className={`border rounded-lg p-3 transition-all duration-300 ${
                      isHighlighted
                        ? 'bg-emerald-50 border-emerald-300 shadow-md shadow-emerald-100 ring-2 ring-emerald-200/50'
                        : 'bg-muted/30 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isHighlighted && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          💡
                        </span>
                      )}
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
    </div>
  );
}
