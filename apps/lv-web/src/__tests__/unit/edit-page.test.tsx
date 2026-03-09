import EditPage from '@/app/dashboard/edit/page';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from 'next-auth/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/lib/services/pyapi', () => ({
  generateUserEmbedding: jest.fn().mockResolvedValue(undefined),
}));

// dnd-kit doesn't work in jsdom — stub out just enough for the list to render
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: class {},
  KeyboardSensor: class {},
  closestCenter: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  arrayMove: jest.fn((arr: unknown[], from: number, to: number) => {
    const next = [...arr];
    next.splice(to, 0, next.splice(from, 1)[0]);
    return next;
  }),
  sortableKeyboardCoordinates: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: jest.fn(),
}));

jest.mock('@dnd-kit/modifiers', () => ({
  restrictToVerticalAxis: jest.fn(),
  restrictToWindowEdges: jest.fn(),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: jest.fn(() => '') } },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockSession = {
  data: { user: { id: 'user-123', name: 'Test User', email: 'test@example.com' } },
  status: 'authenticated',
};

const makeLearning = (id: string, summary: string, order_index: number) => ({
  id,
  userId: 'user-123',
  summary,
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  order_index,
});

function mockFetchWithLearnings(learnings: ReturnType<typeof makeLearning>[]) {
  global.fetch = jest.fn((url: RequestInfo | URL, options?: RequestInit) => {
    const urlStr = url.toString();
    if (urlStr === '/api/learnings' && !options?.method) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ body: learnings, status: 200 }),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ status: 200 }),
    } as Response);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  (useSession as jest.Mock).mockReturnValue(mockSession);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('EditPage — initial render', () => {
  it('shows loading state then renders learnings as criteria', async () => {
    const learnings = [
      makeLearning('id-1', 'Python experience', 0),
      makeLearning('id-2', 'Team leadership', 1),
    ];
    mockFetchWithLearnings(learnings);

    render(<EditPage />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Python experience')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Team leadership')).toBeInTheDocument();
    });
  });

  it('shows the "Do these criteria match your search?" title when learnings are loaded', async () => {
    mockFetchWithLearnings([makeLearning('id-1', 'React skills', 0)]);

    render(<EditPage />);

    await waitFor(() => {
      expect(screen.getByText('Do these criteria match your search?')).toBeInTheDocument();
    });
  });

  it('shows empty state when there are no learnings', async () => {
    mockFetchWithLearnings([]);

    render(<EditPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Your Evaluation Criteria')).toBeInTheDocument();
    });
  });

  it('renders priority numbers in correct order', async () => {
    const learnings = [
      makeLearning('id-1', 'First criterion', 0),
      makeLearning('id-2', 'Second criterion', 1),
      makeLearning('id-3', 'Third criterion', 2),
    ];
    mockFetchWithLearnings(learnings);

    render(<EditPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('First criterion')).toBeInTheDocument();
    });

    // Priority numbers 1, 2, 3 should all appear
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('EditPage — adding criteria', () => {
  it('adds a new empty criterion when "+ Add Criterion" is clicked', async () => {
    const user = userEvent.setup();
    mockFetchWithLearnings([makeLearning('id-1', 'Existing skill', 0)]);

    render(<EditPage />);
    await waitFor(() => screen.getByDisplayValue('Existing skill'));

    await user.click(screen.getByText('+ Add Criterion'));

    const textareas = screen.getAllByRole('textbox');
    expect(textareas).toHaveLength(2);
    expect(textareas[1]).toHaveValue('');
  });

  it('new criterion gets the next priority number', async () => {
    const user = userEvent.setup();
    mockFetchWithLearnings([makeLearning('id-1', 'Existing', 0)]);

    render(<EditPage />);
    await waitFor(() => screen.getByDisplayValue('Existing'));

    await user.click(screen.getByText('+ Add Criterion'));

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('transitions title to "Set Up Evaluation Criteria" when adding first criterion from empty state', async () => {
    const user = userEvent.setup();
    mockFetchWithLearnings([]);

    render(<EditPage />);
    await waitFor(() => screen.getByText('Add Your Evaluation Criteria'));

    await user.click(screen.getByText('+ Add Your First Criterion'));

    expect(screen.getByText('Set Up Evaluation Criteria')).toBeInTheDocument();
  });
});

describe('EditPage — editing criteria text', () => {
  it('updates criterion text when user types in the textarea', async () => {
    const user = userEvent.setup();
    mockFetchWithLearnings([makeLearning('id-1', 'Old text', 0)]);

    render(<EditPage />);
    await waitFor(() => screen.getByDisplayValue('Old text'));

    const textarea = screen.getByDisplayValue('Old text');
    await user.clear(textarea);
    await user.type(textarea, 'New text');

    expect(screen.getByDisplayValue('New text')).toBeInTheDocument();
  });
});

describe('EditPage — removing criteria (soft-delete)', () => {
  it('removes the criterion from the list when × is clicked', async () => {
    const user = userEvent.setup();
    mockFetchWithLearnings([
      makeLearning('id-1', 'Keep this', 0),
      makeLearning('id-2', 'Delete this', 1),
    ]);

    render(<EditPage />);
    await waitFor(() => screen.getByDisplayValue('Delete this'));

    const removeButtons = screen.getAllByTitle('Delete criterion');
    await user.click(removeButtons[1]); // second criterion

    expect(screen.queryByDisplayValue('Delete this')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Keep this')).toBeInTheDocument();
  });

  it('calls PATCH /api/learnings/:id (soft-delete) when a persisted criterion is removed', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((url: RequestInfo | URL, options?: RequestInit) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 200 }),
      } as Response);
    });

    // Initial GET
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            body: [makeLearning('id-abc', 'Criterion to delete', 0)],
            status: 200,
          }),
      } as Response)
    );

    global.fetch = fetchMock;

    render(<EditPage />);
    await waitFor(() => screen.getByDisplayValue('Criterion to delete'));

    await user.click(screen.getByTitle('Delete criterion'));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          url.toString().includes('/api/learnings/id-abc') && opts?.method === 'PATCH'
      );
      expect(patchCall).toBeDefined();
    });
  });

  it('does NOT call PATCH for unsaved criteria (no id) when removed', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((url: RequestInfo | URL, options?: RequestInit) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ body: [], status: 200 }),
      } as Response);
    });
    global.fetch = fetchMock;

    render(<EditPage />);
    await waitFor(() => screen.getByText('Add Your Evaluation Criteria'));

    // Add a new (unsaved) criterion
    await user.click(screen.getByText('+ Add Your First Criterion'));
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Unsaved criterion');

    // Remove it
    await user.click(screen.getByTitle('Delete criterion'));

    // Only the initial GET should have been called — no PATCH
    const patchCalls = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === 'PATCH'
    );
    expect(patchCalls).toHaveLength(0);
  });

  it('re-numbers priorities after a criterion is removed', async () => {
    const user = userEvent.setup();
    mockFetchWithLearnings([
      makeLearning('id-1', 'First', 0),
      makeLearning('id-2', 'Second', 1),
      makeLearning('id-3', 'Third', 2),
    ]);

    render(<EditPage />);
    await waitFor(() => screen.getByDisplayValue('Second'));

    // Remove the first criterion
    const removeButtons = screen.getAllByTitle('Delete criterion');
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByDisplayValue('First')).not.toBeInTheDocument();
    });

    // Remaining two should be renumbered 1 and 2
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });
});

