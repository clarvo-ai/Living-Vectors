jest.mock('../../config', () => ({
  PYAPI_URL: 'https://pyapi.test',
}));

import { generateJobEmbeddings } from '@/lib/services/pyapi';

describe('generateJobEmbeddings', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POSTs to the generate-embeddings endpoint and returns the payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 200, message: 'Embedding generation started in background' }),
    });

    const result = await generateJobEmbeddings();

    expect(global.fetch).toHaveBeenCalledWith('https://pyapi.test/api/jobs/generate-embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(result).toEqual({
      status: 200,
      message: 'Embedding generation started in background',
    });
  });

  it('prefers message over detail when the response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ message: 'Custom failure' }),
    });

    await expect(generateJobEmbeddings()).rejects.toThrow('Custom failure');
  });

  it('stringifies FastAPI string detail when the response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unprocessable Entity',
      json: async () => ({ detail: 'Invalid payload' }),
    });

    await expect(generateJobEmbeddings()).rejects.toThrow('Invalid payload');
  });

  it('joins FastAPI validation detail messages when the response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unprocessable Entity',
      json: async () => ({
        detail: [{ msg: 'field required' }, { msg: 'too short' }],
      }),
    });

    await expect(generateJobEmbeddings()).rejects.toThrow('field required, too short');
  });

  it('falls back to statusText when no message or detail is present', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Gateway Timeout',
      json: async () => ({}),
    });

    await expect(generateJobEmbeddings()).rejects.toThrow(
      'Failed to start embedding generation: Gateway Timeout',
    );
  });
});
