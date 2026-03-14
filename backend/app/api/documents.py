from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import Document, User
from app.schemas import DocumentCreateRequest, DocumentResponse, DocumentUpdateRequest, model_validate_compat


router = APIRouter(prefix='/documents', tags=['documents'])


def can_manage_document(user: User, document: Document) -> bool:
    if user.role == 'school':
        return True
    return user.role == 'teacher' and document.created_by_id == user.id


def validate_document_permission(user: User, payload: DocumentCreateRequest | DocumentUpdateRequest) -> None:
    if user.role == 'student':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Học sinh không có quyền đăng tải tài liệu.')


@router.get('', response_model=list[DocumentResponse])
def list_documents(
    db: Annotated[Session, Depends(get_db)],
    section: str | None = Query(default=None),
    grade: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    resource_type: str | None = Query(default=None, alias='resourceType'),
    q: str | None = Query(default=None),
) -> list[DocumentResponse]:
    documents = db.scalars(select(Document).order_by(Document.created_at.desc())).all()

    filtered: list[Document] = []
    keyword = (q or '').strip().lower()
    for document in documents:
        if section and document.section != section:
            continue
        if grade and grade != 'Tất cả' and document.grade != grade:
            continue
        if subject and subject != 'Tất cả' and document.subject != subject:
            continue
        if resource_type and resource_type != 'Tất cả' and document.resource_type != resource_type:
            continue
        if keyword:
            haystack = f'{document.title} {document.description} {document.author} {document.subject}'.lower()
            if keyword not in haystack:
                continue
        filtered.append(document)

    return [model_validate_compat(DocumentResponse, document) for document in filtered]


@router.get('/subjects', response_model=list[str])
def list_subjects(db: Annotated[Session, Depends(get_db)], section: str | None = Query(default=None)) -> list[str]:
    documents = db.scalars(select(Document)).all()
    values = sorted({document.subject for document in documents if section is None or document.section == section})
    return values


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
