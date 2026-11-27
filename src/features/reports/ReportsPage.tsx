import { AlertTriangle, BarChart3, CheckCircle2, Plus } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import type { AcademicAlertDto, AlertRuleDto, SummaryDto } from '../../shared/api/sprint4Api';
import { Modal } from '../../shared/components/Modal';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

export function ReportsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isStaff = Boolean(user?.roles.includes('ADMIN') || user?.roles.includes('LECTURER'));
  const isAdmin = Boolean(user?.roles.includes('ADMIN'));

  const [summaries, setSummaries] = useState<SummaryDto[]>([]);
  const [alerts, setAlerts] = useState<AcademicAlertDto[]>([]);
  const [rules, setRules] = useState<AlertRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [maxAbsences, setMaxAbsences] = useState(3);
  const [minScore, setMinScore] = useState(4.0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isStaff) {
        const [alertsRes, rulesRes] = await Promise.all([
          http.get<ApiEnvelope<AcademicAlertDto[]>>('/api/v1/reports/alerts'),
          http.get<ApiEnvelope<AlertRuleDto[]>>('/api/v1/reports/alerts/rules'),
        ]);
        setAlerts(alertsRes.data.data ?? []);
        setRules(rulesRes.data.data ?? []);
      } else {
        const [sumRes, alertRes] = await Promise.all([
          http.get<ApiEnvelope<SummaryDto[]>>('/api/v1/reports/students/my'),
          http.get<ApiEnvelope<AcademicAlertDto[]>>('/api/v1/reports/alerts/my'),
        ]);
        setSummaries(sumRes.data.data ?? []);
        setAlerts(alertRes.data.data ?? []);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleResolve = async (alertId: string) => {
    try {
      await http.patch(`/api/v1/reports/alerts/${alertId}/resolve`);
      showToast('Đã đánh dấu xử lý cảnh báo', 'success');
      await loadData();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleCreateRule = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/api/v1/reports/alerts/rules', {
        name: ruleName.trim(),
        maxAbsences: Number(maxAbsences),
        minScore: Number(minScore),
        active: true,
      });
      showToast('Đã tạo quy tắc cảnh báo mới', 'success');
      setRuleOpen(false);
      setRuleName('');
      await loadData();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={22} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Báo cáo & Cảnh báo học vụ</h2>
        </div>
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setRuleOpen(true)}>
            <Plus size={16} />
            <span>Thêm quy tắc cảnh báo</span>
          </button>
        )}
      </div>

      <StateView loading={loading} error={error} empty={false} onRetry={loadData}>
        {!isStaff && (
          <div
            className="card"
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <h3 style={{ margin: 0, fontSize: 16 }}>Tổng hợp kết quả học tập của tôi</h3>
            {summaries.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Chưa có dữ liệu tổng hợp.
              </div>
            ) : (
              summaries.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-subtle)',
                    fontSize: 13,
                  }}
                >
                  <span>Lớp: {s.courseSectionId.slice(0, 8)}...</span>
                  <span>
                    Chuyên cần: <strong>{s.attendanceRate}%</strong>
                  </span>
                  <span>
                    Điểm hiện tại: <strong>{s.currentScore}</strong>
                  </span>
                  <span>
                    Tiến độ: <strong>{s.progressPercent}%</strong>
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {isStaff && rules.length > 0 && (
          <div
            className="card"
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <h3 style={{ margin: 0, fontSize: 16 }}>Quy tắc cảnh báo đang áp dụng</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {rules.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-subtle)',
                    fontSize: 13,
                  }}
                >
                  <strong>{r.name}</strong> • Điểm &lt; {r.minScore} • Vắng &gt; {r.maxAbsences}
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="card"
          style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>Cảnh báo học vụ ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Không có cảnh báo nào.</div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-subtle)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle
                      size={15}
                      color={a.resolved ? 'var(--success)' : 'var(--warning)'}
                    />
                    <strong style={{ fontSize: 13 }}>{a.reason}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    SV: {a.studentId.slice(0, 8)}... •{' '}
                    {new Date(a.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                {a.resolved ? (
                  <span className="badge badge-success">
                    <CheckCircle2 size={12} style={{ marginRight: 4 }} />
                    Đã xử lý
                  </span>
                ) : isStaff ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    onClick={() => void handleResolve(a.id)}
                  >
                    Đánh dấu đã xử lý
                  </button>
                ) : (
                  <span className="badge badge-warning">Cần chú ý</span>
                )}
              </div>
            ))
          )}
        </div>
      </StateView>

      <Modal
        open={ruleOpen}
        title="Thêm quy tắc cảnh báo học vụ"
        onClose={() => setRuleOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRuleOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="create-rule-form" className="btn btn-primary">
              Lưu quy tắc
            </button>
          </>
        }
      >
        <form
          id="create-rule-form"
          onSubmit={handleCreateRule}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Tên quy tắc</label>
            <input
              className="input"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Cảnh báo học lực yếu"
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Điểm tối thiểu</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                className="input"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Số buổi vắng tối đa</label>
              <input
                type="number"
                min="1"
                className="input"
                value={maxAbsences}
                onChange={(e) => setMaxAbsences(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
