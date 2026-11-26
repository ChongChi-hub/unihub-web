import { Save, Upload, User } from 'lucide-react';
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import { uploadFileToMinio, type ProfileDto } from '../../shared/api/sprint2Api';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

export function ProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarFileId, setAvatarFileId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAvatarUrl = useCallback(async (fileId: string | null) => {
    if (!fileId) {
      setAvatarUrl(null);
      return;
    }
    try {
      const res = await http.get<ApiEnvelope<{ downloadUrl: string }>>(
        `/api/v1/files/${fileId}/presign-download`,
      );
      setAvatarUrl(res.data.data.downloadUrl);
    } catch {
      setAvatarUrl(null);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<ApiEnvelope<ProfileDto>>('/api/v1/profile');
      const data = res.data.data;
      setProfile(data);
      setFullName(data.fullName);
      setAvatarFileId(data.avatarFileId);
      await loadAvatarUrl(data.avatarFileId);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [loadAvatarUrl]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFileToMinio(file);
      setAvatarFileId(uploaded.fileId);
      await loadAvatarUrl(uploaded.fileId);
      showToast('Đã tải ảnh đại diện lên thành công. Nhấn Lưu thay đổi để cập nhật.', 'info');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Tải ảnh thất bại'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Họ và tên không được để trống', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await http.put<ApiEnvelope<ProfileDto>>('/api/v1/profile', {
        fullName: fullName.trim(),
        avatarFileId,
      });
      setProfile(res.data.data);
      showToast('Đã cập nhật hồ sơ cá nhân', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <h2 style={{ margin: 0 }}>Hồ sơ cá nhân</h2>

      <StateView loading={loading} error={error} empty={!profile} onRetry={loadProfile}>
        {profile && (
          <form
            className="card"
            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}
            onSubmit={handleSubmit}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={30} color="var(--text-muted)" />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{profile.fullName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {profile.email} {profile.code ? `• ${profile.code}` : ''}
                </div>
                <label
                  className="btn btn-ghost"
                  style={{ width: 'fit-content', padding: '6px 12px', fontSize: 13 }}
                >
                  <Upload size={14} />
                  <span>{uploading ? 'Đang tải ảnh...' : 'Đổi ảnh đại diện'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploading}
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Họ và tên</label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Email</label>
              <input className="input" value={profile.email} disabled />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {profile.roles.map((r) => (
                <span key={r} className="badge badge-primary">
                  {r}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                <Save size={16} />
                <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </form>
        )}
      </StateView>
    </div>
  );
}
