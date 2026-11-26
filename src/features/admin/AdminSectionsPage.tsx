import { CalendarClock, Download, Lock, Plus, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import {
  DAY_LABELS,
  downloadSectionRosterExcel,
  formatSchedule,
  type CourseSectionDto,
  type EnrollmentDto,
  type ScheduleDto,
  type SemesterDto,
  type SubjectDto,
} from '../../shared/api/sprint2Api';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  code: string | null;
  roles: string[];
}

export function AdminSectionsPage() {
  const { showToast } = useToast();
  const [semesters, setSemesters] = useState<SemesterDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [lecturers, setLecturers] = useState<UserSummary[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [sections, setSections] = useState<CourseSectionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create section modal
  const [createOpen, setCreateOpen] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(60);
  const [room, setRoom] = useState('A1-201');
  const [schedules, setSchedules] = useState<ScheduleDto[]>([
    { dayOfWeek: 2, startPeriod: 1, endPeriod: 3, room: 'A1-201' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Registration window modal
  const [windowOpen, setWindowOpen] = useState(false);
  const [regStart, setRegStart] = useState('');
  const [regEnd, setRegEnd] = useState('');

  // Assign lecturers modal
  const [lecturerModalSection, setLecturerModalSection] = useState<CourseSectionDto | null>(null);
  const [selectedLecturerIds, setSelectedLecturerIds] = useState<string[]>([]);

  // Students modal
  const [studentsSection, setStudentsSection] = useState<CourseSectionDto | null>(null);
  const [students, setStudents] = useState<EnrollmentDto[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [semRes, subRes, usrRes] = await Promise.all([
        http.get<ApiEnvelope<{ items: SemesterDto[] }>>('/api/v1/academic/semesters'),
        http.get<ApiEnvelope<{ items: SubjectDto[] }>>('/api/v1/academic/subjects'),
        http.get<ApiEnvelope<{ items: UserSummary[] }>>('/api/v1/users?size=200'),
      ]);
      const semItems = semRes.data.data.items ?? [];
      const subItems = subRes.data.data.items ?? [];
      const usrItems = usrRes.data.data.items ?? [];
      setSemesters(semItems);
      setSubjects(subItems);
      setLecturers(usrItems.filter((u) => u.roles?.includes('LECTURER')));
      if (subItems.length > 0) setSubjectId(subItems[0].id);
      const activeSem = semItems.find((s) => s.active) ?? semItems[0];
      if (activeSem) {
        setSelectedSemesterId(activeSem.id);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSections = useCallback(
    async (semesterId: string) => {
      try {
        const url = semesterId
          ? `/api/v1/academic/sections?semesterId=${semesterId}`
          : '/api/v1/academic/sections';
        const res = await http.get<ApiEnvelope<CourseSectionDto[]>>(url);
        setSections(res.data.data ?? []);
      } catch (err) {
        showToast(extractErrorMessage(err), 'error');
      }
    },
    [showToast],
  );

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (selectedSemesterId) {
      void loadSections(selectedSemesterId);
    }
  }, [selectedSemesterId, loadSections]);

  const handleCreateSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSemesterId || !subjectId) return;
    setSubmitting(true);
    try {
      await http.post('/api/v1/academic/sections', {
        semesterId: selectedSemesterId,
        subjectId,
        maxCapacity: Number(maxCapacity),
        room,
        schedules,
      });
      showToast('Đã mở lớp học phần mới', 'success');
      setCreateOpen(false);
      await loadSections(selectedSemesterId);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveWindow = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSemesterId || !regStart || !regEnd) return;
    setSubmitting(true);
    try {
      await http.put(`/api/v1/academic/semesters/${selectedSemesterId}/registration-window`, {
        registrationStart: new Date(regStart).toISOString(),
        registrationEnd: new Date(regEnd).toISOString(),
      });
      showToast('Đã cập nhật thời gian đăng ký học phần', 'success');
      setWindowOpen(false);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignLecturers = async (e: FormEvent) => {
    e.preventDefault();
    if (!lecturerModalSection || selectedLecturerIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 giảng viên', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await http.put(`/api/v1/academic/sections/${lecturerModalSection.id}/lecturers`, {
        lecturerIds: selectedLecturerIds,
      });
      showToast('Đã phân công giảng viên', 'success');
      setLecturerModalSection(null);
      await loadSections(selectedSemesterId);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSection = async (sec: CourseSectionDto) => {
    try {
      await http.patch(`/api/v1/academic/sections/${sec.id}/close`);
      showToast(`Đã đóng lớp ${sec.code}`, 'success');
      await loadSections(selectedSemesterId);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const openStudentsModal = async (sec: CourseSectionDto) => {
    setStudentsSection(sec);
    setStudentsLoading(true);
    try {
      const res = await http.get<ApiEnvelope<EnrollmentDto[]>>(
        `/api/v1/academic/sections/${sec.id}/students`,
      );
      setStudents(res.data.data ?? []);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setStudentsLoading(false);
    }
  };

  const columns: Column<CourseSectionDto>[] = [
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
    {
      key: 'capacity',
      header: 'Sĩ số',
      render: (r) => (
        <span>
          {r.enrolledCount}/{r.maxCapacity}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (r) => (
        <span className={`badge ${r.status === 'OPEN' ? 'badge-success' : 'badge-warning'}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '5px 8px', fontSize: 12 }}
            onClick={() => {
              setLecturerModalSection(r);
              setSelectedLecturerIds(r.lecturerIds ?? []);
            }}
          >
            <UserPlus size={14} />
            <span>Giảng viên ({r.lecturerIds?.length ?? 0})</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '5px 8px', fontSize: 12 }}
            onClick={() => void openStudentsModal(r)}
          >
            <Users size={14} />
            <span>Sinh viên</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '5px 8px', fontSize: 12 }}
            onClick={() => void downloadSectionRosterExcel(r.id, r.code)}
          >
            <Download size={14} />
            <span>Excel</span>
          </button>
          {r.status === 'OPEN' && (
            <button
              type="button"
              className="btn btn-danger"
              style={{ padding: '5px 8px', fontSize: 12 }}
              onClick={() => void handleCloseSection(r)}
            >
              <Lock size={14} />
              <span>Đóng lớp</span>
            </button>
          )}
        </div>
      ),
    },
  ];

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
        <h2 style={{ margin: 0 }}>Quản lý Lớp học phần</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <button type="button" className="btn btn-ghost" onClick={() => setWindowOpen(true)}>
            <CalendarClock size={16} />
            <span>Mở đợt đăng ký</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            <span>Mở lớp học phần</span>
          </button>
        </div>
      </div>

      <StateView
        loading={loading}
        error={error}
        empty={sections.length === 0}
        emptyText="Chưa có lớp học phần nào trong học kỳ này."
        onRetry={loadBase}
      >
        <DataTable columns={columns} rows={sections} rowKey={(r) => r.id} />
      </StateView>

      <Modal
        open={createOpen}
        title="Mở lớp học phần mới"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              Hủy
            </button>
            <button
              type="submit"
              form="create-section-form"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Đang tạo...' : 'Tạo lớp học phần'}
            </button>
          </>
        }
      >
        <form
          id="create-section-form"
          onSubmit={handleCreateSection}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Môn học</label>
            <select
              className="input"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} - {sub.name} ({sub.credits} TC)
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Sĩ số tối đa</label>
              <input
                type="number"
                className="input"
                min={1}
                max={500}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Phòng học mặc định</label>
              <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
          </div>
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <label style={{ fontSize: 13, fontWeight: 500 }}>Lịch học</label>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: 12 }}
                onClick={() =>
                  setSchedules((prev) => [
                    ...prev,
                    { dayOfWeek: 4, startPeriod: 1, endPeriod: 3, room },
                  ])
                }
              >
                + Thêm buổi
              </button>
            </div>
            {schedules.map((sch, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1fr',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <select
                  className="input"
                  value={sch.dayOfWeek}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSchedules((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, dayOfWeek: val } : item)),
                    );
                  }}
                >
                  {Object.entries(DAY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={15}
                  placeholder="Từ"
                  value={sch.startPeriod}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSchedules((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, startPeriod: val } : item)),
                    );
                  }}
                />
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={15}
                  placeholder="Đến"
                  value={sch.endPeriod}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSchedules((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, endPeriod: val } : item)),
                    );
                  }}
                />
                <input
                  className="input"
                  placeholder="Phòng"
                  value={sch.room}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSchedules((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, room: val } : item)),
                    );
                  }}
                />
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <Modal
        open={windowOpen}
        title="Cấu hình đợt đăng ký học phần"
        onClose={() => setWindowOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setWindowOpen(false)}>
              Hủy
            </button>
            <button
              type="submit"
              form="reg-window-form"
              className="btn btn-primary"
              disabled={submitting}
            >
              Lưu cấu hình
            </button>
          </>
        }
      >
        <form
          id="reg-window-form"
          onSubmit={handleSaveWindow}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Thời gian bắt đầu</label>
            <input
              type="datetime-local"
              className="input"
              value={regStart}
              onChange={(e) => setRegStart(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Thời gian kết thúc</label>
            <input
              type="datetime-local"
              className="input"
              value={regEnd}
              onChange={(e) => setRegEnd(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!lecturerModalSection}
        title={`Phân công giảng viên - ${lecturerModalSection?.code ?? ''}`}
        onClose={() => setLecturerModalSection(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setLecturerModalSection(null)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="assign-lecturers-form"
              className="btn btn-primary"
              disabled={submitting}
            >
              Lưu phân công
            </button>
          </>
        }
      >
        <form
          id="assign-lecturers-form"
          onSubmit={handleAssignLecturers}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {lecturers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Chưa có tài khoản Giảng viên nào trong hệ thống.
            </p>
          ) : (
            lecturers.map((lec) => {
              const checked = selectedLecturerIds.includes(lec.id);
              return (
                <label
                  key={lec.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: 'var(--bg-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedLecturerIds((prev) =>
                        e.target.checked ? [...prev, lec.id] : prev.filter((id) => id !== lec.id),
                      );
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{lec.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lec.email}</div>
                  </div>
                </label>
              );
            })
          )}
        </form>
      </Modal>

      <Modal
        open={!!studentsSection}
        title={`Danh sách sinh viên - ${studentsSection?.code ?? ''}`}
        onClose={() => setStudentsSection(null)}
        footer={
          <button type="button" className="btn btn-ghost" onClick={() => setStudentsSection(null)}>
            Đóng
          </button>
        }
      >
        <StateView
          loading={studentsLoading}
          error={null}
          empty={students.length === 0}
          emptyText="Chưa có sinh viên đăng ký."
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            {students.map((st) => (
              <div
                key={st.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'var(--bg-subtle)',
                  fontSize: 13,
                }}
              >
                <span>SV ID: {st.studentId}</span>
                <span className="badge badge-primary">{st.status}</span>
              </div>
            ))}
          </div>
        </StateView>
      </Modal>
    </div>
  );
}
