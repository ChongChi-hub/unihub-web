import { useCallback, useEffect, useState } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  code: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'DELETED';
  roles: string[];
}

interface PageData<T> {
  items: T[];
  totalElements: number;
}

export function AdminUsersPage() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<ApiEnvelope<PageData<UserRow>>>('/api/v1/users', {
        params: search ? { query: search } : undefined,
      });
      setUsers(res.data.data.items);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers('');
  }, [fetchUsers]);

  const toggleLock = async (row: UserRow) => {
    try {
      const action = row.status === 'LOCKED' ? 'unlock' : 'lock';
      await http.patch(`/api/v1/users/${row.id}/${action}`);
      showToast(action === 'lock' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản', 'success');
      await fetchUsers(query);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const columns: Column<UserRow>[] = [
    { key: 'code', header: 'Mã', render: (r) => r.code || '—' },
    { key: 'fullName', header: 'Họ tên', render: (r) => r.fullName },
    { key: 'email', header: 'Email', render: (r) => r.email },
    {
      key: 'roles',
      header: 'Vai trò',
      render: (r) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {r.roles.map((role) => (
            <span key={role} className="badge badge-primary">
              {role}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (r) => (
        <span className={`badge ${r.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (r) => (
        <button type="button" className="btn btn-ghost" onClick={() => void toggleLock(r)}>
          {r.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
      >
        <h2 style={{ margin: 0 }}>Quản lý người dùng</h2>
        <div style={{ display: 'flex', gap: 8, width: 320 }}>
          <input
            className="input"
            placeholder="Tìm theo email, tên, mã..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={() => void fetchUsers(query)}>
            Tìm
          </button>
        </div>
      </div>

      <StateView
        loading={loading}
        error={error}
        empty={!loading && !error && users.length === 0}
        emptyText="Chưa có người dùng phù hợp."
        onRetry={() => void fetchUsers(query)}
      >
        <DataTable columns={columns} rows={users} rowKey={(r) => r.id} />
      </StateView>
    </div>
  );
}
