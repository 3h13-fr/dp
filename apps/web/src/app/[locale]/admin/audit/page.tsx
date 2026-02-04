'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type AuditRow = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  user: { email: string } | null;
  createdAt: string;
  metadata: unknown;
};

export default function AdminAuditPage() {
  const [data, setData] = useState<{ items: AuditRow[]; total: number } | null>(null);

  useEffect(() => {
    apiFetch('/admin/audit-logs?limit=100')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, []);

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Audit logs</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.total} entries</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">User</th>
              <th className="p-3">Action</th>
              <th className="p-3">Resource</th>
              <th className="p-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-3">{r.user?.email ?? r.userId ?? '—'}</td>
                <td className="p-3">{r.action}</td>
                <td className="p-3">{r.resource}</td>
                <td className="p-3 font-mono text-xs">{r.resourceId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
