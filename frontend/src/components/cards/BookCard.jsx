import React from 'react';
import { Link } from 'react-router-dom';
import { getSectionLabel } from '../../services/apiService';

const DEFAULT_COVER = 'https://via.placeholder.com/150x200?text=No+Cover';

const BookCard = ({ document }) => {
  return (
    <article className="group card-surface overflow-hidden hover:-translate-y-1 hover:shadow-lg transition duration-300 cursor-pointer">
      <div className="relative h-52 overflow-hidden bg-slate-100">
        <img
          src={document.image || DEFAULT_COVER}
          alt={document.title}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = DEFAULT_COVER;
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/60 via-slate-900/15 to-transparent" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white/95 text-slate-700 text-[10px] font-bold uppercase tracking-wide shadow-sm">
            {getSectionLabel(document.section)}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-sm">
            {document.resourceType}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">{document.subject} · {document.grade}</p>
          <h3 className="text-lg font-black text-slate-900 line-clamp-2 min-h-[3.5rem] group-hover:text-blue-700 transition-colors">
            {document.title}
          </h3>
        </div>

        <p className="text-sm text-slate-500 italic truncate">{document.author}</p>

        <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.75rem]">
          {document.description || 'Tài liệu học tập được chia sẻ trong thư viện số THCS Tam Quan.'}
        </p>

        <div className="flex items-center gap-2 pt-1 mt-auto">
          {document.pdfUrl ? (
            <a
              href={document.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-soft text-sm flex-1"
            >
              Mở PDF
            </a>
          ) : null}

          <Link
            to={`/documents/${document.id}`}
            className={`btn-primary text-sm ${document.pdfUrl ? 'flex-1' : 'w-full'}`}
          >
            Xem chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BookCard;
