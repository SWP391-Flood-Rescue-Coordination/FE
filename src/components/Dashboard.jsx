import React, { useState } from 'react';
import Login from './Login';
import './Dashboard.css';

function Dashboard() {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return <Login onClose={() => setShowLogin(false)} />;
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="header-buttons">
          <button className="btn-primary" onClick={() => setShowLogin(true)}>
            Báo cáo
          </button>
          <button className="btn-secondary">Xem đơn</button>
        </div>
      </header>

      {/* Statistics Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-icon">🕐</div>
          <div className="stat-number">69</div>
          <div className="stat-label">Các yêu cầu đã nhận</div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">👥</div>
          <div className="stat-number">69</div>
          <div className="stat-label">Người dược trợ</div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">❤️</div>
          <div className="stat-number">69</div>
          <div className="stat-label">Đã hỗ trợ</div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">😊</div>
          <div className="stat-number">69</div>
          <div className="stat-label">Báo an toàn</div>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31355.545089644873!2d106.68353449999999!3d10.7626!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f38f9ed887b%3A0x14aded124064dcfa!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBWxINuIEzDom5n!5e0!3m2!1svi!2s!4v1738166000000!5m2!1svi!2s"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
        
        {/* Map Controls */}
        <div className="map-controls">
          <div className="level-control">
            <span>Mức 1</span>
            <div className="level-bar"></div>
            <span>Mức 5</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-item active">Thống Tin</button>
        <button className="nav-item">Hướng Dẫn</button>
        <button className="nav-item">Liên Hệ</button>
      </nav>
    </div>
  );
}

export default Dashboard;
