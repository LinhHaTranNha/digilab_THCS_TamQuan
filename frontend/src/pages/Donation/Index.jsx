import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getApiErrorMessage, saveDonation } from '../../services/apiService';

const DonationPage = () => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    bookName: '',
    grade: 'Khối 6',
    condition: 'Còn mới',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      fullName: currentUser?.fullName || '',
      bookName: '',
      grade: currentUser?.grade || 'Khối 6',
      condition: 'Còn mới',
      message: '',
    });
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);

    try {
      await saveDonation(formData);
      setError('');
      setSubmitted(true);
      setFormData({
        fullName: currentUser?.fullName || '',
        bookName: '',
        grade: currentUser?.grade || 'Khối 6',
        condition: 'Còn mới',
        message: ''
      });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Không thể gửi biểu mẫu quyên góp.'));
    } finally {
      setSubmitting(false);
    }
  };

  const canDonate = Boolean(currentUser);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        
        {/* Phần 1: Nội dung giới thiệu */}
        <div>
          <h1 className="text-4xl font-bold text-blue-600 mb-6">Góc Quyên Góp</h1>
          <p className="text-gray-600 text-lg mb-6 leading-relaxed">
            "Sách cũ của bạn là kho tàng tri thức của người khác." <br />
            Hãy cùng nhau xây dựng thư viện trường THCS Tam Quan ngày càng phong phú bằng cách chia sẻ những cuốn sách bạn đã đọc xong nhé!
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <span className="bg-green-100 p-2 rounded-full">✅</span>
              <p className="text-gray-700">Tặng sách giáo khoa, sách tham khảo.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="bg-green-100 p-2 rounded-full">✅</span>
              <p className="text-gray-700">Chia sẻ đề cương, vở ghi chép đẹp.</p>
            </div>
          </div>
        </div>

        {/* Phần 2: Form quyên góp */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-blue-50">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Thông tin quyên góp</h2>
          {!currentUser ? (
            <div className="mb-5 rounded-2xl bg-amber-50 text-amber-700 px-4 py-3">
              Bạn cần <Link to="/login" className="font-semibold underline">đăng nhập</Link> bằng tài khoản giáo viên hoặc học sinh để gửi biểu mẫu này.
            </div>
          ) : null}
          {error ? <div className="mb-5 rounded-2xl bg-red-50 text-red-700 px-4 py-3">{error}</div> : null}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên của bạn</label>
              <input 
                required
                type="text" 
                value={formData.fullName}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nguyễn Văn A"
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                disabled={!canDonate}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên tài liệu/sách quyên góp</label>
              <input 
                required
                type="text" 
                value={formData.bookName}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: Sách Toán 9 nâng cao"
                onChange={(e) => setFormData({...formData, bookName: e.target.value})}
                disabled={!canDonate}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dành cho khối</label>
                <select 
                  value={formData.grade}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  disabled={!canDonate}
                >
                  <option>Khối 6</option>
                  <option>Khối 7</option>
                  <option>Khối 8</option>
                  <option>Khối 9</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng</label>
                <select 
                  value={formData.condition}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setFormData({...formData, condition: e.target.value})}
                  disabled={!canDonate}
                >
                  <option>Còn mới</option>
                  <option>Đã sử dụng</option>
                  <option>Hơi cũ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lời nhắn (nếu có)</label>
              <textarea 
                rows="3"
                value={formData.message}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Chúc các em học tốt nhé."
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                disabled={!canDonate}
              ></textarea>
            </div>

            <button 
              type="submit"
              disabled={!canDonate || submitting}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed ${submitted ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {submitted ? 'Đã gửi thành công! ✨' : (submitting ? 'Đang gửi...' : 'Gửi thông tin quyên góp')}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default DonationPage;