import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import RescueTeamDashboard from './components/RescueTeamDashboard'
import CoordinatorDashboardPage from './pages/CoordinatorDashboardPage'
import ManagerDashboardPage from './pages/ManagerDashboardPage'
import ManagerVehiclesPage from './pages/ManagerVehiclesPage'
import ManagerSuppliesPage from './pages/ManagerSuppliesPage'
import ManagerReliefExportPage from './pages/ManagerReliefExportPage'
import ManagerImportReceiptPage from './pages/ManagerImportReceiptPage'
import ManagerImportReceiptsListPage from './pages/ManagerImportReceiptsListPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminRequestsPage from './pages/AdminRequestsPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/rescue-team" element={<RescueTeamDashboard />} />
          <Route path="/rescue-coordinator" element={<CoordinatorDashboardPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/requests" element={<AdminRequestsPage />} />
          <Route path="/manager" element={<ManagerDashboardPage />} />
          <Route path="/manager/vehicles" element={<ManagerVehiclesPage />} />
          <Route path="/manager/supplies" element={<ManagerSuppliesPage />} />
          <Route path="/manager/relief-export" element={<ManagerReliefExportPage />} />
          <Route path="/manager/import-receipt" element={<ManagerImportReceiptPage />} />
          <Route path="/manager/import-receipts" element={<ManagerImportReceiptsListPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
