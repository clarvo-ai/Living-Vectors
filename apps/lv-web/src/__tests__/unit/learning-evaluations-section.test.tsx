import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LearningEvaluationsSection } from '../../components/admin/user-detail/LearningEvaluationsSection';
import type { LearningConnection } from '../../types/admin';

// Tests for LearningEvaluationsSection:
// - Loading state, empty state, initial "Run Evaluations" button
// - Calls evaluateLearning for each learning on button click
// - Shows loading cards during evaluation, results after completion
// - Shows error cards when evaluation fails
// - Shows average scores summary
// - Shows "Re-run Evaluations" button after completion

jest.mock('../../lib/services/pyapi', () => ({
  evaluateLearning: jest.fn(),
}));

import { evaluateLearning } from '../../lib/services/pyapi';
const mockEvaluateLearning = evaluateLearning as jest.Mock;

const mockLearning1: LearningConnection = {
  id: 'learning-1',
  summary: 'Enjoys building web applications',
  createdAt: '2024-01-01T00:00:00.000Z',
  messages: [
    {
      messageId: 'msg-1',
      sender: 'USER',
      content: 'I love building web apps',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
};

const mockLearning2: LearningConnection = {
  id: 'learning-2',
  summary: 'Specializes in debugging CSS issues',
  createdAt: '2024-01-02T00:00:00.000Z',
  messages: [
    {
      messageId: 'msg-2',
      sender: 'USER',
      content: 'I debug CSS a lot',
      createdAt: '2024-01-02T00:00:00.000Z',
    },
    {
      messageId: 'msg-3',
      sender: 'AI',
      content: 'Tell me more',
      createdAt: '2024-01-02T00:01:00.000Z',
    },
  ],
};

const mockEvaluationResult = {
  accuracy: 0.9,
  relevance: 0.8,
  coherence: 0.85,
  overallScore: 0.85,
  feedback: 'High quality learning statement.',
  evaluatedAt: '2024-01-01T12:00:00.000Z',
};

describe('LearningEvaluationsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state when learningConnectionsLoading is true', () => {
    render(
      <LearningEvaluationsSection learningConnections={[]} learningConnectionsLoading={true} />
    );
    expect(screen.getByText('Loading learnings…')).toBeInTheDocument();
  });

  it('shows empty state when no learnings', () => {
    render(
      <LearningEvaluationsSection learningConnections={[]} learningConnectionsLoading={false} />
    );
    expect(screen.getByText('No learnings to evaluate')).toBeInTheDocument();
  });

  it('shows Run Evaluations button with learning count', () => {
    render(
      <LearningEvaluationsSection
        learningConnections={[mockLearning1, mockLearning2]}
        learningConnectionsLoading={false}
      />
    );
    expect(screen.getByRole('button', { name: /Run Evaluations/i })).toBeInTheDocument();
    expect(screen.getByText('Evaluate 2 learnings using the LLM judge')).toBeInTheDocument();
  });

  it('shows singular "learning" for a single learning', () => {
    render(
      <LearningEvaluationsSection
        learningConnections={[mockLearning1]}
        learningConnectionsLoading={false}
      />
    );
    expect(screen.getByText('Evaluate 1 learning using the LLM judge')).toBeInTheDocument();
  });

  it('calls evaluateLearning for each learning when button is clicked', async () => {
    mockEvaluateLearning.mockResolvedValue(mockEvaluationResult);

    render(
      <LearningEvaluationsSection
        learningConnections={[mockLearning1, mockLearning2]}
        learningConnectionsLoading={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Evaluations/i }));

    await waitFor(() => {
      expect(mockEvaluateLearning).toHaveBeenCalledTimes(2);
    });

    expect(mockEvaluateLearning).toHaveBeenCalledWith(
      mockLearning1.summary,
      mockLearning1.messages.map((m) => m.content)
    );
    expect(mockEvaluateLearning).toHaveBeenCalledWith(
      mockLearning2.summary,
      mockLearning2.messages.map((m) => m.content)
    );
  });

  it('shows loading cards after clicking Run Evaluations', () => {
    // Never resolves so we can inspect the loading state
    mockEvaluateLearning.mockImplementation(() => new Promise(() => {}));

    render(
      <LearningEvaluationsSection
        learningConnections={[mockLearning1, mockLearning2]}
        learningConnectionsLoading={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Evaluations/i }));

    expect(screen.getAllByText('🧠 Evaluating…')).toHaveLength(2);
    expect(screen.getByText('Enjoys building web applications')).toBeInTheDocument();
    expect(screen.getByText('Specializes in debugging CSS issues')).toBeInTheDocument();
  });

  it('shows evaluation results after API resolves', async () => {
    mockEvaluateLearning.mockResolvedValue(mockEvaluationResult);

    render(
      <LearningEvaluationsSection
        learningConnections={[mockLearning1]}
        learningConnectionsLoading={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Evaluations/i }));

    await waitFor(() => {
      expect(screen.getByText('🧠 LLM Evaluation')).toBeInTheDocument();
    });

    // Score appears in both badge and bar label, so use getAllByText
    expect(screen.getAllByText('90%').length).toBeGreaterThan(0); // accuracy
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0); // relevance
    expect(screen.getAllByText('85%').length).toBeGreaterThan(0); // coherence
    expect(screen.getByText('High quality learning statement.')).toBeInTheDocument();
  });

  it('shows error card when evaluation fails', async () => {
    mockEvaluateLearning.mockRejectedValue(new Error('API error'));

    render(
      <LearningEvaluationsSection
        learningConnections={[mockLearning1]}
        learningConnectionsLoading={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Evaluations/i }));

    await waitFor(() => {
      expect(screen.getByText('⚠️ Evaluation failed')).toBeInTheDocument();
    });
  });

  it('shows average scores summary when at least one evaluation is done', async () => {
    mockEvaluateLearning.mockResolvedValue(mockEvaluationResult);

    render(
      <LearningEvaluationsSection
        learningConnections={[mockLearning1, mockLearning2]}
        learningConnectionsLoading={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Evaluations/i }));

    await waitFor(() => {
      expect(screen.getByText(/Average Scores/i)).toBeInTheDocument();
    });
  });

  it('shows Re-run Evaluations button after all evaluations complete', async () => {
    mockEvaluateLearning.mockResolvedValue(mockEvaluationResult);

    render(
      <LearningEvaluationsSection
        learningConnections={[mockLearning1, mockLearning2]}
        learningConnectionsLoading={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Evaluations/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Re-run Evaluations/i })).toBeInTheDocument();
    });
  });

  it('shows progress counter while evaluations are running', async () => {
    let resolveFirst: (v: unknown) => void;
    const firstPromise = new Promise((res) => {
      resolveFirst = res;
    });

    mockEvaluateLearning
      .mockReturnValueOnce(firstPromise)
      .mockImplementation(() => new Promise(() => {})); // second never resolves

    render(
      <LearningEvaluationsSection
        learningConnections={[mockLearning1, mockLearning2]}
        learningConnectionsLoading={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Evaluations/i }));

    // Resolve first evaluation
    resolveFirst!(mockEvaluationResult);

    await waitFor(() => {
      expect(screen.getByText('1 / 2 evaluated')).toBeInTheDocument();
    });
  });
});
