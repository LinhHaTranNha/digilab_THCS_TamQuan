from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
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


def is_document_search_intent(message: str) -> bool:
    lower = message.lower()
    hints = [
        'tài liệu', 'tai lieu', 'đề', 'de thi', 'đề thi', 'đề cương', 'de cuong',
        'slide', 'ebook', 'môn', 'mon', 'lớp', 'lop', 'toán', 'văn', 'anh',
        'lý', 'ly', 'hóa', 'hoa', 'sinh', 'sử', 'su', 'địa', 'dia', 'tin',
    ]
    return any(h in lower for h in hints)


def build_document_context(db: Session, message: str) -> tuple[str | None, list[str]]:
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

        if keyword and not (subject or grade or section):
            haystack = f"{doc.title} {doc.description} {doc.author} {doc.subject} {doc.grade} {doc.section}".lower()
            if keyword not in haystack:
                continue

        filtered.append(doc)

    if not filtered:
        return None, []

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
    search_intent = is_document_search_intent(payload.message)
    context, source_ids = build_document_context(db, payload.message)

    if search_intent and not context:
        response = (
            'Mình chưa tìm thấy tài liệu phù hợp trong thư viện hiện tại. '
            'Bạn thử nói rõ hơn môn học, khối lớp hoặc loại tài liệu nhé. Ví dụ: "tài liệu Toán lớp 9" hoặc "slide Tiếng Anh lớp 7".'
        )
        return ChatResponse(reply=response, sources=[])

    try:
        response = chat_with_nvidia(
            user_message=(
                f"{role_hint}\n"
                "Nếu đây là câu hỏi chào hỏi hoặc trò chuyện thông thường, hãy trả lời tự nhiên, ngắn gọn, không bịa tài liệu. "
                "Chỉ khi có dữ liệu tài liệu đi kèm thì mới gợi ý tài liệu. Nếu là câu hỏi tìm tài liệu mà không có dữ liệu phù hợp, hãy nói chưa tìm thấy.\n\n"
                f"Câu hỏi: {payload.message}"
            ),
            context=context,
        )
    except HTTPException as exc:
        if exc.status_code >= 500:
            return ChatResponse(
                reply='Chatbot đang bận hoặc model trả lời chậm. Bạn thử hỏi lại sau 1 phút hoặc rút gọn câu hỏi giúp mình nhé.',
                sources=[],
            )
        raise

    return ChatResponse(reply=response, sources=source_ids)
