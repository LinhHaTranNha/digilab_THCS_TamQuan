import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { askAiAdvisor, getApiErrorMessage, getSectionLabel } from '../../services/apiService';
import { useAuth } from '../../store/AuthContext';

const quickPrompts = [
  'Em học yếu Toán 9, nên bắt đầu từ tài liệu nào trước?',
  'Gợi ý cho em tài liệu ôn Văn 9 để chuẩn bị thi vào 10.',
  'Em cần bộ đề cương dễ hiểu cho Khối 8 môn Anh.',
];

const initialFilters = {
  grade: 'Tất cả',
  subject: 'Tất cả',
  section: 'Tất cả',
  resourceType: 'Tất cả',
};

const AdvisorPage = () => {
  const { currentUser } = useAuth();
  const [question, setQuestion] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const helperText = useMemo(() => {
    if (!currentUser) {
      return 'Bạn cần đăng nhập để sử dụng trợ lý AI.';
    }

    if (currentUser.role === 'student') {
      return `Bạn đang đăng nhập với ${currentUser.grade}. Nếu muốn hỏi tài liệu cho khối khác, cứ nêu rõ trong câu hỏi hoặc chọn bộ lọc tương ứng.`;
    }

    return 'Bạn có thể đặt câu hỏi như học sinh để thử tư vấn tài liệu từ metadata hiện có.';
  }, [currentUser]);

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
          text: response.answer,
          recommendedDocuments: response.recommendedDocuments || [],
          planBySubject: response.planBySubject || [],
          appliedFilters: {
            grade: response.appliedGrade,
            subject: response.appliedSubject,
            subjects: response.appliedSubjects || [],
            section: response.appliedSection,
            resourceType: response.appliedResourceType,
            examGoal: response.appliedExamGoal,
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

  const updateFilter = (field, value) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-[radial-gradient(circle_at_top,_#dbeafe,_#eff6ff_45%,_#f8fafc)] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-12 grid lg:grid-cols-[0.95fr,1.05fr] gap-8 items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-blue-600 mb-3">Tro ly AI</p>
            <h1 className="text-4xl font-black text-slate-900 mb-4">Tư vấn tài liệu học tập theo nhu cầu của học sinh</h1>
            <p className="text-slate-600 leading-8 mb-6">
              Khung chat này chỉ gọi tới backend của DigiLib. Backend sẽ chọn shortlist tài liệu từ cơ sở dữ liệu rồi mới gửi metadata đó sang mô hình AI.
            </p>
            <div className="rounded-3xl border border-blue-100 bg-white/80 backdrop-blur p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Trang thái phiên hiện tại</p>
              <p className="text-sm text-slate-600">{helperText}</p>
              <p className="text-sm text-slate-600">Vai trò đăng nhập: <span className="font-semibold text-slate-900">{currentUser?.role || 'anonymous'}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-6">
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Câu hỏi dành cho trợ lý
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows="5"
                  maxLength={500}
                  placeholder="Ví dụ: Em học Khối 9, muốn ôn thi vào 10 môn Văn thì nên học tài liệu nào trước?"
                  className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitQuestion(prompt)}
                    disabled={loading}
                    className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500">Toàn bộ câu hỏi được xử lý qua backend của DigiLib, frontend không gọi trực tiếp NVIDIA.</p>
                <button
                  type="submit"
                  disabled={loading || question.trim().length < 3}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Đang tư vấn...' : 'Hỏi trợ lý'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="space-y-5">
          {messages.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500">
              Chưa có hội thoại nào. Hãy bắt đầu bằng một câu hỏi về nhu cầu học tập của học sinh.
            </div>
          ) : null}

          {messages.map((message) => (
            <div key={message.id} className={`rounded-[28px] p-6 shadow-sm border ${message.role === 'user' ? 'bg-slate-900 text-white border-slate-900 ml-auto max-w-3xl' : 'bg-white border-slate-200 max-w-5xl'}`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className={`text-xs uppercase tracking-[0.25em] ${message.role === 'user' ? 'text-slate-300' : 'text-blue-600'}`}>
                  {message.role === 'user' ? 'Ban' : 'Tro ly AI'}
                </p>
                {message.appliedFilters ? (
                  <p className="text-xs text-slate-400">
                    {[
                      message.appliedFilters.grade,
                      ...(message.appliedFilters.subjects?.length ? message.appliedFilters.subjects : [message.appliedFilters.subject]),
                      message.appliedFilters.section ? getSectionLabel(message.appliedFilters.section) : null,
                      message.appliedFilters.resourceType,
                      message.appliedFilters.examGoal,
                    ].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
              </div>

              <p className={`whitespace-pre-line leading-8 ${message.role === 'user' ? 'text-slate-100' : 'text-slate-700'}`}>{message.text}</p>

              {message.recommendedDocuments?.length ? (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {message.recommendedDocuments.map((document) => (
                    <div key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">{getSectionLabel(document.section)}</p>
                      <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{document.title}</h3>
                      <p className="text-sm text-slate-500 mb-2">{document.subject} · {document.grade}</p>
                      <p className="text-sm text-slate-600 line-clamp-4 mb-4">{document.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/documents/${document.id}`}
                          className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                        >
                          Xem chi tiết
                        </Link>
                        <a
                          href={document.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
                        >
                          Mở PDF
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {message.planBySubject?.length ? (
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Kế hoạch học theo môn</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {message.planBySubject.map((plan) => (
                      <div key={`${message.id}-${plan.subject}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Ưu tiên {plan.priority}</p>
                        <p className="font-semibold text-slate-900 mb-2">{plan.subject}</p>
                        <p className="text-sm text-slate-600 mb-2">{plan.recommendation}</p>
                        <p className="text-xs text-slate-500">Số tài liệu gợi ý: {plan.documents?.length || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdvisorPage;