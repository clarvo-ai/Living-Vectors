'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

//user data returned by /api/admin/users
interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

type Role = 'user' | 'admin';

export default function AdminUsersPage() {
  // router for row-level navigation to individual user pages
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //fetch users from the API
  useEffect(() => {
    fetch('/api/admin/users')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      })
      .then((data: AdminUserListItem[]) => {
        setUsers(data);
        const initialRoles: Record<string, Role> = {};
        data.forEach((u) => {
          initialRoles[u.id] = (u.role.toLowerCase() === 'admin' ? 'admin' : 'user') as Role;
        });
        setRoles(initialRoles);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="p-8 text-muted-foreground">Loading users…</p>;
  }

  if (error) {
    return <p className="p-8 text-red-600">Error: {error}</p>;
  }

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>

        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 pr-4">ID</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3">Created</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="py-4 pr-4 font-mono text-sm">{user.id.slice(0, 8)}…</td>
                  <td className="py-4 pr-4">{user.name || '—'}</td>
                  <td className="py-4 pr-4">{user.email}</td>
                  <td className="py-4 pr-4">
                    <select
                      value={roles[user.id] ?? user.role}
                      disabled={saving[user.id]}
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        e.stopPropagation();
                        const newRole = e.target.value as Role;
                        const previousRole = roles[user.id];
                        setRoles((prev) => ({ ...prev, [user.id]: newRole }));
                        setSaving((prev) => ({ ...prev, [user.id]: true }));
                        try {
                          const res = await fetch('/api/admin/users', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: user.id, role: newRole }),
                          });
                          if (!res.ok) throw new Error('Failed to update role');
                        } catch {
                          // revert on failure
                          setRoles((prev) => ({ ...prev, [user.id]: previousRole }));
                        } finally {
                          setSaving((prev) => ({ ...prev, [user.id]: false }));
                        }
                      }}
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
