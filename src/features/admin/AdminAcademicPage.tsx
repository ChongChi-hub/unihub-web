import { useCallback, useEffect, useState } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { StateView } from '../../shared/components/StateView';

interface FacultyRow {
  id: string;
  code: string;
  name: string;
}

interface SubjectRow {
  id: string;
  code: string;
  name: string;
  credits: number;
  facultyName: string;
}

export function AdminAcademicPage() {
  const [faculties, setFaculties] = useState<FacultyRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [facRes, subRes] = await Promise.all([
        http.get<ApiEnvelope<{ items: FacultyRow[] }>>('/api/v1/academic/faculties'),
        http.get<ApiEnvelope<{ items: SubjectRow[] }>>('/api/v1/academic/subjects'),
      ]);
      setFaculties(facRes.data.data.items);
      setSubjects(subRes.data.data.items);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const facultyColumns: Column<FacultyRow>[] = [
    { key: 'code', header: 'Mã khoa', render: (r) => r.code },
    { key: 'name', header: 'Tên khoa', render: (r) => r.name },
  ];

  const subjectColumns: Column<SubjectRow>[] = [
    { key: 'code', header: 'Mã môn', render: (r) => r.code },
    { key: 'name', header: 'Tên môn học', render: (r) => r.name },
    { key: 'credits', header: 'Số tín chỉ', render: (r) => r.credits },
    { key: 'faculty', header: 'Khoa', render: (r) => r.facultyName },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0 }}>Danh mục học thuật</h2>
      <StateView
        loading={loading}
        error={error}
        empty={!loading && !error && faculties.length === 0 && subjects.length === 0}
        onRetry={() => void loadData()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Khoa ({faculties.length})</h3>
          <DataTable columns={facultyColumns} rows={faculties} rowKey={(r) => r.id} />

          <h3 style={{ margin: 0, fontSize: 16 }}>Môn học ({subjects.length})</h3>
          <DataTable columns={subjectColumns} rows={subjects} rowKey={(r) => r.id} />
        </div>
      </StateView>
    </div>
  );
}
