import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getDocumentById,
  getDocuments,
  getSectionLabel,
  ROLE_LABELS,
  getApiErrorMessage,
} from '../../services/apiService';

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

const DocumentDetailPage = () => {
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedDocuments, setRelatedDocuments] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDocument = async () => {
      try {
        const nextDocument = await getDocumentById(documentId);
        if (isMounted) {
          setDocument(nextDocument);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(getApiErrorMessage(requestError, 'Không tải được tài liệu.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  useEffect(() => {
    if (!document) {
      return undefined;
    }

    let isMounted = true;

    const loadRelatedDocuments = async () => {
      setRelatedLoading(true);

      try {
        const response = await getDocuments({
          section: document.section,
          subject: document.subject,
          grade: document.grade,
          sort: 'newest',
          pageSize: 6,
        });

        const nextRelatedDocuments = normalizeDocuments(response)
          .filter((item) => item.id !== document.id)
          .slice(0, 4);

        if (isMounted) {
          setRelatedDocuments(nextRelatedDocuments);
        }
      } catch (requestError) {
        if (isMounted) {
          setError((previousError) => previousError || getApiErrorMessage(requestError, 'Không tải được tài liệu liên quan.'));
        }
      } finally {
        if (isMounted) {
          setRelatedLoading(false);
        }
      }
    };

    loadRelatedDocuments();

    return () => {
      isMounted = false;
    };
  }, [document]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Đang tải tài liệu...</div>;
  }

  if (!document) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Không tìm thấy tài liệu</h1>
        <p className="text-gray-500 mb-6">{error || 'Tài liệu này có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.'}</p>
        <Link
          to="/library"
          className="inline-flex items-center px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          Quay lại thư viện
        </Link>
      </div>
    );
  }

  const createdDate = new Date(document.createdAt).toLocaleDateString('vi-VN');
  const sectionPath = `/${document.section === 'library' ? 'library' : document.section}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Đã sao chép liên kết');
      window.setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('Không thể sao chép liên kết');
      window.setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <nav className="mb-6 text-sm text-gray-500 flex items-center gap-2">
        <Link to="/" className="hover:text-blue-600 font-semibold">Trang chủ</Link>
        <span>/</span>
        <Link to={sectionPath} className="hover:text-blue-600 font-semibold">{getSectionLabel(document.section)}</Link>
        <span>/</span>
        <span className="text-gray-700 font-semibold">{document.title}</span>
      </nav>

      <div className="grid lg:grid-cols-[360px,1fr] gap-10 items-start">
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="h-[420px] bg-gray-100">
            <img src={document.image} alt={document.title} className="w-full h-full object-cover" />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-3 mb-5">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
              {getSectionLabel(document.section)}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">
              {document.resourceType}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">
              {document.subject}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
              {document.grade}
            </span>
          </div>

          <h1 className="text-4xl font-black text-gray-900 mb-4">{document.title}</h1>
          <p className="text-lg text-gray-600 leading-8 mb-8">{document.description}</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Tác giả</p>
              <p className="text-gray-800 font-semibold">{document.author}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Đăng tải bởi</p>
              <p className="text-gray-800 font-semibold">
                {ROLE_LABELS[document.ownerRole]} - {document.createdByName}
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Ngày đăng</p>
              <p className="text-gray-800 font-semibold">{createdDate}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Tệp tài liệu</p>
              <p className="text-gray-800 font-semibold">PDF trực tuyến</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <a
              href={document.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Mở PDF
            </a>
            <a
              href={document.pdfUrl}
              download
              className="inline-flex items-center px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 transition"
            >
              Tải xuống
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center px-6 py-3 rounded-xl bg-white border border-blue-200 text-blue-700 font-semibold hover:bg-blue-50 transition"
            >
              Sao chép liên kết
            </button>
            <Link
              to={sectionPath}
              className="inline-flex items-center px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
            >
              Quay lại danh mục
            </Link>
            {copyStatus && <span className="text-sm text-blue-700 font-semibold">{copyStatus}</span>}
          </div>
        </div>
      </div>

      <section className="mt-14">
        <div className="mb-6">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-[0.2em] mb-2">Gợi ý học tiếp</p>
          <h2 className="text-2xl font-black text-gray-900">Tài liệu liên quan</h2>
          <p className="text-gray-500 mt-2">
            Các tài liệu cùng môn, cùng khối để học sinh tiếp tục ôn tập nhanh hơn.
          </p>
        </div>

        {relatedLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : relatedDocuments.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {relatedDocuments.map((item) => (
              <Link
                key={item.id}
                to={`/documents/${item.id}`}
                className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition"
              >
                <div className="flex flex-wrap gap-2 mb-3">
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
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{item.author}</p>
                <p className="text-sm text-gray-500 leading-6">
                  {item.description.length > 120 ? `${item.description.slice(0, 120)}...` : item.description}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-gray-600">
            Chưa có tài liệu liên quan trong cùng môn học và khối lớp.
          </div>
        )}
      </section>
    </div>
  );
};

export default DocumentDetailPage;
