from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import Document, User
from app.schemas import DocumentCreateRequest, DocumentResponse, DocumentsListResponse, DocumentUpdateRequest, model_validate_compat


router = APIRouter(prefix='/documents', tags=['documents'])


def can_manage_document(user: User, document: Document) -> bool:
    if user.role == 'school':
        return True
    return user.role == 'teacher' and document.created_by_id == user.id


def validate_document_permission(user: User, payload: DocumentCreateRequest | DocumentUpdateRequest) -> None:
    if user.role == 'student':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Học sinh không có quyền đăng tải tài liệu.')


@router.get('', response_model=DocumentsListResponse)
def list_documents(
    db: Annotated[Session, Depends(get_db)],
    section: str | None = Query(default=None),
    grade: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    resource_type: str | None = Query(default=None, alias='resourceType'),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias='pageSize'),
    sort: str = Query(default='newest'),
) -> DocumentsListResponse:
    keyword = (q or '').strip()

    sort_options = {
        'newest': Document.created_at.desc(),
        'title': Document.title.asc(),
        'subject': Document.subject.asc(),
    }

    order_clause = sort_options.get(sort, sort_options['newest'])

    query = select(Document)

    if section and section != 'Tất cả':
        query = query.where(Document.section == section)

    if grade and grade != 'Tất cả':
        query = query.where(Document.grade.in_([grade, 'Tất cả']))

    if subject and subject != 'Tất cả':
        query = query.where(Document.subject == subject)

    if resource_type and resource_type != 'Tất cả':
        query = query.where(Document.resource_type == resource_type)

    if keyword:
        lowered = f'%{keyword.lower()}%'
        query = query.where(
            or_(
                Document.title.ilike(lowered),
                Document.description.ilike(lowered),
                Document.author.ilike(lowered),
                Document.subject.ilike(lowered),
            )
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = max((total + page_size - 1) // page_size, 1)
    current_page = min(page, total_pages)
    offset = (current_page - 1) * page_size

    documents = db.scalars(query.order_by(order_clause).offset(offset).limit(page_size)).all()

    return DocumentsListResponse(
        items=[model_validate_compat(DocumentResponse, document) for document in documents],
        page=current_page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get('/subjects', response_model=list[str])
def list_subjects(db: Annotated[Session, Depends(get_db)], section: str | None = Query(default=None)) -> list[str]:
    query = select(Document.subject).where(Document.subject.is_not(None), Document.subject != '')

    if section and section != 'Tất cả':
        query = query.where(Document.section == section)

    rows = db.execute(query.distinct().order_by(Document.subject.asc())).all()
    return [row.subject.strip() for row in rows]


@router.get('/{document_id}', response_model=DocumentResponse)
def get_document(document_id: str, db: Annotated[Session, Depends(get_db)]) -> DocumentResponse:
    document = db.get(Document, document_id)

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Không tìm thấy tài liệu.')

    return model_validate_compat(DocumentResponse, document)


@router.post('', response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DocumentResponse:
    validate_document_permission(current_user, payload)

    document = Document(
        id=f'doc-{__import__("uuid").uuid4().hex[:12]}',
        title=payload.title.strip(),
        description=payload.description.strip(),
        author=payload.author.strip(),
        subject=payload.subject.strip(),
        grade=payload.grade,
        section=payload.section,
        resource_type=payload.resource_type,
        image=payload.image.strip(),
        pdf_url=payload.pdf_url.strip(),
        owner_role=current_user.role,
        created_by_id=current_user.id,
        created_by_name=current_user.full_name,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return model_validate_compat(DocumentResponse, document)


@router.put('/{document_id}', response_model=DocumentResponse)
def update_document(
    document_id: str,
    payload: DocumentUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DocumentResponse:
    document = db.get(Document, document_id)

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Không tìm thấy tài liệu.')

    if not can_manage_document(current_user, document):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có quyền chỉnh sửa tài liệu này.')

    validate_document_permission(current_user, payload)

    document.title = payload.title.strip()
    document.description = payload.description.strip()
    document.author = payload.author.strip()
    document.subject = payload.subject.strip()
    document.grade = payload.grade
    document.section = payload.section
    document.resource_type = payload.resource_type
    document.image = payload.image.strip()
    document.pdf_url = payload.pdf_url.strip()
    db.commit()
    db.refresh(document)
    return model_validate_compat(DocumentResponse, document)


@router.delete('/{document_id}', status_code=status.HTTP_204_NO_CONTENT)
def remove_document(
    document_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    document = db.get(Document, document_id)

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Không tìm thấy tài liệu.')

    if not can_manage_document(current_user, document):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có quyền xóa tài liệu này.')

    db.delete(document)
    db.commit()
