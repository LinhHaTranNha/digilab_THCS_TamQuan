import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { ROLE_LABELS } from '../../services/apiService';

const navItems = [
  { to: '/', label: 'Trang chủ' },
  { to: '/library', label: 'Thư viện' },
  { to: '/exams', label: 'Đề thi' },
  { to: '/slides', label: 'Slides' },
  { to: '/donation', label: 'Quyên góp' },
  { to: '/advisor', label: 'Trợ lý AI' },
];

const navClassName = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-semibold transition ${
    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

const Header = () => {
  const { currentUser, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 min-w-fit">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-black grid place-items-center shadow-sm">
              D
            </div>
            <div>
              <p className="text-base font-black tracking-tight text-slate-900 leading-none">DigiLib</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 leading-none mt-1">THCS Tam Quan</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClassName}>
                {item.label}
              </NavLink>
            ))}
            {currentUser && currentUser.role !== 'student' ? (
              <NavLink to="/manage" className={navClassName}>
                Quản trị
              </NavLink>
            ) : null}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 min-w-fit">
            {currentUser ? (
              <>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{currentUser.fullName}</p>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[currentUser.role]}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="btn-soft text-sm px-3 py-2"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-soft text-sm px-3 py-2">
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn-primary text-sm px-3 py-2">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="lg:hidden border-t border-slate-200 bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 py-3 min-w-max">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClassName}>
                {item.label}
              </NavLink>
            ))}
            {currentUser && currentUser.role !== 'student' ? (
              <NavLink to="/manage" className={navClassName}>
                Quản trị
              </NavLink>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
