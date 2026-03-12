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

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-white">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/donation" element={<DonationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/exams" element={<ExamPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;