import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAuthorStats,
  getDocuments,
  getSectionLabel,
  getSubjectStats,
  ROLE_LABELS,
} from '../../services/apiService';
import { useAuth } from '../../store/AuthContext';

const normalizeDocuments = (data) => {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  return [];
};

const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [subjectStats, setSubjectStats] = useState([]);
  const [subjectStatsLoading, setSubjectStatsLoading] = useState(false);
  const [subjectTarget, setSubjectTarget] = useState('library');
  const [authorStats, setAuthorStats] = useState([]);
  const [authorStatsLoading, setAuthorStatsLoading] = useState(false);
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
        setDocuments(normalizeDocuments(nextDocuments));
      }
    };

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRecentDocuments = async () => {
      setRecentLoading(true);

      try {
        const response = await getDocuments({ sort: 'newest', pageSize: 6 });
        const items = normalizeDocuments(response).slice(0, 6);

        if (isMounted) {
          setRecentDocuments(items);
        }
      } finally {
        if (isMounted) {
          setRecentLoading(false);
        }
      }
    };

    loadRecentDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSubjectStats = async () => {
      setSubjectStatsLoading(true);

      try {
        const items = await getSubjectStats({ limit: 8, section: subjectTarget });
        if (isMounted) {
          setSubjectStats(items);
        }
      } finally {
        if (isMounted) {
          setSubjectStatsLoading(false);
        }
      }
    };

    loadSubjectStats();

    return () => {
      isMounted = false;
    };
  }, [subjectTarget]);

  useEffect(() => {
    let isMounted = true;

    const loadAuthorStats = async () => {
      setAuthorStatsLoading(true);

      try {
        const items = await getAuthorStats({ limit: 6 });
        if (isMounted) {
          setAuthorStats(items);
        }
      } finally {
        if (isMounted) {
          setAuthorStatsLoading(false);
        }
      }
    };

    loadAuthorStats();

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

  const handleBrowseSubject = (subject) => {
    const targetPath = subjectTarget === 'exams' ? '/exams' : subjectTarget === 'slides' ? '/slides' : '/library';
    navigate(`${targetPath}?subject=${encodeURIComponent(subject)}`);
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

      <section className="max-w-7xl mx-auto pb-12 px-4">
        <div className="mb-6">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-[0.2em]">Bắt đầu nhanh</p>
          <h2 className="text-2xl font-black text-gray-900">Chọn khối lớp</h2>
          <p className="text-gray-500 mt-2">Nhảy thẳng vào tài liệu theo khối lớp 6-9.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'].map((grade) => (
            <div
              key={grade}
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition"
            >
              <p className="text-lg font-bold text-gray-900">{grade}</p>
              <p className="text-sm text-gray-500 mt-1">Chọn nhanh theo khối</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: 'Thư viện', path: '/library' },
                  { label: 'Đề thi', path: '/exams' },
                  { label: 'Slides', path: '/slides' },
                ].map((destination) => (
                  <button
                    key={destination.path}
                    type="button"
                    onClick={() => navigate(`${destination.path}?grade=${encodeURIComponent(grade)}`)}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition"
                  >
                    {destination.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto pb-12 px-4">
        <div className="mb-6">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-[0.2em]">Khám phá nhanh</p>
          <h2 className="text-2xl font-black text-gray-900">Môn học nổi bật</h2>
          <p className="text-gray-500 mt-2">Chọn khu vực để xem top môn theo từng loại tài liệu.</p>

          <div className="mt-4 inline-flex p-1 rounded-xl bg-white border border-gray-200 gap-1">
            {[
              { key: 'library', label: 'Thư viện' },
              { key: 'exams', label: 'Đề thi' },
              { key: 'slides', label: 'Slides' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSubjectTarget(option.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                  subjectTarget === option.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {subjectStatsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div key={item} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : subjectStats.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjectStats.map((item) => (
              <button
                key={item.subject}
                type="button"
                onClick={() => handleBrowseSubject(item.subject)}
                className="text-left bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition"
              >
                <p className="text-lg font-bold text-gray-900">{item.subject}</p>
                <p className="text-sm text-gray-500 mt-2">{item.documentCount} tài liệu</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-gray-600">
            Chưa có dữ liệu môn học để hiển thị.
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto pb-12 px-4">
        <div className="mb-6">
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-[0.2em]">Người biên soạn</p>
          <h2 className="text-2xl font-black text-gray-900">Tác giả nổi bật</h2>
          <p className="text-gray-500 mt-2">Các tác giả đang có nhiều tài liệu nhất trong hệ thống.</p>
        </div>

        {authorStatsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : authorStats.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {authorStats.map((item, index) => (
              <div
                key={item.author}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-emerald-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{item.author}</p>
                    <p className="text-sm text-gray-500 mt-2">{item.documentCount} tài liệu</p>
                  </div>
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                    #{index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-gray-600">
            Chưa có dữ liệu tác giả để hiển thị.
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto pb-16 px-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-[0.2em]">Mới cập nhật</p>
            <h2 className="text-2xl font-black text-gray-900">Tài liệu vừa đăng</h2>
            <p className="text-gray-500 mt-2">Hiển thị nhanh 6 tài liệu mới nhất trên hệ thống.</p>
          </div>
          <Link to="/library" className="text-blue-600 font-semibold hover:text-blue-700">
            Xem toàn bộ thư viện
          </Link>
        </div>

        {recentLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : recentDocuments.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDocuments.map((item) => (
              <Link
                key={item.id}
                to={`/documents/${item.id}`}
                className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition flex flex-col gap-3"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {getSectionLabel(item.section)}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    {item.subject}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {item.grade}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="text-sm text-gray-500 flex items-center justify-between gap-3">
                  <span className="truncate">{item.author}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-gray-600">
            Chưa có tài liệu mới để hiển thị.
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
