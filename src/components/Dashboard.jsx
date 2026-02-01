import React, { useState } from 'react';
import Login from './Login';
import ForgotPassword from './ForgotPassword';
import Register from './Register';
import ReportForm from './ReportForm';
import ViewReport from './ViewReport';
import './Dashboard.css';



function Dashboard() {
  const [showLogin, setShowLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [showViewReport, setShowViewReport] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('Mức 1 - Mức 5');
  const [showStatusDetail, setShowStatusDetail] = useState(false);

  if (showLogin) {
    return <Login 
      onClose={() => setShowLogin(false)} 
      onShowForgotPassword={() => {
        setShowLogin(false);
        setShowForgotPassword(true);
      }}
      onShowRegister={() => {
        setShowLogin(false);
        setShowRegister(true);
      }}
    />;
  }

  if (showForgotPassword) {
    return <ForgotPassword 
      onClose={() => setShowForgotPassword(false)} 
      onShowLogin={() => {
        setShowForgotPassword(false);
        setShowLogin(true);
      }}
    />;
  }

  if (showRegister) {
    return <Register 
      onClose={() => setShowRegister(false)} 
      onShowLogin={() => {
        setShowRegister(false);
        setShowLogin(true);
      }}
    />;
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="header-buttons">
          <button className="btn-primary" onClick={() => setShowReport(true)}>
            📄  Tạo báo cáo
          </button>
          <div className="view-report-wrapper">
            <button 
              className="btn-secondary" 
              onClick={() => setShowStatusDetail(true)}
            >
              Xem báo cáo
            </button>
            {reportHistory.length > 0 && (
              <div className="status-popup">
                <div className={`status-icon ${reportHistory[0].status === 'approved' ? 'approved' : 'pending'}`}></div>
                <span className="status-title">{reportHistory[0].status === 'approved' ? 'Đã duyệt' : 'Đang duyệt'}</span>
              </div>
            )}
          </div>
          <button className="btn-login" onClick={() => setShowLogin(true)}>Đăng nhập</button>
        </div>
      </header>

      {/* Report Form Popup */}
      {showReport && <ReportForm onClose={(reportData) => {
        if (reportData) {
          const newReport = {
            ...reportData,
            submittedDate: new Date().toISOString()
          };
          setReportHistory([newReport, ...reportHistory]);
        }
        setShowReport(false);
      }} />}

      {/* View Report Popup */}
      {showViewReport && selectedReport && <ViewReport 
        reportData={selectedReport} 
        onClose={() => {
          setShowViewReport(false);
          setShowStatusDetail(false);
        }} 
      />}

      {/* Request History Detail Popup */}
      {showStatusDetail && (
        <div className="detail-overlay" onClick={() => setShowStatusDetail(false)}>
          <div className="detail-popup" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <h3>Lịch sử báo cáo</h3>
              <button className="close-btn" onClick={() => setShowStatusDetail(false)}>×</button>
            </div>
            <div className="detail-list">
              <div className="detail-list-header">
                <span className="detail-col-date">Ngày sửa đổi</span>
                <span className="detail-col-status">Trạng thái</span>
              </div>
              {reportHistory.length === 0 ? (
                <div className="empty-message">
                  Chưa có đơn nào được gửi
                </div>
              ) : (
                reportHistory.map((report, index) => {
                  const reportDate = new Date(report.submittedDate);
                  return (
                    <div 
                      key={index} 
                      className="detail-item" 
                      onClick={() => {
                        setSelectedReport(report);
                        setShowStatusDetail(false);
                        setShowViewReport(true);
                      }}
                    >
                      <span className="detail-date">
                        {reportDate.toLocaleString('vi-VN', {
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          hour12: false
                        })} CH
                      </span>
                      <span className={`detail-status ${report.status === 'approved' ? 'approved' : 'pending'}`}>
                        {report.status === 'approved' ? 'Đã duyệt' : 'Đang duyệt'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Bar */}
      {showStats && (
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-icon">🕐</div>
            <div className="stat-number">--</div>
            <div className="stat-label">Các yêu cầu đã nhận</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">👥</div>
            <div className="stat-number">--</div>
            <div className="stat-label">Được cứu trợ</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">❤️</div>
            <div className="stat-number">--</div>
            <div className="stat-label">Đã hỗ trợ</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">😊</div>
            <div className="stat-number">--</div>
            <div className="stat-label">Báo an toàn</div>
          </div>
        </div>
      )}
      
      {/* Toggle Button */}
      <button className="stats-toggle" onClick={() => setShowStats(!showStats)}>
        <span className={showStats ? "arrow-up" : "arrow-down"}>▲</span>
      </button>

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
          <div className="level-dropdown">
            <button 
              className="level-dropdown-btn" 
              onClick={() => setShowLevelDropdown(!showLevelDropdown)}
            >
              <span className={showLevelDropdown ? "dropdown-arrow up" : "dropdown-arrow down"}>▼</span>
            </button>
            {showLevelDropdown && (
              <div className="level-dropdown-menu">
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 5 - Rất cao'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-5-bg"></span>
                  <span>Mức 5 - Rất cao</span>
                </div>
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 4 - Cao'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-4-bg"></span>
                  <span>Mức 4 - Cao</span>
                </div>
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 3 - Trung bình'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-3-bg"></span>
                  <span>Mức 3 - Trung bình</span>
                </div>
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 2 - Thấp'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-2-bg"></span>
                  <span>Mức 2 - Thấp</span>
                </div>
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 1 - Rất thấp'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-1-bg"></span>
                  <span>Mức 1 - Rất thấp</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-item">Thông Tin</button>
        <button className="nav-item">Hướng Dẫn</button>
        <button className="nav-item">Liên Hệ</button>
      </nav>
    </div>
  );
}

export default Dashboard;
