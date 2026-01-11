import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LearningConnection } from '@/types/admin';

interface LearningCardsSidebarProps {
  learningConnections: LearningConnection[];
  learningConnectionsLoading: boolean;
  learningRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  selectedLearningId: string | null;
  onLearningSelect: (learning: LearningConnection) => void;
}

export function LearningCardsSidebar({
  learningConnections,
  learningConnectionsLoading,
  learningRefs,
  selectedLearningId,
  onLearningSelect,
}: LearningCardsSidebarProps) {
  return (
    <div className="w-80 shrink-0">
      <div className="sticky top-8">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">💡 Learnings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {learningConnectionsLoading ? (
              <p className="text-muted-foreground p-4">Loading learnings…</p>
            ) : learningConnections.length === 0 ? (
              <p className="text-muted-foreground p-4">No learnings yet</p>
            ) : (
              <div className="space-y-2 max-h-[550px] overflow-y-auto p-4">
                {learningConnections.map((learning) => {
                  const isSelected = selectedLearningId === learning.id;

                  return (
                    <button
                      key={learning.id}
                      ref={(el) => {
                        if (el) learningRefs.current.set(learning.id, el);
                      }}
                      onClick={() => onLearningSelect(learning)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                        isSelected
                          ? 'bg-emerald-100 border-emerald-400 shadow-lg shadow-emerald-100/50 scale-[1.02]'
                          : 'bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border-emerald-200 hover:border-emerald-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-lg ${isSelected ? 'animate-pulse' : ''}`}>
                          💡
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium leading-snug ${
                              isSelected ? 'text-emerald-900' : 'text-emerald-800'
                            }`}
                          >
                            {learning.summary.length > 100
                              ? learning.summary.slice(0, 100) + '…'
                              : learning.summary}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                isSelected
                                  ? 'bg-emerald-200 text-emerald-800'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {learning.messages.length} message
                              {learning.messages.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(learning.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <svg
                            className="w-4 h-4 text-emerald-600 shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
