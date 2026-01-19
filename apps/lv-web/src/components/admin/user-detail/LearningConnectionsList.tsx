import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LearningConnection } from '@/types/admin';

interface LearningConnectionsListProps {
  learningConnections: LearningConnection[];
  learningConnectionsLoading: boolean;
  expandedLearnings: Set<string>;
  expandedLearningMessages: Set<string>;
  onToggleLearning: (learningId: string) => void;
  onToggleLearningMessage: (messageId: string) => void;
}

export function LearningConnectionsList({
  learningConnections,
  learningConnectionsLoading,
  expandedLearnings,
  expandedLearningMessages,
  onToggleLearning,
  onToggleLearningMessage,
}: LearningConnectionsListProps) {
  return (
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
                    onClick={() => onToggleLearning(learning.id)}
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
                        <p className="text-sm font-medium text-emerald-900">
                          {learning.summary}
                        </p>
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
                                    onToggleLearningMessage(msg.messageId);
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
                                    onToggleLearningMessage(msg.messageId);
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
  );
}
