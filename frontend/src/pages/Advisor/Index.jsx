import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { askAiAdvisor, getApiErrorMessage, getSectionLabel } from '../../services/apiService';
import { useAuth } from '../../store/AuthContext';

const initialFilters = {
  grade: 'Tất cả',
  subject: 'Tất cả',
  section: 'Tất cả',
  resourceType: 'Tất cả',
};

const hasActiveFilters = (filters) => Object.values(filters).some((value) => value !== 'Tất cả');

const ADVISOR_CHAT_STORAGE_KEY = 'digilib-advisor-chat';
const ADVISOR_FILTER_STORAGE_KEY = 'digilib-advisor-filters';

const normalizeAdvisorAnswer = (text = '') => {
  if (!text) return '';

  return text
    .replace(/```(?:json|markdown|md)?/gi, '')
    .replace(/```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const AdvisorPage = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [question, setQuestion] = useState('');
  const [filters, setFilters] = useState(() => {
    try {
      // Priority 1: URL params
      const gradeParam = searchParams.get('grade');
      const subjectParam = searchParams.get('subject');
      const sectionParam = searchParams.get('section');
      const typeParam = searchParams.get('resourceType');

      if (gradeParam || subjectParam || sectionParam || typeParam) {
        return {
          grade: gradeParam || 'Tất cả',
          subject: subjectParam || 'Tất cả',
          section: sectionParam || 'Tất cả',
          resourceType: typeParam || 'Tất cả',
        };
      }

      // Priority 2: Local storage
      const raw = window.localStorage.getItem(ADVISOR_FILTER_STORAGE_KEY);
      if (!raw) return initialFilters;
      return {
        ...initialFilters,
        ...JSON.parse(raw),
      };
    } catch {
      return initialFilters;
    }
  });

  const [messages, setMessages] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ADVISOR_CHAT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(-12) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [filterNotice, setFilterNotice] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState('');

  const helperText = useMemo(() => {
    if (!currentUser) {
      return 'Bạn cần đăng nhập để sử dụng trợ lý AI.';
    }

    if (currentUser.role === 'student') {
      return `Bạn đang đăng nhập với ${currentUser.grade}. Nếu muốn hỏi tài liệu cho khối khác, cứ nêu rõ trong câu hỏi hoặc chọn bộ lọc tương ứng.`;
    }

    return 'Bạn có thể đặt câu hỏi như học sinh để thử tư vấn tài liệu từ metadata hiện có.';
  }, [currentUser]);

  const suggestionChips = useMemo(() => {
    const chips = [];

    if (currentUser?.grade) {
      chips.push(`Lập kế hoạch ôn ${currentUser.grade} trong 2 tuần cho em.`);
    }

    if (filters.subject !== 'Tất cả') {
      chips.push(`Tóm tắt lộ trình học ${filters.subject} theo mức độ từ dễ đến khó.`);
    }

    if (filters.section === 'exams') {
      chips.push('Gợi ý bộ đề thi nên làm trước và cách chia thời gian luyện đề.');
    }

    chips.push('Nếu em chỉ có 30 phút mỗi ngày thì nên học thế nào?');
    chips.push('Chọn giúp em 3 tài liệu khởi đầu dễ hiểu nhất.');

    return chips.slice(0, 4);
  }, [currentUser, filters]);

  useEffect(() => {
    window.localStorage.setItem(ADVISOR_FILTER_STORAGE_KEY, JSON.stringify(filters));

    // Sync to URL
    const nextParams = new URLSearchParams();
    if (filters.grade !== 'Tất cả') nextParams.set('grade', filters.grade);
    if (filters.subject !== 'Tất cả') nextParams.set('subject', filters.subject);
    if (filters.section !== 'Tất cả') nextParams.set('section', filters.section);
    if (filters.resourceType !== 'Tất cả') nextParams.set('resourceType', filters.resourceType);

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    window.localStorage.setItem(ADVISOR_CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-12)));
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, loading]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const submitQuestion = async (customQuestion) => {
    const nextQuestion = (customQuestion ?? question).trim();

    if (!nextQuestion || loading) {
      return;
    }

    setError('');
    setLoading(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: nextQuestion,
    };

    setMessages((previous) => [...previous, userMessage]);

    try {
      const response = await askAiAdvisor({
        question: nextQuestion,
        grade: filters.grade === 'Tất cả' ? undefined : filters.grade,
        subject: filters.subject === 'Tất cả' ? undefined : filters.subject,
        section: filters.section === 'Tất cả' ? undefined : filters.section,
        resourceType: filters.resourceType === 'Tất cả' ? undefined : filters.resourceType,
      });

      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: normalizeAdvisorAnswer(response.answer),
          recommendedDocuments: response.recommendedDocuments || [],
          planBySubject: response.planBySubject || [],
          appliedFilters: {
            grade: response.appliedGrade,
            subject: response.appliedSubject,
            subjects: response.appliedSubjects || [],
            section: response.appliedSection,
            resourceType: response.appliedResourceType,
          },
        },
      ]);
      setQuestion('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể kết nối trợ lý AI lúc này.'));
      setMessages((previous) => previous.filter((message) => message.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitQuestion();
  };

  const handleQuestionKeyDown = async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await submitQuestion();
    }
  };

  const applyFiltersFromMessage = (appliedFilters) => {
    if (!appliedFilters) {
      return;
    }

    setFilters({
      grade: appliedFilters.grade || 'Tất cả',
      subject: appliedFilters.subject || 'Tất cả',
      section: appliedFilters.section || 'Tất cả',
      resourceType: appliedFilters.resourceType || 'Tất cả',
    });
    setFilterNotice('Đã áp dụng bộ lọc từ câu trả lời trước.');
    window.setTimeout(() => setFilterNotice(''), 2200);
  };

  const updateFilter = (field, value) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const formatFilters = (appliedFilters = {}) => {
    const parts = [
      appliedFilters.grade,
      ...(appliedFilters.subjects?.length ? appliedFilters.subjects : [appliedFilters.subject]),
      appliedFilters.section ? getSectionLabel(appliedFilters.section) : null,
      appliedFilters.resourceType,
    ].filter(Boolean);

    if (!parts.length) return '';

    return `\n\nBộ lọc áp dụng: ${parts.join(' · ')}`;
  };

  const handleCopyAnswer = async (text, messageId, appliedFilters) => {
    const payload = `${text}${formatFilters(appliedFilters)}`;

    try {
      await navigator.clipboard.writeText(payload);
      setCopiedMessageId(messageId || '');
      setCopyNotice('Đã sao chép câu trả lời.');
      window.setTimeout(() => {
        setCopyNotice('');
        setCopiedMessageId('');
      }, 2200);
    } catch {
      setCopyNotice('Không thể sao chép câu trả lời.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  const handleCopyAnswerWithDocuments = async (text, documents = [], messageId, appliedFilters) => {
    const documentLines = documents.map((document, index) => `${index + 1}. ${document.title} — ${document.subject} · ${document.grade}${document.pdfUrl ? `\n   ${document.pdfUrl}` : ''}`);

    const payload = [
      `${text}${formatFilters(appliedFilters)}`,
      documentLines.length ? '\nTài liệu gợi ý:' : null,
      documentLines.length ? documentLines.join('\n') : null,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      setCopiedMessageId(messageId || '');
      setCopyNotice('Đã sao chép câu trả lời kèm tài liệu gợi ý.');
      window.setTimeout(() => {
        setCopyNotice('');
        setCopiedMessageId('');
      }, 2200);
    } catch {
      setCopyNotice('Không thể sao chép nội dung chia sẻ.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <section className="h-full overflow-hidden bg-[radial-gradient(circle_at_top,_#e8f0ff,_#f8fbff_45%,_#f8fafc)] border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[0.9fr,1.1fr] gap-6 items-stretch h-full overflow-hidden">
          <div className="overflow-y-auto pr-1">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-600 mb-2">Trợ lý AI</p>
            <h1 className="text-3xl font-black text-slate-900 mb-3">Tư vấn tài liệu học tập theo nhu cầu</h1>
            <p className="text-slate-600 leading-8 mb-6">
              Khung chat này chỉ gọi tới backend của DigiLib. Backend sẽ chọn shortlist tài liệu từ cơ sở dữ liệu rồi mới gửi metadata đó sang mô hình AI.
            </p>
            <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-semibold text-slate-700">
                  Khối lớp
                  <select
                    value={filters.grade}
                    onChange={(event) => updateFilter('grade', event.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['Tất cả', 'Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'].map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Môn học
                  <select
                    value={filters.subject}
                    onChange={(event) => updateFilter('subject', event.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['Tất cả', 'Toán', 'Văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý'].map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Danh mục
                  <select
                    value={filters.section}
                    onChange={(event) => updateFilter('section', event.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Tất cả">Tất cả</option>
                    <option value="library">Thư viện</option>
                    <option value="exams">Đề thi & Đề cương</option>
                    <option value="slides">Slides</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Loại tài liệu
                  <select
                    value={filters.resourceType}
                    onChange={(event) => updateFilter('resourceType', event.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['Tất cả', 'Ebook', 'Tài liệu', 'Đề thi', 'Đề cương', 'Slide'].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-3">
                {filterNotice && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {filterNotice}
                  </div>
                )}

                {copyNotice && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                    {copyNotice}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col min-h-[600px] max-h-[78vh]">

            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col flex-1 min-h-0">
              <div
                ref={messagesContainerRef}
                className="space-y-4 flex-1 min-h-[220px] overflow-y-auto pr-2 custom-scrollbar"
              >
                {messages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500 text-sm">
                    Chưa có hội thoại nào. Hãy bắt đầu bằng một câu hỏi về nhu cầu học tập của học sinh.
                  </div>
                ) : null}

                {messages.map((message) => (
                  <div key={message.id} className={`rounded-2xl p-4 shadow-sm border ${message.role === 'user' ? 'bg-slate-800 text-white border-slate-800 ml-auto max-w-[85%]' : 'bg-slate-50 border-slate-200 mr-auto max-w-[95%]'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${message.role === 'user' ? 'text-slate-300' : 'text-blue-600'}`}>
                        {message.role === 'user' ? 'Bạn' : 'Trợ lý AI'}
                      </p>
                      {message.appliedFilters ? (
                        <p className="text-[10px] text-slate-400 font-medium">
                          {[
                            message.appliedFilters.grade,
                            ...(message.appliedFilters.subjects?.length ? message.appliedFilters.subjects : [message.appliedFilters.subject]),
                            message.appliedFilters.section ? getSectionLabel(message.appliedFilters.section) : null,
                            message.appliedFilters.resourceType,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      ) : null}
                    </div>

                    <p className={`text-sm whitespace-pre-line leading-relaxed ${message.role === 'user' ? 'text-slate-100' : 'text-slate-700'}`}>{message.text}</p>

                    {message.role === 'assistant' ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.appliedFilters ? (
                          <button
                            type="button"
                            onClick={() => applyFiltersFromMessage(message.appliedFilters)}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-100 transition"
                          >
                            Dùng lại bộ lọc
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleCopyAnswer(message.text, `${message.id}-text`, message.appliedFilters)}
                          className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-100 transition"
                        >
                          {copiedMessageId === `${message.id}-text` ? 'Đã chép' : 'Chép câu trả lời'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyAnswerWithDocuments(message.text, message.recommendedDocuments || [], `${message.id}-bundle`, message.appliedFilters)}
                          className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-100 transition"
                        >
                          {copiedMessageId === `${message.id}-bundle` ? 'Đã chép' : 'Chép kèm tài liệu'}
                        </button>
                      </div>
                    ) : null}

                    {message.recommendedDocuments?.length ? (
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {message.recommendedDocuments.map((document) => (
                          <div key={document.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <p className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">{getSectionLabel(document.section)}</p>
                            <h3 className="text-xs font-bold text-slate-900 mb-1 line-clamp-1">{document.title}</h3>
                            <p className="text-[10px] text-slate-500 mb-2">{document.subject} · {document.grade}</p>
                            <div className="flex gap-2">
                              <Link
                                to={`/documents/${document.id}`}
                                className="px-2 py-1 rounded-md bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition"
                              >
                                Xem
                              </Link>
                              <a
                                href={document.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-200 transition"
                              >
                                PDF
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {message.planBySubject?.length ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kế hoạch học tập</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {message.planBySubject.map((plan) => (
                            <div key={`${message.id}-${plan.subject}`} className="rounded-xl border border-slate-100 bg-white/50 p-2.5">
                              <p className="text-[11px] font-bold text-slate-900 mb-0.5">{plan.subject}</p>
                              <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">{plan.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}

                {loading && (
                  <div className="rounded-2xl p-4 shadow-sm border bg-slate-50 border-slate-200 mr-auto max-w-[95%] animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider ml-1">Trợ lý đang suy nghĩ...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-slate-200 space-y-4 bg-white">
                <label className="block text-sm font-semibold text-slate-700">
                  Câu hỏi dành cho trợ lý
                  <div className="mt-2 flex items-end gap-2">
                    <textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      onKeyDown={handleQuestionKeyDown}
                      rows="4"
                      maxLength={500}
                      placeholder="Gõ câu hỏi... (Enter để gửi, Shift+Enter xuống dòng)"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={loading || question.trim().length < 3}
                      className="h-[46px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {loading ? '...' : 'Gửi'}
                    </button>
                  </div>
                </label>

                {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdvisorPage;