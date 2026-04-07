from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Document


router = APIRouter(prefix='/stats', tags=['stats'])


def apply_document_filters(query, section: str | None, grade: str | None):
    if section and section != 'Tất cả':
        query = query.where(Document.section == section)

    if grade and grade != 'Tất cả':
        query = query.where(Document.grade.in_([grade, 'Tất cả']))

    return query


@router.get('/subjects')
def get_subject_stats(
    db: Annotated[Session, Depends(get_db)],
    section: str | None = Query(default=None),
    grade: str | None = Query(default=None),
    limit: int = Query(default=8, ge=1, le=20),
) -> dict[str, list[dict[str, int | str]]]:
    query = apply_document_filters(
        select(
            Document.subject.label('subject'),
            func.count(Document.id).label('document_count'),
        ).group_by(Document.subject),
        section=section,
        grade=grade,
    )

    rows = db.execute(
        query.order_by(func.count(Document.id).desc(), Document.subject.asc()).limit(limit)
    ).all()

    items = [
        {
            'subject': row.subject,
            'documentCount': int(row.document_count),
        }
        for row in rows
        if row.subject and row.subject.strip()
    ]

    return {'items': items}


@router.get('/authors')
def get_author_stats(
    db: Annotated[Session, Depends(get_db)],
    section: str | None = Query(default=None),
    grade: str | None = Query(default=None),
    limit: int = Query(default=6, ge=1, le=20),
) -> dict[str, list[dict[str, int | str]]]:
    query = apply_document_filters(
        select(
            Document.author.label('author'),
            func.count(Document.id).label('document_count'),
        )
        .where(Document.author.is_not(None), Document.author != '')
        .group_by(Document.author),
        section=section,
        grade=grade,
    )

    rows = db.execute(
        query.order_by(func.count(Document.id).desc(), Document.author.asc()).limit(limit)
    ).all()

    items = [
        {
            'author': row.author,
            'documentCount': int(row.document_count),
        }
        for row in rows
        if row.author and row.author.strip()
    ]

    return {'items': items}
