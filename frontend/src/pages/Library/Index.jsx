import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookCard from '../../components/cards/BookCard';
import { getDocumentsBySection, getUniqueSubjects } from '../../services/apiService';

const PAGE_SIZE = 12;
const LIBRARY_FILTERS_STORAGE_KEY = 'digital-library-filters-library';
const LIBRARY_SAVE_PREF_KEY = 'digital-library-filters-library-enabled';

const LibraryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [subjects, setSubjects] = useState(['Tất cả']);
  const [selectedGrade, setSelectedGrade] = useState('Tất cả');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [debouncedKeyword, setDebouncedKeyword] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(() => window.localStorage.getItem(LIBRARY_SAVE_PREF_KEY) !== '0');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    const grade = searchParams.get('grade');
    const subject = searchParams.get('subject');
    const query = searchParams.get('q');
    const pageParam = Number.parseInt(searchParams.get('page') || '1', 10);

    if (!grade && !subject && !query && !searchParams.get('page') && saveAsDefault) {
      try {
        const savedRaw = window.localStorage.getItem(LIBRARY_FILTERS_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          setSelectedGrade(saved.grade || 'Tất cả');
          setSelectedCategory(saved.subject || 'Tất cả');
          setKeyword(saved.keyword || '');
          setSortBy(saved.sortBy || 'newest');
          setPage(1);
          return;
        }
      } catch {
        // ignore malformed local storage
      }
    }

    setSelectedGrade(grade || 'Tất cả');
    setSelectedCategory(subject || 'Tất cả');
    setKeyword(query || '');
    setDebouncedKeyword(query || '');
    setPage(Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam);
  }, [searchParamsKey, saveAsDefault]);

  const fetchBooks = async (nextPage = 1) => {
    const payload = {
      page: nextPage,
      pageSize: PAGE_SIZE,
      grade: selectedGrade === 'Tất cả' ? undefined : selectedGrade,
      subject: selectedCategory === 'Tất cả' ? undefined : selectedCategory,
      q: debouncedKeyword.trim() || undefined,
      sort: sortBy,
    };

    setLoading(true);
    const { items, total: totalItems } = await getDocumentsBySection('library', payload);
    setBooks(items || []);
    setTotal(totalItems || 0);
    setPage(nextPage);
    setLoading(false);
  };

  const updateSearchParamsFromState = (pageValue = page) => {
    const nextParams = new URLSearchParams();
    if (selectedGrade !== 'Tất cả') nextParams.set('grade', selectedGrade);
    if (selectedCategory !== 'Tất cả') nextParams.set('subject', selectedCategory);
    if (debouncedKeyword.trim()) nextParams.set('q', debouncedKeyword.trim());
    if (sortBy !== 'newest') nextParams.set('sort', sortBy);
    if (pageValue > 1) nextParams.set('page', String(pageValue));

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  };

  const activeFilters = [
    selectedGrade !== 'Tất cả' ? selectedGrade : null,
    selectedCategory !== 'Tất cả' ? selectedCategory : null,
    debouncedKeyword.trim() ? `Từ khóa: ${debouncedKeyword.trim()}` : null,
  ].filter(Boolean);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [keyword]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [docs, nextSubjects] = await Promise.all([
        getDocumentsBySection('library', { page: 1, pageSize: PAGE_SIZE }),
        getUniqueSubjects('library'),
      ]);

      if (!mounted) return;
      setBooks(docs.items || docs || []);
      setTotal(docs.total ?? docs.items?.length ?? docs.length ?? 0);
      setPage(1);
      setSubjects(['Tất cả', ...nextSubjects]);
    };

    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    fetchBooks(page);
    updateSearchParamsFromState(page);

    if (saveAsDefault) {
      window.localStorage.setItem(
        LIBRARY_FILTERS_STORAGE_KEY,
        JSON.stringify({
          grade: selectedGrade,
          subject: selectedCategory,
          keyword: debouncedKeyword,
          sortBy,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, selectedCategory, debouncedKeyword, sortBy, saveAsDefault, page]);

  useEffect(() => {
    window.localStorage.setItem(LIBRARY_SAVE_PREF_KEY, saveAsDefault ? '1' : '0');

    if (!saveAsDefault) {
      window.localStorage.removeItem(LIBRARY_FILTERS_STORAGE_KEY);
    }
  }, [saveAsDefault]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const resetFilters = () => {
    setSelectedGrade('Tất cả');
    setSelectedCategory('Tất cả');
    setKeyword('');
    fetchBooks(1);
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
    selectedCategory !== 'Tất cả' ? 'Tất cả môn học' : null,
    selectedGrade !== 'Tất cả' ? 'Tất cả khối lớp' : null,
  ].filter(Boolean);

  const applySuggestion = (suggestion) => {
    if (suggestion === 'Bỏ từ khóa') setKeyword('');
    if (suggestion === 'Tất cả môn học') setSelectedCategory('Tất cả');
    if (suggestion === 'Tất cả khối lớp') setSelectedGrade('Tất cả');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Kho Tài Nguyên Số</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span role="img" aria-label="search">🔍</span> Bộ lọc
            </h2>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">Khối lớp</h3>
              <div className="space-y-2">
                {['Tất cả', 'Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'].map((grade) => (
                  <label key={grade} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="grade"
                      checked={selectedGrade === grade}
                      onChange={() => setSelectedGrade(grade)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${selectedGrade === grade ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
                      {grade}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">Môn học</h3>
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <label key={subject} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="subject"
                      checked={selectedCategory === subject}
                      onChange={() => setSelectedCategory(subject)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${selectedCategory === subject ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
                      {subject}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">Từ khóa</h3>
              <div className="relative">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  className="w-full px-4 py-2 pr-9 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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

            <button
              type="button"
              onClick={resetFilters}
              className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
            >
              Xóa bộ lọc
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-50">
            <div>
              <p className="text-sm text-gray-500 italic">Hiển thị {books.length} kết quả (tổng {total})</p>
              {loading && <p className="text-sm text-blue-600 font-medium mt-1">Đang tìm kiếm...</p>}
              {!loading && debouncedKeyword.trim() && books.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">Không có kết quả cho từ khóa "{debouncedKeyword.trim()}".</p>
              )}
            </div>
            <label className="text-sm text-gray-600 flex items-center gap-2">
              Sắp xếp
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Mới nhất</option>
                <option value="title">Tiêu đề A-Z</option>
                <option value="subject">Môn học A-Z</option>
              </select>
            </label>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-blue-700 mr-1">Đang lọc theo:</span>
            {activeFilters.length > 0 ? activeFilters.map((filter) => (
              <span key={filter} className="px-3 py-1 rounded-full bg-white text-blue-700 text-sm border border-blue-200">
                {filter}
              </span>
            )) : (
              <span className="text-sm text-blue-700">Chưa áp dụng bộ lọc nào.</span>
            )}

            <label className="ml-auto flex items-center gap-2 text-sm text-blue-700 font-medium">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(event) => setSaveAsDefault(event.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              Lưu làm mặc định
            </label>

            <div className="flex items-center gap-2">
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition"
                >
                  Xóa tất cả
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyFilters}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition"
              >
                Sao chép liên kết bộ lọc
              </button>
            </div>

            {copyStatus && <span className="text-sm text-blue-700 font-semibold">{copyStatus}</span>}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div key={item} className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <BookCard key={book.id} document={book} />
              ))}
            </div>
          )}

          {books.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed">
              <p className="text-gray-400">Không tìm thấy tài liệu nào. Thử chọn khối khác bạn nhé! 📚</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                onClick={() => fetchBooks(page - 1)}
                disabled={page <= 1}
              >
                ← Trước
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                onClick={() => fetchBooks(page + 1)}
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

export default LibraryPage;
