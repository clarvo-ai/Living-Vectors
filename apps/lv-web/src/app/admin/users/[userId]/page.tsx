'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// User data returned by /api/admin/users/[userId]
interface AdminUserDetail {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

interface AdminUserDetailPageProps {
  params: {
    userId: string;
  };
}

export default function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  //Router used for navigation back to the users list
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //fetch user data from the API
  useEffect(() => {
    fetch(`/api/admin/users/${params.userId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('User not found');
          throw new Error('Failed to fetch user');
        }
        return res.json();
      })
      .then(setUser)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.userId]);

  if (loading) {
    return <p className="p-8 text-muted-foreground">Loading user…</p>;
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <Button variant="outline" onClick={() => router.push('/admin/users')}>
          ← Back to Users
        </Button>
      </div>
    );
  }

  //should never happen, but just in case
  if (!user) {
    return <p className="p-8 text-muted-foreground">User not found</p>; ;
  }

  return (
    <div className="p-8">
      <Button variant="ghost" className="mb-4" onClick={() => router.push('/admin/users')}>
        ← Back to Users
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">ID</dt>
              <dd className="mt-1 font-mono text-sm">{user.id}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1">{user.email}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Display Name</dt>
              <dd className="mt-1">{user.name || '—'}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Role</dt>
              <dd className="mt-1">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {user.role}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">First Name</dt>
              <dd className="mt-1">{user.first_name || '—'}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
              <dd className="mt-1 text-sm">{new Date(user.createdAt).toLocaleString()}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last Name</dt>
              <dd className="mt-1">{user.last_name || '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
