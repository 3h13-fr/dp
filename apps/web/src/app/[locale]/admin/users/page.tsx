'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type UserRow = { id: string; email: string; role: string; firstName: string | null; lastName: string | null; createdAt: string };

export default function AdminUsersPage() {
  const [data, setData] = useState<{ items: UserRow[]; total: number } | null>(null);

  useEffect(() => {
    apiFetch('/admin/users?limit=50')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, []);

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.total} total</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
