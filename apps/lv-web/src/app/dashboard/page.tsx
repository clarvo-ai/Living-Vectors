'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PyAPIHealthResponse,
  checkHealth,
  getGeminiResponse,
  getHello,
} from '@/lib/services/pyapi';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pyApiHealth, setPyApiHealth] = useState<PyAPIHealthResponse | null>(null);
  const [pyApiMessage, setPyApiMessage] = useState<string>('');
  const [pyApiLoading, setPyApiLoading] = useState(true);
  const [pyApiError, setPyApiError] = useState<string>('');
  const [message, setMessage] = useState<string>('LOADING');

  useEffect(() => {
    const prompt = 'Say 3 funny words, nothing else.';
    async function fetchGemini() {
      try {
        const result = await getGeminiResponse(prompt);
        setMessage(result.message);
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchGemini();
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchPyApiData = async () => {
      try {
        setPyApiLoading(true);
        setPyApiError('');

        // Fetch health status and hello message
        const [healthResponse, helloResponse] = await Promise.all([checkHealth(), getHello()]);

        setPyApiHealth(healthResponse);
        setPyApiMessage(helloResponse.message);
      } catch (error) {
        console.error('Failed to fetch PyAPI data:', error);
        setPyApiError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setPyApiLoading(false);
      }
    };

    if (session) {
      fetchPyApiData();
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <Button onClick={() => signOut({ callbackUrl: '/login' })} variant="outline">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Manage your account information and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <strong>Name:</strong> {session.user?.name || 'Not set'}
                  </p>
                  <p>
                    <strong>Email:</strong> {session.user?.email}
                  </p>
                </div>
                <Link href="/profile">
                  <Button className="w-full mt-4">Edit Profile</Button>
                </Link>
              </CardContent>
            </Card>

            {/* PyAPI Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Python API Status</CardTitle>
                <CardDescription>Live connection to the Living Vectors Python API</CardDescription>
              </CardHeader>
              <CardContent>
                {pyApiLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Connecting...</span>
                  </div>
                ) : pyApiError ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-red-600">Connection Failed</span>
                    </div>
                    <p className="text-sm text-gray-600">{pyApiError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="w-full mt-2"
                    >
                      Retry Connection
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-green-600">
                        {pyApiHealth?.status === 'healthy' ? 'Connected' : 'Unknown Status'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Service:</strong> {pyApiHealth?.service || 'N/A'}
                      </p>
                      <p className="text-sm">
                        <strong>Message:</strong> {pyApiMessage || 'No message'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="w-full mt-2"
                    >
                      Refresh Status
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          <div className="flex justify-end mt-4">
            <Link href="/interview">
              <Button size="sm" variant="default">
                Go to Interview
              </Button>
            </Link>
          </div>
          </div>

          {/* Additional Content Section */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Living Vectors!</CardTitle>
                <p>{message}</p>
                <CardDescription>Your playground for innovation and creativity</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  Welcome to the Living Vectors team! This is your playground. A space where
                  innovation meets creativity, and where your ideas can come to life. I&apos;m
                  incredibly excited to see what amazing things you&apos;ll build and discover as
                  you take this project forward.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  This project is in our hands now, and I&apos;m confident we&apos;ll take it to new
                  heights together. Let&apos;s explore, experiment, and not be afraid to push
                  boundaries. The possibilities are endless, and I can&apos;t wait to see the
                  incredible solutions we&apos;ll create together.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  I wish you all the best of luck on this journey! Remember, this is your space to
                  learn, grow, and innovate. Enjoy every moment of the process, and please
                  don&apos;t hesitate to reach out whenever you feel like it. I want to support you
                  throughout the whole course.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4 font-medium">
                  Best regards,
                  <br />
                  <span className="text-blue-600">Juha Lehto</span>
                  <br />
                  Living Vectors Product Owner
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
