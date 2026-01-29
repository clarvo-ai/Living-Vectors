import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LearningConnection, LearningEvaluation } from '@/types/admin';

interface LearningEvaluationsSectionProps {
  learningConnections: LearningConnection[];
  learningConnectionsLoading: boolean;
}

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
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-600 bg-emerald-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
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
  const getBarColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor(score)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium w-10 text-right">{percentage}%</span>
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
              Evaluated: {new Date(evaluation.evaluatedAt).toLocaleString()}
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
  const evaluatedLearnings = learningConnections.filter((l) => l.evaluation);
  const totalLearnings = learningConnections.length;
  const evaluatedCount = evaluatedLearnings.length;

  // Calculate average scores
  const averageScores = evaluatedLearnings.reduce(
    (acc, l) => {
      if (l.evaluation) {
        if (l.evaluation.accuracy !== null) {
          acc.accuracy.sum += l.evaluation.accuracy;
          acc.accuracy.count++;
        }
        if (l.evaluation.relevance !== null) {
          acc.relevance.sum += l.evaluation.relevance;
          acc.relevance.count++;
        }
        if (l.evaluation.coherence !== null) {
          acc.coherence.sum += l.evaluation.coherence;
          acc.coherence.count++;
        }
        if (l.evaluation.overallScore !== null) {
          acc.overall.sum += l.evaluation.overallScore;
          acc.overall.count++;
        }
      }
      return acc;
    },
    {
      accuracy: { sum: 0, count: 0 },
      relevance: { sum: 0, count: 0 },
      coherence: { sum: 0, count: 0 },
      overall: { sum: 0, count: 0 },
    }
  );

  const avgAccuracy =
    averageScores.accuracy.count > 0
      ? averageScores.accuracy.sum / averageScores.accuracy.count
      : null;
  const avgRelevance =
    averageScores.relevance.count > 0
      ? averageScores.relevance.sum / averageScores.relevance.count
      : null;
  const avgCoherence =
    averageScores.coherence.count > 0
      ? averageScores.coherence.sum / averageScores.coherence.count
      : null;
  const avgOverall =
    averageScores.overall.count > 0
      ? averageScores.overall.sum / averageScores.overall.count
      : null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>🧪 Learning Evaluations</CardTitle>
          <span className="text-sm text-muted-foreground">
            {evaluatedCount} of {totalLearnings} evaluated
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {learningConnectionsLoading ? (
          <p className="text-muted-foreground">Loading evaluations…</p>
        ) : evaluatedLearnings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">No learnings have been evaluated yet</p>
            <p className="text-xs text-muted-foreground">
              Evaluations are generated when learnings are assessed by the LLM judge
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
              <p className="text-sm font-medium text-indigo-900 mb-3">📊 Average Scores</p>
              <div className="grid grid-cols-4 gap-4">
                <ScoreBadge score={avgAccuracy} label="Avg Accuracy" />
                <ScoreBadge score={avgRelevance} label="Avg Relevance" />
                <ScoreBadge score={avgCoherence} label="Avg Coherence" />
                <ScoreBadge score={avgOverall} label="Avg Overall" />
              </div>
            </div>

            {/* Individual Evaluations */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {evaluatedLearnings.map((learning) => (
                <EvaluationCard
                  key={learning.id}
                  learning={learning}
                  evaluation={learning.evaluation!}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