describe('EditPage — Confirm & Update Jobs button', () => {
  it('is disabled when criteria list is empty', async () => {
    mockFetchWithLearnings([]);

    render(<EditPage />);
    await waitFor(() => screen.getByText('Add Your Evaluation Criteria'));

    expect(screen.getByText('Confirm & Update Jobs')).toBeDisabled();
  });

  it('is disabled when any criterion has empty text', async () => {
    const user = userEvent.setup();
    mockFetchWithLearnings([makeLearning('id-1', 'Valid criterion', 0)]);

    render(<EditPage />);
    await waitFor(() => screen.getByDisplayValue('Valid criterion'));

    await user.click(screen.getByText('+ Add Criterion'));
    // Second textarea is empty

    expect(screen.getByText('Confirm & Update Jobs')).toBeDisabled();
  });

  it('calls PATCH /api/learnings/order and generateUserEmbedding on confirm', async () => {
    const user = userEvent.setup();
    const { generateUserEmbedding } = jest.requireMock('@/lib/services/pyapi');
    const fetchMock = jest.fn();

    // GET learnings
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            body: [makeLearning('id-1', 'Criterion A', 0)],
            status: 200,
          }),
      } as Response)
    );
    // PATCH order
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 200 }),
      } as Response)
    );

    global.fetch = fetchMock;

    render(<EditPage />);
    await waitFor(() => screen.getByDisplayValue('Criterion A'));

    await user.click(screen.getByText('Confirm & Update Jobs'));

    await waitFor(() => {
      const orderPatch = fetchMock.mock.calls.find(
        ([url, opts]) =>
          url.toString().includes('/api/learnings/order') && opts?.method === 'PATCH'
      );
      expect(orderPatch).toBeDefined();
      // Verify payload shape
      const body = JSON.parse(orderPatch![1].body as string);
      expect(body).toEqual([{ id: 'id-1', order_index: 0 }]);
    });

    expect(generateUserEmbedding).toHaveBeenCalledWith('user-123');
  });

  it('POSTs unsaved criteria before saving order on confirm', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn();

    // GET (empty)
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ body: [], status: 200 }),
      } as Response)
    );
    // POST new learning
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ body: { id: 'new-id-99' }, status: 201 }),
      } as Response)
    );
    // PATCH order
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 200 }),
      } as Response)
    );

    global.fetch = fetchMock;

    render(<EditPage />);
    await waitFor(() => screen.getByText('Add Your Evaluation Criteria'));

    await user.click(screen.getByText('+ Add Your First Criterion'));
    await user.type(screen.getByRole('textbox'), 'Brand new criterion');

    await user.click(screen.getByText('Confirm & Update Jobs'));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          url.toString() === '/api/learnings' && opts?.method === 'POST'
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body as string);
      expect(body.summary).toBe('Brand new criterion');
    });
  });
});
