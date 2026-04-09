'use client';

import type { AdminJobEmbeddingStats } from '@/types/admin';
import { generateJobEmbeddings, uploadJobs } from '@/lib/services/pyapi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import { useCallback, useEffect, useState } from 'react';

const LAST_EMBEDDING_TRIGGER_KEY = 'lv-admin-job-embeddings-last-trigger';

export default function AdminJobsPage() {
  const [activeTab, setActiveTab] = useState('upload');

  const [filename, setFilename] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<{ message: string; status: number } | null>(null);
  const [uploadError, setUploadError] = useState('');

  const [stats, setStats] = useState<AdminJobEmbeddingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  const [embedConfirmOpen, setEmbedConfirmOpen] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedResponse, setEmbedResponse] = useState<{ message: string; status: number } | null>(null);
  const [embedError, setEmbedError] = useState('');
  const [lastTriggeredAt, setLastTriggeredAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(LAST_EMBEDDING_TRIGGER_KEY);
  });

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const res = await fetch('/api/admin/job-embeddings/stats');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load stats (${res.status})`);
      }
      const data: AdminJobEmbeddingStats = await res.json();
      setStats(data);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to load embedding stats');
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'embeddings') {
      void loadStats();
    }
  }, [activeTab, loadStats]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!filename.trim()) {
      setUploadError('Please enter a filename');
      return;
    }

    setUploadLoading(true);
    setUploadError('');
    setUploadResponse(null);

    try {
      const result = await uploadJobs(filename);
      setUploadResponse(result);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload jobs');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleConfirmGenerateEmbeddings = async () => {
    setEmbedConfirmOpen(false);
    setEmbedLoading(true);
    setEmbedError('');
    setEmbedResponse(null);

    try {
      const result = await generateJobEmbeddings();
      setEmbedResponse(result);
      const iso = new Date().toISOString();
      sessionStorage.setItem(LAST_EMBEDDING_TRIGGER_KEY, iso);
      setLastTriggeredAt(iso);
      void loadStats();
    } catch (err) {
      setEmbedError(err instanceof Error ? err.message : 'Failed to start embedding generation');
    } finally {
      setEmbedLoading(false);
    }
  };

  return (
    <div className="p-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl">
        <TabsList className="bg-gray-100 mb-4">
          <TabsTrigger value="upload">Upload job data</TabsTrigger>
          <TabsTrigger value="embeddings">Job embeddings</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload jobs from Google Cloud Storage to the database</h2>

            <form onSubmit={handleUploadSubmit}>
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
                    disabled={uploadLoading}
                    className="flex-1 px-3 py-2 rounded-r-lg focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={uploadLoading}
                className="px-5 py-2.5 rounded-lg text-white font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--gradient-primary)',
                }}
              >
                {uploadLoading ? 'Processing...' : 'Upload Jobs'}
              </button>
            </form>

            {uploadError && (
              <div
                className="mt-4 p-4 rounded-lg shadow-sm"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0" style={{ color: '#ef4444' }}>
                    ❌
                  </span>
                  <p className="font-medium" style={{ color: '#b91c1c' }}>
                    {uploadError}
                  </p>
                </div>
              </div>
            )}

            {uploadResponse && (
              <div
                className="mt-4 p-4 rounded-lg shadow-sm"
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0" style={{ color: '#10b981' }}>
                    ✓
                  </span>
                  <p className="font-medium" style={{ color: '#047857' }}>
                    {uploadResponse.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="embeddings">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Job search embeddings</h2>
            <p className="text-sm text-gray-600 mb-6">
              Generate vector embeddings for jobs that are missing them. This runs in the background on the API server
              and may take several minutes for large backlogs.
            </p>

            <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50/80">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Embedding status</h3>
                <button
                  type="button"
                  onClick={() => void loadStats()}
                  disabled={statsLoading}
                  className="text-sm font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
                >
                  {statsLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              {statsError && (
                <p className="text-sm text-red-700 mb-2">{statsError}</p>
              )}
              {statsLoading && !stats ? (
                <p className="text-sm text-gray-500">Loading stats…</p>
              ) : stats ? (
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>
                    <span className="font-medium text-gray-900">Total jobs:</span> {stats.totalJobs}
                  </li>
                  <li>
                    <span className="font-medium text-gray-900">Jobs with embeddings:</span>{' '}
                    {stats.jobsWithEmbeddings}
                  </li>
                  <li>
                    <span className="font-medium text-gray-900">Missing embeddings:</span>{' '}
                    {stats.missingEmbeddings}
                  </li>
                </ul>
              ) : null}
            </div>

            {lastTriggeredAt && (
              <p className="text-xs text-gray-500 mb-4">
                Last triggered:{' '}
                {new Date(lastTriggeredAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                <span className="block mt-1">
                  Generation runs asynchronously; counts update after jobs finish processing.
                </span>
              </p>
            )}

            <button
              type="button"
              disabled={embedLoading}
              onClick={() => setEmbedConfirmOpen(true)}
              className="px-5 py-2.5 rounded-lg text-white font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--gradient-primary)',
              }}
            >
              {embedLoading ? 'Starting…' : 'Trigger job embeddings'}
            </button>

            {embedError && (
              <div
                className="mt-4 p-4 rounded-lg shadow-sm"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0" style={{ color: '#ef4444' }}>
                    ❌
                  </span>
                  <p className="font-medium" style={{ color: '#b91c1c' }}>
                    {embedError}
                  </p>
                </div>
              </div>
            )}

            {embedResponse && (
              <div
                className="mt-4 p-4 rounded-lg shadow-sm"
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0" style={{ color: '#10b981' }}>
                    ✓
                  </span>
                  <div>
                    <p className="font-medium" style={{ color: '#047857' }}>
                      {embedResponse.message}
                    </p>
                    <p className="text-sm mt-2" style={{ color: '#047857' }}>
                      You can leave this page. Use Refresh above after a few minutes to verify counts.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={embedConfirmOpen} onOpenChange={setEmbedConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger job embeddings?</AlertDialogTitle>
            <AlertDialogDescription>
              This starts background embedding generation for all jobs that do not yet have a{' '}
              <code className="text-xs bg-muted px-1 rounded">job_embedding</code>. You can safely close this tab; the
              API will keep working. Only trigger again if a previous run failed or after new jobs were imported.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmGenerateEmbeddings();
              }}
            >
              Start embedding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
