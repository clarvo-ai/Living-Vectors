'use client';

import { uploadJobs } from '@/lib/services/pyapi';
import { useState } from 'react';

export default function AdminJobsPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const result = await uploadJobs(url);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload jobs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Job Listings</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Jobs from URL</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Job File URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/jobs.csv"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Upload Jobs'}
          </button>
        </form>

        {error && <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">{error}</div>}

        {response && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg">
            <pre className="whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
          </div>
        )}
      </div>

      <p>Manage job listings here.</p>
    </div>
  );
}
