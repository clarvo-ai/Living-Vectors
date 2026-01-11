import { useState } from 'react';

export function useExpansionState() {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [expandedLearnings, setExpandedLearnings] = useState<Set<string>>(new Set());
  const [expandedLearningMessages, setExpandedLearningMessages] = useState<Set<string>>(
    new Set()
  );

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

  return {
    expandedMessages,
    expandedLearnings,
    expandedLearningMessages,
    toggleMessage,
    toggleLearning,
    toggleLearningMessage,
  };
}
