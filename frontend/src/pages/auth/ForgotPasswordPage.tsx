import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';
import './LoginPage.css';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleVerifyEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyForgotPasswordEmail(email.trim());
      setVerifiedEmail(res.data.email ?? email.trim());
      setStep('reset');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined;
        setError(data?.error || 'Không thể kiểm tra email. Vui lòng thử lại.');
      } else {
        setError('Không thể kiểm tra email. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetForgotPassword({
        email: verifiedEmail,
        password,
      });
      setStep('done');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined;
        setError(data?.error || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
      } else {
        setError('Không thể đổi mật khẩu. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span>
            V/<span className="logo-accent">J</span> Sync
          </span>
        </div>

        {step === 'email' && (
          <>
            <h1 className="login-title">Quên mật khẩu</h1>
            <p className="login-subtitle">
              Nhập email đăng nhập. Nếu email có trong hệ thống, bạn có thể đặt mật khẩu mới.
            </p>
            {error && <div className="login-error">{error}</div>}
            <form className="login-form" onSubmit={handleVerifyEmail}>
              <div className="form-group">
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Đang kiểm tra...' : 'Tiếp tục'}
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <h1 className="login-title">Đặt mật khẩu mới</h1>
            <p className="login-subtitle">
              Email <strong>{verifiedEmail}</strong> đã được xác nhận. Nhập mật khẩu mới bên dưới.
            </p>
            {error && <div className="login-error">{error}</div>}
            <form className="login-form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="new-password">Mật khẩu mới</label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Xác nhận mật khẩu</label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
              </button>
              <button
                type="button"
                className="google-btn"
                style={{ marginBottom: 0 }}
                onClick={() => {
                  setStep('email');
                  setError('');
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                Dùng email khác
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <h1 className="login-title">Hoàn tất</h1>
            <p className="login-subtitle">Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.</p>
            <button type="button" className="login-btn" onClick={() => navigate('/login')}>
              Đến trang đăng nhập
            </button>
          </>
        )}

        <div className="login-footer" style={{ marginTop: 24 }}>
          <Link to="/login">Quay lại đăng nhập</Link>
          {' · '}
          <Link to="/">Trang chủ</Link>
        </div>
      </div>
    </div>
  );
}
