from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Donation, User
from app.schemas import DonationCreateRequest, DonationResponse, model_validate_compat


router = APIRouter(prefix='/donations', tags=['donations'])


@router.get('', response_model=list[DonationResponse])
def list_donations(
    _: Annotated[User, Depends(require_roles('school', 'teacher'))],
    db: Annotated[Session, Depends(get_db)],
) -> list[DonationResponse]:
    donations = db.scalars(select(Donation).order_by(Donation.created_at.desc())).all()
    return [model_validate_compat(DonationResponse, donation) for donation in donations]


@router.post('', response_model=DonationResponse, status_code=status.HTTP_201_CREATED)
def create_donation(
    payload: DonationCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DonationResponse:
    donation = Donation(
        id=f'don-{__import__("uuid").uuid4().hex[:12]}',
        full_name=payload.full_name.strip(),
        book_name=payload.book_name.strip(),
        grade=payload.grade,
        condition=payload.condition,
        message=payload.message.strip(),
        submitted_by_id=current_user.id,
        submitted_by_role=current_user.role,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return model_validate_compat(DonationResponse, donation)
