import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminUserDetail } from '@/types/admin';

interface UserDetailsCardProps {
  user: AdminUserDetail;
}

export function UserDetailsCard({ user }: UserDetailsCardProps) {
  return (
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
  );
}
