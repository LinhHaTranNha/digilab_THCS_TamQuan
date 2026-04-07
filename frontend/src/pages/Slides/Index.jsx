import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookCard from '../../components/cards/BookCard';
import { getDocumentsBySection, getUniqueSubjects } from '../../services/apiService';

const PAGE_SIZE = 12;
const SLIDE_FILTERS_STORAGE_KEY = 'digital-library-filters-slides';
const SLIDE_SAVE_PREF_KEY = 'digital-library-filters-slides-enabled';

const SlidePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [slides, setSlides] = useState([]);
  const [total, setTotal] = useState(0);
  const [subjects, setSubjects] = useState(['Tất cả']);
  const [filterType, setFilterType] = useState('Tất cả');
  const [selectedGrade, setSelectedGrade] = useState('Tất cả');
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [debouncedKeyword, setDebouncedKeyword] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(() => window.localStorage.getItem(SLIDE_SAVE_PREF_KEY) !== '0');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    const grade = searchParams.get('grade');
    const subject = searchParams.get('subject');
    const query = searchParams.get('q');
    const pageParam = Number.parseInt(searchParams.get('page') || '1', 10);

    if (!grade && !subject && !query && !searchParams.get('page') && saveAsDefault) {
      try {
        const savedRaw = window.localStorage.getItem(SLIDE_FILTERS_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          setSelectedGrade(saved.grade || 'Tất cả');
          setFilterType(saved.subject || 'Tất cả');
          setKeyword(saved.keyword || '');
          setDebouncedKeyword(saved.keyword || '');
          setSortBy(saved.sortBy || 'newest');
          setPage(1);
          return;
        }
      } catch {
        // ignore malformed local storage
      }
    }

    setSelectedGrade(grade || 'Tất cả');
    setFilterType(subject || 'Tất cả');
    setKeyword(query || '');
    setDebouncedKeyword(query || '');
    setPage(Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam);
  }, [searchParamsKey, saveAsDefault]);

  const fetchSlides = async (nextPage = 1) => {
    const payload = {
      page: nextPage,
      pageSize: PAGE_SIZE,
      grade: selectedGrade === 'Tất cả' ? undefined : selectedGrade,
      subject: filterType === 'Tất cả' ? undefined : filterType,
      q: debouncedKeyword.trim() || undefined,
      sort: sortBy,
    };

    setLoading(true);
    const { items, total: nextTotal } = await getDocumentsBySection('slides', payload);
    setSlides(items || []);
    setTotal(nextTotal || 0);
    setPage(nextPage);
    setLoading(false);
  };

  const updateSearchParamsFromState = (pageValue = page) => {
    const nextParams = new URLSearchParams();
    if (filterType !== 'Tất cả') nextParams.set('subject', filterType);
    if (selectedGrade !== 'Tất cả') nextParams.set('grade', selectedGrade);
    if (debouncedKeyword.trim()) nextParams.set('q', debouncedKeyword.trim());
    if (sortBy !== 'newest') nextParams.set('sort', sortBy);
    if (pageValue > 1) nextParams.set('page', String(pageValue));

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [keyword]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [docs, nextSubjects] = await Promise.all([
        getDocumentsBySection('slides', { page: 1, pageSize: PAGE_SIZE }),
        getUniqueSubjects('slides'),
      ]);

      if (!isMounted) return;

      setSlides(docs.items || docs || []);
      setTotal(docs.total ?? docs.items?.length ?? docs.length ?? 0);
      setPage(1);
      setSubjects(['Tất cả', ...nextSubjects]);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchSlides(page);
    updateSearchParamsFromState(page);

    if (saveAsDefault) {
      window.localStorage.setItem(
        SLIDE_FILTERS_STORAGE_KEY,
        JSON.stringify({
          subject: filterType,
          grade: selectedGrade,
          keyword: debouncedKeyword,
          sortBy,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, selectedGrade, debouncedKeyword, sortBy, saveAsDefault, page]);

  useEffect(() => {
    window.localStorage.setItem(SLIDE_SAVE_PREF_KEY, saveAsDefault ? '1' : '0');
    if (!saveAsDefault) {
      window.localStorage.removeItem(SLIDE_FILTERS_STORAGE_KEY);
    }
  }, [saveAsDefault]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const resetFilters = () => {
    setFilterType('Tất cả');
    setSelectedGrade('Tất cả');
    setPage(1);
  };

  const handleCopyFilters = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Đã sao chép liên kết bộ lọc');
      window.setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('Không thể sao chép liên kết');
      window.setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const suggestionChips = [
    keyword.trim() ? 'Bỏ từ khóa' : null,
    filterType !== 'Tất cả' ? 'Tất cả môn học' : null,
    selectedGrade !== 'Tất cả' ? 'Tất cả khối lớp' : null,
  ].filter(Boolean);

  const applySuggestion = (suggestion) => {
    if (suggestion === 'Bỏ từ khóa') setKeyword('');
    if (suggestion === 'Tất cả môn học') setFilterType('Tất cả');
    if (suggestion === 'Tất cả khối lớp') setSelectedGrade('Tất cả');
    setPage(1);
  };

  const activeFilters = [
    filterType !== 'Tất cả' ? filterType : null,
    selectedGrade !== 'Tất cả' ? selectedGrade : null,
    debouncedKeyword.trim() ? `Từ khóa: ${debouncedKeyword.trim()}` : null,
  ].filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 mb-10 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Slide Bài Giảng Điện Tử 💻</h1>
        <p className="opacity-90">Hỗ trợ học sinh ôn tập kiến thức qua các bài giảng trực quan.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <h3 className="font-bold mb-4 text-gray-800">Môn học</h3>
            <div className="flex flex-col gap-3">
              {subjects.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-left px-4 py-2 rounded-lg text-sm transition ${filterType === type ? 'bg-blue-100 text-blue-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <h3 className="font-bold mb-4 text-gray-800">Khối lớp</h3>
            <div className="flex flex-col gap-3">
              {['Tất cả', 'Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'].map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`text-left px-4 py-2 rounded-lg text-sm transition ${selectedGrade === grade ? 'bg-indigo-100 text-indigo-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <h3 className="font-bold mb-4 text-gray-800">Từ khóa</h3>
            <div className="relative">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="w-full px-4 py-2 pr-9 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Tìm theo tiêu đề, môn, tác giả..."
              />
              {keyword.trim() && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                  aria-label="Xóa từ khóa"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <p className="text-sm text-gray-500 italic">Hiển thị {slides.length} kết quả (tổng {total})</p>
              {loading && <p className="text-sm text-indigo-600 font-medium mt-1">Đang tìm kiếm...</p>}
              {!loading && debouncedKeyword.trim() && slides.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">Không có kết quả cho từ khóa "{debouncedKeyword.trim()}".</p>
              )}
            </div>
            <label className="text-sm text-gray-600 flex items-center gap-2">
              Sắp xếp
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="newest">Mới nhất</option>
                <option value="title">Tiêu đề A-Z</option>
                <option value="subject">Môn học A-Z</option>
              </select>
            </label>
          </div>

          <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-indigo-700 mr-1">Đang lọc theo:</span>
            {activeFilters.length > 0 ? activeFilters.map((filter) => (
              <span key={filter} className="px-3 py-1 rounded-full bg-white text-indigo-700 text-sm border border-indigo-200">
                {filter}
              </span>
            )) : (
              <span className="text-sm text-indigo-700">Chưa áp dụng bộ lọc nào.</span>
            )}

            <label className="ml-auto flex items-center gap-2 text-sm text-indigo-700 font-medium">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(event) => setSaveAsDefault(event.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              Lưu làm mặc định
            </label>

            <div className="flex items-center gap-2">
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
                >
                  Xóa tất cả
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyFilters}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
              >
                Sao chép liên kết bộ lọc
              </button>
            </div>

            {copyStatus && <span className="text-sm text-indigo-700 font-semibold">{copyStatus}</span>}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {slides.map((slide) => (
                <BookCard key={slide.id} document={slide} />
              ))}
            </div>
          )}

          {slides.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed text-gray-400 mt-6">
              Chưa có slide phù hợp với bộ lọc hiện tại.
            </div>
          ) : null}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                onClick={() => fetchSlides(page - 1)}
                disabled={page <= 1}
              >
                ← Trước
              </button>
              <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                onClick={() => fetchSlides(page + 1)}
                disabled={page >= totalPages}
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlidePage;
