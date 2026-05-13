import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) return null;

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => navigate('/')}>
            <img src="/vj-logo.png" alt="V/J Sync" />
            <span>V/J Sync</span>
          </div>
          <div className="landing-nav-actions">
            <button className="btn-outline" onClick={() => navigate('/login')}>
              Đăng nhập
            </button>
            <button className="btn-primary" onClick={() => navigate('/register')}>
              Đăng ký
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <h1 className="hero-title">V/J Sync</h1>
        <p className="hero-subtitle">
          Nền tảng giao tiếp công sở thông minh giữa người Việt và người Nhật
          — phá bỏ rào cản ngôn ngữ, kết nối hiệu quả.
        </p>
        <button className="btn-hero" onClick={() => navigate('/register')}>
          Bắt đầu miễn phí
        </button>
      </section>

      {/* Features */}
      <section className="landing-features">
        <h2 className="features-heading">Tính năng nổi bật</h2>
        <div className="features-grid">
          <div className="feature-card">
            <i className="fas fa-language feature-icon" />
            <h3>Dịch thuật AI</h3>
            <p>
              Dịch tự động Việt – Nhật theo ngữ cảnh công sở, đảm bảo kính ngữ
              và phong cách chuyên nghiệp.
            </p>
          </div>
          <div className="feature-card">
            <i className="fas fa-tasks feature-icon" />
            <h3>Quản lý công việc</h3>
            <p>
              Tạo, giao và theo dõi công việc trong workspace. Gắn nhãn, đặt
              deadline, nhận nhắc nhở tự động.
            </p>
          </div>
          <div className="feature-card">
            <i className="fas fa-comments feature-icon" />
            <h3>Chat đa kênh</h3>
            <p>
              Nhắn tin trực tiếp hoặc qua kênh nhóm, tích hợp AI giải mã ý
              định và gợi ý diễn đạt.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <h2>Sẵn sàng kết nối?</h2>
        <p>Đăng ký ngay để trải nghiệm V/J Sync hoàn toàn miễn phí.</p>
        <button className="btn-hero" onClick={() => navigate('/register')}>
          Tạo tài khoản
        </button>
      </section>
    </div>
  );
}
