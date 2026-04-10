import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import {
  canManageDocument,
  deleteDocument,
  getApiErrorMessage,
  getDonations,
  getDocuments,
  getResourceTypeOptions,
  getSectionLabel,
  getSectionOptionsForRole,
  ROLE_LABELS,
  saveDocument,
} from '../../services/apiService';

const defaultForm = {
  id: '',
  title: '',
  description: '',
  author: '',
  subject: 'Toán',
  grade: 'Khối 6',
  section: 'library',
  resourceType: 'Tài liệu',
  image: '',
  pdfUrl: '',
};

const ManagePage = () => {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [donations, setDonations] = useState([]);
  const [formData, setFormData] = useState(() => ({
    ...defaultForm,
    author: currentUser?.fullName || '',
  }));
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const sectionOptions = getSectionOptionsForRole(currentUser.role);
  const manageableDocuments = useMemo(
    () => documents.filter((document) => canManageDocument(currentUser, document)),
    [currentUser, documents],
  );

  const resourceTypeOptions = getResourceTypeOptions(formData.section, currentUser.role);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [nextDocuments, nextDonations] = await Promise.all([getDocuments(), getDonations()]);
        if (isMounted) {
          setDocuments(nextDocuments);
          setDonations(nextDonations);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(getApiErrorMessage(requestError, 'Không tải được dữ liệu quản trị.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetForm = () => {
    const firstSection = sectionOptions[0] || 'library';
    const firstResourceType = getResourceTypeOptions(firstSection, currentUser.role)[0] || 'Tài liệu';

    setFormData({
      ...defaultForm,
      section: firstSection,
      resourceType: firstResourceType,
      author: currentUser.fullName,
    });
  };

  const handleChange = (field, value) => {
    if (field === 'section') {
      const nextResourceType = getResourceTypeOptions(value, currentUser.role)[0] || 'Tài liệu';
      setFormData((previous) => ({
        ...previous,
        section: value,
        resourceType: nextResourceType,
      }));
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setFeedback('');
    setSubmitting(true);

    try {
      const savedDocument = await saveDocument(formData);
      setDocuments((previous) => {
        if (formData.id) {
          return previous.map((document) => (document.id === savedDocument.id ? savedDocument : document));
        }
        return [savedDocument, ...previous];
      });
      setFeedback(formData.id ? 'Đã cập nhật tài liệu thành công.' : 'Đã đăng tải tài liệu thành công.');
      resetForm();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Không thể lưu tài liệu.'));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (document) => {
    setFeedback('');
    setError('');
    setFormData({
      id: document.id,
      title: document.title,
      description: document.description,
      author: document.author,
      subject: document.subject,
      grade: document.grade,
      section: document.section,
      resourceType: document.resourceType,
      image: document.image,
      pdfUrl: document.pdfUrl,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (documentId, documentTitle) => {
    setFeedback('');
    setError('');

    const confirmed = window.confirm(`Xóa tài liệu "${documentTitle}"?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(documentId);

    try {
      await deleteDocument(documentId);
      setDocuments((previous) => previous.filter((document) => document.id !== documentId));
      if (formData.id === documentId) {
        resetForm();
      }
      setFeedback('Đã xóa tài liệu thành công.');
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, 'Không thể xóa tài liệu.'));
    } finally {
      setDeletingId('');
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Đang tải dữ liệu quản trị...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <section className="bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-300 mb-3">Bảng điều khiển</p>
        <h1 className="text-4xl font-black mb-3">Khu quản trị nội dung MVP</h1>
        <p className="text-slate-200 max-w-3xl leading-7">
          {ROLE_LABELS[currentUser.role]} có thể đăng tải, chỉnh sửa và xóa tài liệu đúng theo quyền hạn.
          Học sinh chỉ được xem nội dung công khai và gửi quyên góp sách.
        </p>
      </section>

      <section className="grid xl:grid-cols-[1.1fr,0.9fr] gap-8 items-start">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {formData.id ? 'Chỉnh sửa tài liệu' : 'Đăng tải tài liệu mới'}
              </h2>
              <p className="text-gray-500 mt-1">Hoàn thiện thông tin để hiển thị trên thư viện số.</p>
            </div>
            {formData.id ? (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
              >
                Hủy chỉnh sửa
              </button>
            ) : null}
          </div>

          {feedback ? <div className="rounded-2xl bg-emerald-50 text-emerald-700 px-4 py-3">{feedback}</div> : null}
          {error ? <div className="rounded-2xl bg-red-50 text-red-700 px-4 py-3">{error}</div> : null}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Khu vực</label>
              <select
                value={formData.section}
                onChange={(event) => handleChange('section', event.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sectionOptions.map((option) => (
                  <option key={option} value={option}>
                    {getSectionLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Loại tài liệu</label>
              <select
                value={formData.resourceType}
                onChange={(event) => handleChange('resourceType', event.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              >
                {resourceTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tiêu đề</label>
            <input
              value={formData.title}
              onChange={(event) => handleChange('title', event.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ví dụ: Đề thi thử Toán 9 lần 1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả ngắn</label>
            <textarea
              value={formData.description}
              onChange={(event) => handleChange('description', event.target.value)}
              required
              rows="4"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả ngắn nội dung và đối tượng sử dụng"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tác giả</label>
              <input
                value={formData.author}
                onChange={(event) => handleChange('author', event.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Môn học</label>
              <input
                value={formData.subject}
                onChange={(event) => handleChange('subject', event.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Khối lớp</label>
              <select
                value={formData.grade}
                onChange={(event) => handleChange('grade', event.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['Tất cả', 'Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'].map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ảnh bìa</label>
              <input
                value={formData.image}
                onChange={(event) => handleChange('image', event.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Link PDF</label>
              <input
                value={formData.pdfUrl}
                onChange={(event) => handleChange('pdfUrl', event.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://...pdf"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang lưu...' : (formData.id ? 'Lưu cập nhật' : 'Đăng tải tài liệu')}
          </button>
        </form>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Tài liệu bạn quản lý</h2>
            <p className="text-gray-500 mb-5">{manageableDocuments.length} tài liệu nằm trong quyền thao tác hiện tại.</p>

            <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
              {manageableDocuments.map((document) => (
                <div key={document.id} className="border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{document.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {getSectionLabel(document.section)} - {document.resourceType} - {document.grade}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                      {document.subject}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => startEdit(document)}
                      className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 transition"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(document.id, document.title)}
                      disabled={deletingId === document.id}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deletingId === document.id ? 'Đang xóa...' : 'Xóa'}
                    </button>
                    <Link
                      to={`/documents/${document.id}`}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              ))}

              {manageableDocuments.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-2xl text-gray-400">
                  Chưa có tài liệu nào trong phạm vi bạn quản lý.
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Quyên góp đã gửi</h2>
            <p className="text-gray-500 mb-5">Danh sách biểu mẫu quyên góp sách đã được lưu trong MVP.</p>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {donations.map((donation) => (
                <div key={donation.id} className="border border-gray-100 rounded-2xl p-4">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{donation.bookName}</h3>
                      <p className="text-sm text-gray-500 mt-1">{donation.fullName} - {ROLE_LABELS[donation.submittedByRole]}</p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 h-fit">
                      {donation.grade}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">Tình trạng: {donation.condition}</p>
                  {donation.message ? <p className="text-sm text-gray-500 mt-2">{donation.message}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ManagePage;