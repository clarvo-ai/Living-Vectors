'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { evaluateLearning } from '@/lib/services/pyapi';
import type { LearningConnection, LearningEvaluation } from '@/types/admin';
import { useCallback, useState } from 'react';

interface LearningEvaluationsSectionProps {
  learningConnections: LearningConnection[];
  learningConnectionsLoading: boolean;
}

type EvalState = LearningEvaluation | 'loading' | 'error';

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (score === null) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">—</span>
      </div>
    );
  }

  const percentage = Math.round(score * 100);
  const getScoreColor = (s: number) => {
    if (s >= 0.75) return 'text-emerald-600 bg-emerald-100';
    if (s >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-muted-foreground mb-1">{label}</span>
      <span
        className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${getScoreColor(score)}`}
      >
        {percentage}%
      </span>
    </div>
  );
}

function ScoreBar({ score, label }: { score: number | null; label: string }) {
  if (score === null) return null;

  const percentage = Math.round(score * 100);
  const getBarColor = (s: number): string => {
    if (s >= 0.75) return '#10b981'; // emerald-500
    if (s >= 0.5) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-r-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: getBarColor(score) }}
        />
      </div>
      <span className="text-xs font-medium w-10 text-right">{percentage}%</span>
    </div>
  );
}

function EvaluationLoadingCard({ learning }: { learning: LearningConnection }) {
  return (
    <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-purple-50/50 to-indigo-50/50 border-purple-200">
      <div className="p-4 border-b border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 animate-pulse">
            🧠 Evaluating…
          </span>
        </div>
        <p className="text-sm font-medium text-purple-900 mb-2">{learning.summary}</p>
        <p className="text-xs text-muted-foreground">
          Based on {learning.messages.length} source message
          {learning.messages.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="p-4 bg-white/50">
        <div className="grid grid-cols-4 gap-4">
          {['Accuracy', 'Relevance', 'Coherence', 'Overall'].map((label) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground mb-1">{label}</span>
              <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvaluationErrorCard({ learning }: { learning: LearningConnection }) {
  return (
    <div className="border rounded-lg overflow-hidden border-red-200 bg-red-50/50">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            ⚠️ Evaluation failed
          </span>
        </div>
        <p className="text-sm text-gray-700">{learning.summary}</p>
      </div>
    </div>
  );
}

function EvaluationCard({
  learning,
  evaluation,
}: {
  learning: LearningConnection;
  evaluation: LearningEvaluation;
}) {
  return (
    <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-purple-50/50 to-indigo-50/50 border-purple-200">
      {/* Learning Summary */}
      <div className="p-4 border-b border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
            🧠 LLM Evaluation
          </span>
          {evaluation.evaluatedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(evaluation.evaluatedAt).toLocaleString()}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-purple-900 mb-2">{learning.summary}</p>
        <p className="text-xs text-muted-foreground">
          Based on {learning.messages.length} source message
          {learning.messages.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Scores Grid */}
      <div className="p-4 bg-white/50">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <ScoreBadge score={evaluation.accuracy} label="Accuracy" />
          <ScoreBadge score={evaluation.relevance} label="Relevance" />
          <ScoreBadge score={evaluation.coherence} label="Coherence" />
          <ScoreBadge score={evaluation.overallScore} label="Overall" />
        </div>

        {/* Score Bars */}
        <div className="space-y-2 mb-4">
          <ScoreBar score={evaluation.accuracy} label="Accuracy" />
          <ScoreBar score={evaluation.relevance} label="Relevance" />
          <ScoreBar score={evaluation.coherence} label="Coherence" />
        </div>

        {/* Feedback */}
        {evaluation.feedback && (
          <div className="mt-4 pt-4 border-t border-purple-100">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              💬 Judge Feedback
            </p>
            <p className="text-sm text-gray-700 leading-relaxed bg-white rounded-md p-3 border border-gray-100">
              {evaluation.feedback}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function LearningEvaluationsSection({
  learningConnections,
  learningConnectionsLoading,
}: LearningEvaluationsSectionProps) {
  const [evaluations, setEvaluations] = useState<Record<string, EvalState>>({});
  const [started, setStarted] = useState(false);

  const runEvaluations = useCallback(() => {
    if (learningConnections.length === 0) return;
    setStarted(true);
    setEvaluations(Object.fromEntries(learningConnections.map((l) => [l.id, 'loading'])));

    learningConnections.forEach((learning) => {
      evaluateLearning(
        learning.summary,
        learning.messages.map((m) => m.content)
      )
        .then((result) => setEvaluations((prev) => ({ ...prev, [learning.id]: result })))
        .catch(() => setEvaluations((prev) => ({ ...prev, [learning.id]: 'error' })));
    });
  }, [learningConnections]);

  const doneEvaluations = Object.values(evaluations).filter(
    (e): e is LearningEvaluation => e !== 'loading' && e !== 'error'
  );

  const avg = (
    key: keyof Pick<LearningEvaluation, 'accuracy' | 'relevance' | 'coherence' | 'overallScore'>
  ) => {
    const vals = doneEvaluations.map((e) => e[key]).filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const doneCount = doneEvaluations.length;
  const totalCount = learningConnections.length;
  const isRunning = started && doneCount < totalCount;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>🧪 Learning Evaluations</CardTitle>
          {started ? (
            <span className="text-sm text-muted-foreground">
              {doneCount} / {totalCount} evaluated
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {totalCount} learning{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {learningConnectionsLoading ? (
          <p className="text-muted-foreground">Loading learnings…</p>
        ) : learningConnections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No learnings to evaluate</p>
          </div>
        ) : !started ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Evaluate {totalCount} learning{totalCount !== 1 ? 's' : ''} using the LLM judge
            </p>
            <Button onClick={runEvaluations} variant="default">
              🧠 Run Evaluations
            </Button>
          </div>
        ) : (
          <>
            {doneCount > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                <p className="text-sm font-medium text-indigo-900 mb-3">
                  📊 Average Scores ({doneCount} evaluated{isRunning ? '…' : ''})
                </p>
                <div className="grid grid-cols-4 gap-4">
                  <ScoreBadge score={avg('accuracy')} label="Avg Accuracy" />
                  <ScoreBadge score={avg('relevance')} label="Avg Relevance" />
                  <ScoreBadge score={avg('coherence')} label="Avg Coherence" />
                  <ScoreBadge score={avg('overallScore')} label="Avg Overall" />
                </div>
              </div>
            )}

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {learningConnections.map((learning) => {
                const state = evaluations[learning.id];
                if (!state || state === 'loading') {
                  return <EvaluationLoadingCard key={learning.id} learning={learning} />;
                }
                if (state === 'error') {
                  return <EvaluationErrorCard key={learning.id} learning={learning} />;
                }
                return <EvaluationCard key={learning.id} learning={learning} evaluation={state} />;
              })}
            </div>

            {!isRunning && doneCount > 0 && (
              <div className="mt-4 text-center">
                <Button onClick={runEvaluations} variant="outline" size="sm">
                  🔄 Re-run Evaluations
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
