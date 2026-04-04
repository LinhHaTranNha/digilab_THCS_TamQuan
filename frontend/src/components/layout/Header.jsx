import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { ROLE_LABELS } from '../../services/apiService';

const Header = () => {
  const { currentUser, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600 cursor-pointer">DigiLib</Link>
          </div>

          {/* Menu chính */}
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">Trang chủ</Link>
            <Link to="/library" className="text-gray-700 hover:text-blue-600 font-medium">Thư viện</Link>
            <Link to="/exams" className="text-gray-700 hover:text-blue-600 font-medium">Đề thi & Đề cương</Link>
            <Link to="/slides" className="text-gray-700 hover:text-blue-600 font-medium">Slides</Link>
            <Link to="/donation" className="text-gray-700 hover:text-blue-600 font-medium">Quyên góp</Link>
            <Link to="/advisor" className="text-gray-700 hover:text-blue-600 font-medium">Trợ lý AI</Link>
            {currentUser && currentUser.role !== 'student' ? (
              <Link to="/manage" className="text-gray-700 hover:text-blue-600 font-medium">Quản trị</Link>
            ) : null}
          </div>

          {/* Nút đăng nhập */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-semibold text-gray-800">{currentUser.fullName}</p>
                  <p className="text-xs text-gray-500">{ROLE_LABELS[currentUser.role]}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="bg-slate-100 text-slate-700 px-5 py-2 rounded-lg hover:bg-slate-200 transition font-medium"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-blue-600 font-medium">Đăng nhập</Link>
                <Link to="/register" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;