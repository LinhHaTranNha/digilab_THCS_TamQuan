from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import Document, User
from app.schemas import ChatRequest, ChatResponse
from app.services.llm_nvidia import chat_with_nvidia


router = APIRouter(prefix='/chat', tags=['chat'])


def detect_subject(message: str) -> str | None:
    lower = message.lower()
    mapping = {
        'toán': 'Toán',
        'van': 'Văn',
        'văn': 'Văn',
        'anh': 'Tiếng Anh',
        'tiếng anh': 'Tiếng Anh',
        'ly': 'Vật Lý',
        'lý': 'Vật Lý',
        'hoa': 'Hóa Học',
        'hóa': 'Hóa Học',
        'sinh': 'Sinh Học',
        'su': 'Lịch Sử',
        'sử': 'Lịch Sử',
        'dia': 'Địa Lý',
        'địa': 'Địa Lý',
        'tin': 'Tin Học',
    }
    for key, value in mapping.items():
        if key in lower:
            return value
    return None


def detect_grade(message: str) -> str | None:
    lower = message.lower()
    for n in ['6', '7', '8', '9']:
        if f'lớp {n}' in lower or f'lop {n}' in lower:
            return n
    return None


def detect_section(message: str) -> str | None:
    lower = message.lower()
    if 'đề' in lower or 'de thi' in lower or 'đề thi' in lower or 'đề cương' in lower:
        return 'exams'
    if 'slide' in lower:
        return 'slides'
    if 'thư viện' in lower or 'ebook' in lower or 'tài liệu' in lower:
        return 'library'
    return None


def build_document_context(db: Session, message: str) -> tuple[str, list[str]]:
    docs = db.scalars(select(Document).order_by(Document.created_at.desc())).all()

    subject = detect_subject(message)
    grade = detect_grade(message)
    section = detect_section(message)
    keyword = message.strip().lower()

    filtered: list[Document] = []
    for doc in docs:
        if subject and doc.subject != subject:
            continue
        if grade and doc.grade != grade:
            continue
        if section and doc.section != section:
            continue

        if keyword:
            haystack = f"{doc.title} {doc.description} {doc.author} {doc.subject} {doc.grade} {doc.section}".lower()
            if subject or grade or section:
                # if already filtered by structured fields, keyword check can be softer
                if keyword not in haystack and len(filtered) == 0:
                    pass
            elif keyword not in haystack:
                continue

        filtered.append(doc)

    if not filtered:
        filtered = docs[:5]

    top = filtered[:5]
    lines = [
        f"- [{doc.id}] {doc.title} | Môn: {doc.subject} | Khối: {doc.grade} | Mục: {doc.section} | Loại: {doc.resource_type} | PDF: {doc.pdf_url}"
        for doc in top
    ]

    return "\n".join(lines), [doc.id for doc in top]


@router.post('', response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ChatResponse:
    role_hint = f"[Vai trò người dùng: {current_user.role}; Khối: {current_user.grade}]"
    context, source_ids = build_document_context(db, payload.message)

    response = chat_with_nvidia(
        user_message=(
            f"{role_hint}\n"
            "Hãy trả lời dựa trên dữ liệu tài liệu được cung cấp. "
            "Nếu người dùng hỏi tìm tài liệu, hãy gợi ý tối đa 3 tài liệu phù hợp nhất. "
            "Nếu không có tài liệu phù hợp, nói rõ chưa tìm thấy và gợi ý đổi từ khóa/môn/khối.\n\n"
            f"Câu hỏi: {payload.message}"
        ),
        context=context,
    )

    return ChatResponse(reply=response, sources=source_ids)
