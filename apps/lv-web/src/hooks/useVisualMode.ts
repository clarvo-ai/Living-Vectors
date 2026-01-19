import { useCallback, useEffect, useRef, useState } from 'react';
import type { LearningConnection, AdminUserMessage } from '@/types/admin';

export function useVisualMode(
  learningConnections: LearningConnection[],
  viewMode: 'list' | 'visual',
  messages: AdminUserMessage[] 
) {
  const [selectedLearningId, setSelectedLearningId] = useState<string | null>(null);
  const [highlightedMessageIds, setHighlightedMessageIds] = useState<Set<string>>(new Set());
  const [svgLines, setSvgLines] = useState<
    { x1: number; y1: number; x2: number; y2: number; messageId: string }[]
  >([]);

  // Refs for scrolling and SVG lines
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const learningRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const svgContainerRef = useRef<SVGSVGElement>(null);
  const visualContainerRef = useRef<HTMLDivElement>(null);

  // Handle learning selection in visual mode
  const handleLearningSelect = useCallback(
    (learning: LearningConnection) => {
      const isDeselecting = selectedLearningId === learning.id;

      if (isDeselecting) {
        setSelectedLearningId(null);
        setHighlightedMessageIds(new Set());
        return;
      }

      setSelectedLearningId(learning.id);
      const messageIds = new Set(learning.messages.map((m) => m.messageId));
      setHighlightedMessageIds(messageIds);

      // Auto-scroll to first related message
      if (learning.messages.length > 0) {
        const firstMessageId = learning.messages[0].messageId;
        const messageEl = messageRefs.current.get(firstMessageId);
        if (messageEl && chatContainerRef.current) {
          messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    [selectedLearningId]
  );

  // Draw SVG connection lines
  const drawConnectionLines = useCallback(() => {
    if (!svgContainerRef.current || !visualContainerRef.current || !selectedLearningId) {
      return [];
    }

    const selectedLearning = learningConnections.find((l) => l.id === selectedLearningId);
    if (!selectedLearning) return [];

    const learningEl = learningRefs.current.get(selectedLearningId);
    if (!learningEl) return [];

    const containerRect = visualContainerRef.current.getBoundingClientRect();
    const learningRect = learningEl.getBoundingClientRect();

    const lines: { x1: number; y1: number; x2: number; y2: number; messageId: string }[] = [];

    selectedLearning.messages.forEach((msg) => {
      const messageEl = messageRefs.current.get(msg.messageId);
      if (messageEl) {
        const messageRect = messageEl.getBoundingClientRect();

        // Calculate positions relative to the container
        const x1 = learningRect.left - containerRect.left;
        const y1 = learningRect.top - containerRect.top + learningRect.height / 2;
        const x2 = messageRect.right - containerRect.left;
        const y2 = messageRect.top - containerRect.top + messageRect.height / 2;

        lines.push({ x1, y1, x2, y2, messageId: msg.messageId });
      }
    });

    return lines;
  }, [selectedLearningId, learningConnections]);

  // Update SVG lines when selection changes or on scroll
  useEffect(() => {
    const updateLines = () => {
      if (viewMode === 'visual' && selectedLearningId) {
        setSvgLines(drawConnectionLines());
      } else {
        setSvgLines([]);
      }
    };

    updateLines();

    // Also update on scroll
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', updateLines);
      return () => chatContainer.removeEventListener('scroll', updateLines);
    }
  }, [viewMode, selectedLearningId, drawConnectionLines, messages, learningConnections]);

  const resetSelection = () => {
    setSelectedLearningId(null);
    setHighlightedMessageIds(new Set());
  };

  return {
    selectedLearningId,
    highlightedMessageIds,
    svgLines,
    chatContainerRef,
    messageRefs,
    learningRefs,
    svgContainerRef,
    visualContainerRef,
    handleLearningSelect,
    resetSelection,
  };
}
