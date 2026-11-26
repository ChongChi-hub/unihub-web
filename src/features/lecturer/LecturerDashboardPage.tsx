import { BookOpen, Calendar, Download } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import {
  DAY_LABELS,
  downloadSectionRosterExcel,
  type SemesterDto,
  type TimetableSlotDto,
} from '../../shared/api/sprint2Api';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

export function LecturerDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [semesters, setSemesters] = useState<SemesterDto[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [slots, setSlots] = useState<TimetableSlotDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSemesters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<ApiEnvelope<{ items: SemesterDto[] }>>(
        '/api/v1/academic/semesters',
      );
      const items = res.data.data.items ?? [];
      setSemesters(items);
      const active = items.find((s) => s.active) ?? items[0];
      if (active) setSelectedSemesterId(active.id);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeachingSections = useCallback(async (semesterId: string) => {
    if (!semesterId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<ApiEnvelope<TimetableSlotDto[]>>(
        `/api/v1/academic/timetable?semesterId=${semesterId}`,
      );
      setSlots(res.data.data ?? []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    if (selectedSemesterId) void loadTeachingSections(selectedSemesterId);
  }, [selectedSemesterId, loadTeachingSections]);

  const groupedSections = useMemo(() => {
    const map = new Map<
      string,
      {
        courseSectionId: string;
        sectionCode: string;
        subjectCode: string;
        subjectName: string;
        schedules: TimetableSlotDto[];
      }
    >();
    for (const s of slots) {
      const existing = map.get(s.courseSectionId);
      if (existing) {
        existing.schedules.push(s);
      } else {
        map.set(s.courseSectionId, {
          courseSectionId: s.courseSectionId,
          sectionCode: s.sectionCode,
          subjectCode: s.subjectCode,
          subjectName: s.subjectName,
          schedules: [s],
        });
      }
    }
    return Array.from(map.values());
  }, [slots]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Cổng Giảng viên</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Xin chào Giảng viên <strong>{user?.fullName}</strong>
          </div>
        </div>
        <select
          className="input"
          style={{ width: 220 }}
          value={selectedSemesterId}
          onChange={(e) => setSelectedSemesterId(e.target.value)}
        >
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} - {s.name}
            </option>
          ))}
        </select>
      </div>

      <StateView
        loading={loading}
        error={error}
        empty={groupedSections.length === 0}
        emptyText="Bạn chưa được phân công lớp học phần nào trong học kỳ này."
        onRetry={() => loadTeachingSections(selectedSemesterId)}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {groupedSections.map((sec) => (
            <div
              key={sec.courseSectionId}
              className="card"
              style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span className="badge badge-primary">{sec.sectionCode}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sec.subjectCode}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{sec.subjectName}</div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                {sec.schedules.map((sch, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} />
                    <span>
                      {DAY_LABELS[sch.dayOfWeek] ?? `Thứ ${sch.dayOfWeek}`} • Tiết {sch.startPeriod}
                      -{sch.endPeriod}
                      {sch.room ? ` (${sch.room})` : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <Link
                  to={`/lecturer/sections/${sec.courseSectionId}`}
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: 13 }}
                >
                  <BookOpen size={15} />
                  <span>Quản lý lớp học</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '8px 10px' }}
                  title="Xuất danh sách Excel"
                  onClick={() =>
                    void downloadSectionRosterExcel(sec.courseSectionId, sec.sectionCode).catch(
                      (err) => showToast(extractErrorMessage(err), 'error'),
                    )
                  }
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </StateView>
    </div>
  );
}
