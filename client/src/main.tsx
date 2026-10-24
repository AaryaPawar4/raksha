import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './features/home/HomePage';
import { IncidentListPage } from './features/incidents/IncidentListPage';
import { NewIncidentPage } from './features/incidents/NewIncidentPage';
import { IncidentDetailPage } from './features/incidents/IncidentDetailPage';
import { CheckInSection } from './features/checkin/CheckInSection';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/incidents" element={<IncidentListPage />} />
          <Route path="/incidents/new" element={<NewIncidentPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/check-ins" element={<div className="max-w-2xl mx-auto"><CheckInSection /></div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </React.StrictMode>
);
