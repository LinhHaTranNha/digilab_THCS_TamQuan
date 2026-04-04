import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDocuments, ROLE_LABELS } from '../../services/apiService';
import { useAuth } from '../../store/AuthContext';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const categories = [
    { n: 'Ebooks', i: '📖', c: 'bg-blue-50', path: '/library' },
    { n: 'Đề thi & Đề cương', i: '📝', c: 'bg-green-50', path: '/exams' },
    { n: 'Slide Bài giảng', i: '💻', c: 'bg-yellow-50', path: '/slides' },
    { n: 'Góc Tặng sách', i: '🎁', c: 'bg-pink-50', path: '/donation' },
    { n: 'Trợ lý AI', i: '🤖', c: 'bg-violet-50', path: '/advisor' },
  ];

  const [query, setQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      const nextDocuments = await getDocuments();
      if (isMounted) {
        setDocuments(nextDocuments);
      }
    };

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = {
    documents: documents.length,
    library: documents.filter((item) => item.section === 'library').length,
    exams: documents.filter((item) => item.section === 'exams').length,
    slides: documents.filter((item) => item.section === 'slides').length,
  };

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(`/library?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-500 py-20 text-white text-center">
        <h1 className="text-5xl font-extrabold mb-4">Thư Viện Số Trường THCS Tam Quan</h1>
        <p className="text-xl mb-10 text-blue-100 italic">"Học, Học Nữa, Học Mãi"</p>

        {currentUser ? (
          <p className="text-sm md:text-base text-blue-100 mb-8">
            Đang đăng nhập với vai trò {ROLE_LABELS[currentUser.role]}.
          </p>
        ) : (
          <p className="text-sm md:text-base text-blue-100 mb-8">
            Demo sẵn 3 vai trò: nhà trường, giáo viên và học sinh.
          </p>
        )}
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto px-4">
          <input 
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm đề thi, giáo án, sách bài tập, ..." 
            className="w-full py-4 px-8 rounded-full text-gray-800 shadow-2xl focus:ring-4 focus:ring-blue-300 outline-none"
          />
        </form>
      </section>

      <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400 mb-1">Tổng tài liệu</p>
            <p className="text-3xl font-black text-gray-900">{stats.documents}</p>
          </div>
          <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400 mb-1">Thư viện</p>
            <p className="text-3xl font-black text-gray-900">{stats.library}</p>
          </div>
          <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400 mb-1">Đề thi</p>
            <p className="text-3xl font-black text-gray-900">{stats.exams}</p>
          </div>
          <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400 mb-1">Slides</p>
            <p className="text-3xl font-black text-gray-900">{stats.slides}</p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto py-16 px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-8">
          {categories.map((item, idx) => (
            <Link 
              key={idx} 
              to={item.path} 
              className={`${item.c} p-10 rounded-3xl text-center transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer border border-transparent hover:border-blue-200 hover:shadow-xl block`}
            >
              <div className="text-5xl mb-4">{item.i}</div>
              <h3 className="font-bold text-gray-800 text-lg">{item.n}</h3>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;