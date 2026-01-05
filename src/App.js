import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Equipment from './components/Equipment';
import Rentals from './components/Rentals';
import Returns from './components/Returns';
import Payments from './components/Payments';
import Reports from './components/Reports';
import AdminSettings from './components/AdminSettings';
import ClientProfile from './components/ClientProfile';
import TransactionDetail from './components/TransactionDetail';
import ActivityLog from './components/ActivityLog';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('App.js: Current user state:', user);
  console.log('App.js: Loading state:', loading);
  console.log('App.js: Current location:', location.pathname);

  if (loading) {
    console.log('App.js: Showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('App.js: No user, showing auth routes');
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  console.log('App.js: User authenticated, showing main app');

  console.log('App.js: Rendering authenticated routes');
  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="flex">
        <div className="fixed inset-y-0 left-0 z-50">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col ml-64">
          <Header />
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientProfile />} />
              <Route path="/equipment" element={<Equipment />} />
              <Route path="/rentals" element={<Rentals />} />
              <Route path="/rentals/new" element={<Rentals />} />
              <Route path="/rentals/:id" element={<TransactionDetail />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/activity-log" element={<ActivityLog />} />
              <Route 
                path="/admin-settings" 
                element={
                  user?.role === 'admin' ? (
                    <AdminSettings />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                } 
              />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
