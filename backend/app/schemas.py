from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


def to_camel(value: str) -> str:
    parts = value.split('_')
    return parts[0] + ''.join(part.capitalize() for part in parts[1:])


class ApiSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)


class UserResponse(ApiSchema):
    id: str
    full_name: str
    email: str
    student_id: str
    role: str
    grade: str
    created_at: datetime


class AuthLoginRequest(ApiSchema):
    identifier: str
    password: str


class AuthRegisterRequest(ApiSchema):
    full_name: str
    student_id: str
    grade: str
    email: EmailStr
    password: str = Field(min_length=6)


class AuthResponse(ApiSchema):
    access_token: str
    user: UserResponse


class DocumentResponse(ApiSchema):
    id: str
    title: str
    description: str
    author: str
    subject: str
    grade: str
    section: str
    resource_type: str
    image: str
    pdf_url: str
    owner_role: str
    created_by_id: str
    created_by_name: str
    created_at: datetime
    updated_at: datetime


class DocumentCreateRequest(ApiSchema):
    title: str
    description: str
    author: str
    subject: str
    grade: str
    section: str
    resource_type: str
    image: str
    pdf_url: str


class DocumentUpdateRequest(DocumentCreateRequest):
    pass


class DonationCreateRequest(ApiSchema):
    full_name: str
    book_name: str
    grade: str
    condition: str
    message: str = ''


class DonationResponse(ApiSchema):
    id: str
    full_name: str
    book_name: str
    grade: str
    condition: str
    message: str
    submitted_by_id: str
    submitted_by_role: str
    created_at: datetime
