import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchClient } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', page, pageSize],
    queryFn: () => fetchClient<any>(`/admin/audit-logs?page=${page}&page_size=${pageSize}`)
  });

  const columns: Column<any>[] = [
    { key: 'created_at', header: 'Timestamp', render: (l) => <span className="text-xs text-gray-500">{new Date(l.created_at).toLocaleString()}</span> },
    { key: 'action', header: 'Action', render: (l) => <span className="font-semibold text-primary/80 bg-primary/5 px-2 py-1 rounded text-xs">{l.action}</span> },
    { key: 'entity_type', header: 'Entity' },
    { key: 'entity_id', header: 'Entity ID', render: (l) => <span className="font-mono text-xs text-gray-400">{l.entity_id}</span> },
    { key: 'actor_user_id', header: 'Actor', render: (l) => <span className="font-mono text-xs text-gray-400">{l.actor_user_id ?? '—'}</span> },
    { key: 'details', header: 'Changes', render: (l) => (
      <div className="max-w-xs truncate text-xs font-mono bg-gray-50 dark:bg-gray-800 p-1 rounded">
        {l.details ? JSON.stringify(l.details) : '—'}
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Review system activity and administrative changes.</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading || isFetching}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearch={setSearch}
        searchPlaceholder="Search is disabled for logs..."
      />
    </div>
  );
}
