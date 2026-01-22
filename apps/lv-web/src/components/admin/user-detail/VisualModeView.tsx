import { ConnectionLines } from './ConnectionLines';
import { ChatTimeline } from './ChatTimeline';
import { LearningCardsSidebar } from './LearningCardsSidebar';
import type { AdminUserMessage, LearningConnection } from '@/types/admin';

interface VisualModeViewProps {
  messages: AdminUserMessage[];
  messagesLoading: boolean;
  learningConnections: LearningConnection[];
  learningConnectionsLoading: boolean;
  visualContainerRef: React.RefObject<HTMLDivElement>;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  learningRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  svgContainerRef: React.RefObject<SVGSVGElement>;
  svgLines: { x1: number; y1: number; x2: number; y2: number; messageId: string }[];
  selectedLearningId: string | null;
  highlightedMessageIds: Set<string>;
  expandedMessages: Set<string>;
  onLearningSelect: (learning: LearningConnection) => void;
  onToggleMessage: (messageId: string) => void;
}

export function VisualModeView({
  messages,
  messagesLoading,
  learningConnections,
  learningConnectionsLoading,
  visualContainerRef,
  chatContainerRef,
  messageRefs,
  learningRefs,
  svgContainerRef,
  svgLines,
  selectedLearningId,
  highlightedMessageIds,
  expandedMessages,
  onLearningSelect,
  onToggleMessage,
}: VisualModeViewProps) {
  return (
    <div
      ref={visualContainerRef}
      className="mt-6 relative flex gap-6"
      style={{ minHeight: '700px' }}
    >
      {/* SVG Layer for Connection Lines */}
      <ConnectionLines svgLines={svgLines} svgContainerRef={svgContainerRef} />

      {/* Chat Timeline - Left Side */}
      <ChatTimeline
        messages={messages}
        messagesLoading={messagesLoading}
        chatContainerRef={chatContainerRef}
        messageRefs={messageRefs}
        expandedMessages={expandedMessages}
        highlightedMessageIds={highlightedMessageIds}
        onToggleMessage={onToggleMessage}
      />

      {/* Learning Cards - Right Sidebar */}
      <LearningCardsSidebar
        learningConnections={learningConnections}
        learningConnectionsLoading={learningConnectionsLoading}
        learningRefs={learningRefs}
        selectedLearningId={selectedLearningId}
        onLearningSelect={onLearningSelect}
      />
    </div>
  );
}
