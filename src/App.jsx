import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import RescueTeamDashboard from './components/RescueTeamDashboard'
import CoordinatorDashboardPage from './pages/CoordinatorDashboardPage'
import ManagerDashboardPage from './pages/ManagerDashboardPage'
import ManagerVehiclesPage from './pages/ManagerVehiclesPage'
import ManagerSuppliesPage from './pages/ManagerSuppliesPage'
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
          <Route path="/rescue-team" element={<RescueTeamDashboard />} />
          <Route path="/rescue-coordinator" element={<CoordinatorDashboardPage />} />
          <Route path="/manager" element={<ManagerDashboardPage />} />
          <Route path="/manager/vehicles" element={<ManagerVehiclesPage />} />
          <Route path="/manager/supplies" element={<ManagerSuppliesPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
