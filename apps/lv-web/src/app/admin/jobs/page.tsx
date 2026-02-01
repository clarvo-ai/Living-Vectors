'use client';

import { uploadJobs } from '@/lib/services/pyapi';
import { useState } from 'react';

export default function AdminJobsPage() {
  const [filename, setFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!filename.trim()) {
      setError('Please enter a filename');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const result = await uploadJobs(filename);
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
            <label className="block text-sm font-medium mb-2">Job File Name (in GCS bucket)</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="jobs-xxxxxxxx-total-x.csv"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">Enter the CSV file name in your GCS bucket</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Upload Jobs'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <p className="text-red-700 font-medium">❌ {error}</p>
          </div>
        )}

        {response && (
          <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <p className="text-green-700 font-medium">✓ {response.message}</p>
          </div>
        )}
      </div>

      <p>Manage job listings here.</p>
    </div>
  );
}
