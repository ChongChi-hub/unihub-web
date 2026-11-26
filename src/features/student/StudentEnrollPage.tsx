import { Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import {
  DAY_LABELS,
  formatSchedule,
  type CourseSectionDto,
  type SemesterDto,
  type TimetableSlotDto,
} from '../../shared/api/sprint2Api';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

export function StudentEnrollPage() {
  const { showToast } = useToast();
  const [semesters, setSemesters] = useState<SemesterDto[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [sections, setSections] = useState<CourseSectionDto[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlotDto[]>([]);
  const [tab, setTab] = useState<'enroll' | 'timetable'>('enroll');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const loadSemesterData = useCallback(async (semesterId: string) => {
    if (!semesterId) return;
    setLoading(true);
    setError(null);
    try {
      const [secRes, ttRes] = await Promise.all([
        http.get<ApiEnvelope<CourseSectionDto[]>>(
          `/api/v1/academic/sections?semesterId=${semesterId}`,
        ),
        http.get<ApiEnvelope<TimetableSlotDto[]>>(
          `/api/v1/academic/timetable?semesterId=${semesterId}`,
        ),
      ]);
      setSections(secRes.data.data ?? []);
      setTimetable(ttRes.data.data ?? []);
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
    if (selectedSemesterId) {
      void loadSemesterData(selectedSemesterId);
    }
  }, [selectedSemesterId, loadSemesterData]);

  const enrolledSectionIds = useMemo(
    () => new Set(timetable.map((t) => t.courseSectionId)),
    [timetable],
  );

  const handleEnroll = async (sectionId: string) => {
    setBusyId(sectionId);
    try {
      await http.post(`/api/v1/academic/sections/${sectionId}/enroll`);
      showToast('Đăng ký học phần thành công', 'success');
      await loadSemesterData(selectedSemesterId);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDrop = async (sectionId: string) => {
    setBusyId(sectionId);
    try {
      await http.delete(`/api/v1/academic/sections/${sectionId}/enroll`);
      showToast('Đã hủy đăng ký học phần', 'info');
      await loadSemesterData(selectedSemesterId);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const sectionColumns: Column<CourseSectionDto>[] = [
    { key: 'code', header: 'Mã lớp', render: (r) => <strong>{r.code}</strong> },
    {
      key: 'subject',
      header: 'Môn học',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.subjectName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {r.subjectCode} • {r.credits} TC
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Lịch học',
      render: (r) => <span style={{ fontSize: 13 }}>{formatSchedule(r.schedules)}</span>,
    },
    { key: 'cap', header: 'Sĩ số', render: (r) => `${r.enrolledCount}/${r.maxCapacity}` },
    {
      key: 'action',
      header: 'Thao tác',
      render: (r) => {
        const isEnrolled = enrolledSectionIds.has(r.id);
        if (isEnrolled) {
          return (
            <button
              type="button"
              className="btn btn-danger"
              style={{ padding: '6px 10px', fontSize: 12 }}
              disabled={busyId === r.id}
              onClick={() => void handleDrop(r.id)}
            >
              <Trash2 size={14} />
              <span>Hủy đăng ký</span>
            </button>
          );
        }
        return (
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 10px', fontSize: 12 }}
            disabled={busyId === r.id || r.status !== 'OPEN' || r.enrolledCount >= r.maxCapacity}
            onClick={() => void handleEnroll(r.id)}
          >
            <CheckCircle2 size={14} />
            <span>{r.status !== 'OPEN' ? 'Đã đóng' : 'Đăng ký'}</span>
          </button>
        );
      },
    },
  ];

  const sortedTimetable = useMemo(
    () => [...timetable].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startPeriod - b.startPeriod),
    [timetable],
  );

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
        <h2 style={{ margin: 0 }}>Đăng ký học phần & Thời khóa biểu</h2>
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

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`btn ${tab === 'enroll' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('enroll')}
        >
          Danh sách lớp mở ({sections.length})
        </button>
        <button
          type="button"
          className={`btn ${tab === 'timetable' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('timetable')}
        >
          <Calendar size={16} />
          <span>Thời khóa biểu ({enrolledSectionIds.size} lớp)</span>
        </button>
      </div>

      <StateView
        loading={loading}
        error={error}
        empty={tab === 'enroll' ? sections.length === 0 : sortedTimetable.length === 0}
        emptyText={
          tab === 'enroll'
            ? 'Chưa có lớp học phần nào trong học kỳ này.'
            : 'Bạn chưa đăng ký lớp học phần nào trong học kỳ này.'
        }
        onRetry={() => loadSemesterData(selectedSemesterId)}
      >
        {tab === 'enroll' ? (
          <DataTable columns={sectionColumns} rows={sections} rowKey={(r) => r.id} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {sortedTimetable.map((slot, idx) => (
              <div
                key={`${slot.courseSectionId}-${idx}`}
                className="card"
                style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span className="badge badge-primary">
                    {DAY_LABELS[slot.dayOfWeek] ?? `Thứ ${slot.dayOfWeek}`}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Tiết {slot.startPeriod} - {slot.endPeriod}
                  </span>
                </div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{slot.subjectName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {slot.sectionCode} • {slot.subjectCode}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Phòng: {slot.room || 'Chưa xếp phòng'}
                </div>
              </div>
            ))}
          </div>
        )}
      </StateView>
    </div>
  );
}
