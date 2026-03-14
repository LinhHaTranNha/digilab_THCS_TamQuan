from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import AuthLoginRequest, AuthRegisterRequest, AuthResponse, UserResponse, model_validate_compat
from app.security import create_access_token, verify_password, hash_password


router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/login', response_model=AuthResponse)
def login(payload: AuthLoginRequest, db: Annotated[Session, Depends(get_db)]) -> AuthResponse:
    identifier = payload.identifier.strip().lower()
    statement = select(User).where(
        or_(User.email == identifier, User.student_id == payload.identifier.strip())
    )
    user = db.scalar(statement)

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Sai thông tin đăng nhập.')

    return AuthResponse(access_token=create_access_token(user.id), user=model_validate_compat(UserResponse, user))


@router.post('/register', response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: AuthRegisterRequest, db: Annotated[Session, Depends(get_db)]) -> AuthResponse:
    normalized_email = payload.email.strip().lower()
    normalized_student_id = payload.student_id.strip()

    duplicated = db.scalar(
        select(User).where(or_(User.email == normalized_email, User.student_id == normalized_student_id))
    )

    if duplicated is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email hoặc mã số đã tồn tại trong hệ thống.')

    user = User(
        id=f'u-{__import__("uuid").uuid4().hex[:12]}',
        full_name=payload.full_name.strip(),
        email=normalized_email,
        student_id=normalized_student_id,
        password_hash=hash_password(payload.password),
        role='student',
        grade=payload.grade,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(access_token=create_access_token(user.id), user=model_validate_compat(UserResponse, user))


@router.get('/me', response_model=UserResponse)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    return model_validate_compat(UserResponse, current_user)
