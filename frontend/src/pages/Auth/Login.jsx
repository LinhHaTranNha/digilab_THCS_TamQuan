import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getApiErrorMessage } from '../../services/apiService';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      const redirectPath = location.state?.from?.pathname || '/';
      navigate(redirectPath);
    } catch (loginError) {
      setError(getApiErrorMessage(loginError, 'Không thể đăng nhập.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Chào mừng quay lại!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sử dụng tài khoản nội bộ trường THCS Tam Quan
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-700 space-y-1">
          <p className="font-semibold text-slate-900">Tài khoản demo</p>
          <p>Nhà trường: school@tamquan.edu.vn / 123456</p>
          <p>Giáo viên: teacher@tamquan.edu.vn / 123456</p>
          <p>Học sinh: student@tamquan.edu.vn / 123456</p>
        </div>
        {error ? <div className="rounded-2xl bg-red-50 text-red-700 px-4 py-3">{error}</div> : null}
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Email/Mã số học sinh</label>
              <input
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="2024-HS-001"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Mật khẩu</label>
              <input
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="********"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label className="ml-2 block text-sm text-gray-900">Ghi nhớ tôi</label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Quên mật khẩu?</a>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Chỉ dành cho cán bộ, giáo viên và học sinh trường THCS Tam Quan.
        </p>
        <p className="text-center text-sm text-gray-600">
          Chưa có tài khoản học sinh?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
            Đăng ký tại đây
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;