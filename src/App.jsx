import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CitizenDashboard from './components/citizen/Dashboard';
import CoordinatorRequests from './pages/CoordinatorRequests';
import './App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CitizenDashboard />} />
          <Route path="/coordinator" element={<CoordinatorRequests />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;


