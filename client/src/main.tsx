import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ToastProvider } from './components/ui';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { Layout } from './components/layout/Layout';
import { HomePage } from './features/home/HomePage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { IncidentListPage } from './features/incidents/IncidentListPage';
import { NewIncidentPage } from './features/incidents/NewIncidentPage';
import { IncidentDetailPage } from './features/incidents/IncidentDetailPage';
import { CheckInSection } from './features/checkin/CheckInSection';
import { ActivityLogPage } from './features/activity/ActivityLogPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute>
                    <IncidentListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents/new"
                element={
                  <ProtectedRoute>
                    <NewIncidentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents/:id"
                element={
                  <ProtectedRoute>
                    <IncidentDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/check-ins"
                element={
                  <ProtectedRoute>
                    <div className="max-w-4xl mx-auto">
                      <CheckInSection />
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activity"
                element={
                  <ProtectedRoute>
                    <ActivityLogPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
