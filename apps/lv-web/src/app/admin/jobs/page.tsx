'use client';

import { uploadJobs } from '@/lib/services/pyapi';
import { useState } from 'react';

export default function AdminJobsPage() {
  const [filename, setFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ message: string; status: number } | null>(null);
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
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload jobs from Google Cloud Storage</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Enter CSV Filename</label>
            <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
              <span className="px-3 py-2 bg-gray-100 text-gray-600 border-r border-gray-300 whitespace-nowrap rounded-l-lg">
                lv-storage/job-data/
              </span>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="jobs-xxxxxxxx-total-x.csv"
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-r-lg focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg text-white font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--gradient-primary)',
            }}
          >
            {loading ? 'Processing...' : 'Upload Jobs'}
          </button>
        </form>

        {error && (
          <div 
            className="mt-4 p-4 rounded-lg shadow-sm"
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0" style={{ color: '#ef4444' }}>❌</span>
              <p className="font-medium" style={{ color: '#b91c1c' }}>{error}</p>
            </div>
          </div>
        )}

        {response && (
          <div 
            className="mt-4 p-4 rounded-lg shadow-sm"
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0" style={{ color: '#10b981' }}>✓</span>
              <p className="font-medium" style={{ color: '#047857' }}>{response.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
