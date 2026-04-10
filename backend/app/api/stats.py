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


@router.get('/overview')
def get_overview_stats(
    db: Annotated[Session, Depends(get_db)],
    grade: str | None = Query(default=None),
) -> dict[str, object]:
    grade_filter = [Document.grade.in_([grade, 'Tất cả'])] if grade and grade != 'Tất cả' else []

    totals = {
        'documents': db.scalar(select(func.count(Document.id)).where(*grade_filter)) or 0,
        'library': db.scalar(
            select(func.count(Document.id)).where(Document.section == 'library', *grade_filter)
        ) or 0,
        'exams': db.scalar(
            select(func.count(Document.id)).where(Document.section == 'exams', *grade_filter)
        ) or 0,
        'slides': db.scalar(
            select(func.count(Document.id)).where(Document.section == 'slides', *grade_filter)
        ) or 0,
    }

    by_grade_rows = db.execute(
        select(
            Document.grade.label('grade'),
            func.count(Document.id).label('document_count'),
        )
        .where(*grade_filter)
        .group_by(Document.grade)
        .order_by(Document.grade.asc())
    ).all()

    by_grade = [
        {
            'grade': row.grade,
            'documentCount': int(row.document_count),
        }
        for row in by_grade_rows
        if row.grade and row.grade.strip()
    ]

    return {
        'totals': totals,
        'byGrade': by_grade,
    }
