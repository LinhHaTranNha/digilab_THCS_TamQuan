import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import HomePage from './pages/Home/Index'; 
import LibraryPage from './pages/Library/Index';
import DonationPage from './pages/Donation/Index';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import ExamPage from './pages/Exam/Index';
import ScrollToTop from './components/ScrollToTop';
import SlidePage from './pages/Slides/Index';
import DocumentDetailPage from './pages/Documents/Detail';
import ManagePage from './pages/Manage/Index';
import AdvisorPage from './pages/Advisor/Index';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="app-shell">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/donation" element={<DonationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/exams" element={<ExamPage />} />
          <Route path="/slides" element={<SlidePage />} />
          <Route path="/documents/:documentId" element={<DocumentDetailPage />} />
          <Route
            path="/advisor"
            element={(
              <ProtectedRoute>
                <AdvisorPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/manage"
            element={(
              <ProtectedRoute allowedRoles={['school', 'teacher']}>
                <ManagePage />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;