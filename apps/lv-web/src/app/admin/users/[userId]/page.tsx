'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import * as React from 'react';
import { useAdminUserData } from '@/hooks/useAdminUserData';
import { useExpansionState } from '@/hooks/useExpansionState';
import { useVisualMode } from '@/hooks/useVisualMode';
import { QuickStatsSection } from '@/components/admin/user-detail/QuickStatsSection';
import { UserDetailsCard } from '@/components/admin/user-detail/UserDetailsCard';
import { ViewModeToggle } from '@/components/admin/user-detail/ViewModeToggle';
import { ChatHistoryList } from '@/components/admin/user-detail/ChatHistoryList';
import { LearningConnectionsList } from '@/components/admin/user-detail/LearningConnectionsList';
import { VisualModeView } from '@/components/admin/user-detail/VisualModeView';

interface AdminUserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('list');

  // Unwrap params using React.use() if it's a Promise, otherwise use directly
  // In tests, params may be a plain object, so we handle both cases
  let userId: string;
  if (params instanceof Promise) {
    // In Next.js 15, params is a Promise and needs to be unwrapped with React.use()
    // Check if React.use is available (it may not be in older React versions or test environments)
    if (React.use && typeof React.use === 'function') {
      userId = React.use(params).userId;
    } else {
      throw new Error('React.use() is not available. Please use React 19+ or ensure params is not a Promise in tests.');
    }
  } else {
    // In tests, params is a plain object
    userId = params.userId;
  }

  // Data fetching
  const {
    user,
    stats,
    loading,
    statsLoading,
    error,
    messages,
    messagesLoading,
    learningConnections,
    learningConnectionsLoading,
  } = useAdminUserData(userId);

  // Expansion state management
  const {
    expandedMessages,
    expandedLearnings,
    expandedLearningMessages,
    toggleMessage,
    toggleLearning,
    toggleLearningMessage,
  } = useExpansionState();

  // Visual mode logic
  const {
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
  } = useVisualMode(learningConnections, viewMode, messages);

  const handleViewModeChange = (mode: 'list' | 'visual') => {
    setViewMode(mode);
    if (mode === 'list') {
      resetSelection();
    }
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

      <QuickStatsSection stats={stats} statsLoading={statsLoading} />

      <UserDetailsCard user={user} />

      <ViewModeToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />

      {viewMode === 'list' && (
        <>
          <ChatHistoryList
            messages={messages}
            messagesLoading={messagesLoading}
            expandedMessages={expandedMessages}
            onToggleMessage={toggleMessage}
          />

          <LearningConnectionsList
            learningConnections={learningConnections}
            learningConnectionsLoading={learningConnectionsLoading}
            expandedLearnings={expandedLearnings}
            expandedLearningMessages={expandedLearningMessages}
            onToggleLearning={toggleLearning}
            onToggleLearningMessage={toggleLearningMessage}
          />
        </>
      )}

      {viewMode === 'visual' && (
        <VisualModeView
          messages={messages}
          messagesLoading={messagesLoading}
          learningConnections={learningConnections}
          learningConnectionsLoading={learningConnectionsLoading}
          visualContainerRef={visualContainerRef}
          chatContainerRef={chatContainerRef}
          messageRefs={messageRefs}
          learningRefs={learningRefs}
          svgContainerRef={svgContainerRef}
          svgLines={svgLines}
          selectedLearningId={selectedLearningId}
          highlightedMessageIds={highlightedMessageIds}
          expandedMessages={expandedMessages}
          onLearningSelect={handleLearningSelect}
          onToggleMessage={toggleMessage}
        />
      )}
    </div>
  );
}
