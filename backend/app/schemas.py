from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

try:
    from pydantic import ConfigDict
except ImportError:
    ConfigDict = None


def to_camel(value: str) -> str:
    parts = value.split('_')
    return parts[0] + ''.join(part.capitalize() for part in parts[1:])


class ApiSchema(BaseModel):
    if ConfigDict is not None and hasattr(BaseModel, 'model_validate'):
        model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)
    else:
        class Config:
            orm_mode = True
            allow_population_by_field_name = True
            alias_generator = to_camel


def model_validate_compat(schema_class: type[BaseModel], value: object) -> BaseModel:
    model_validate = getattr(schema_class, 'model_validate', None)
    if callable(model_validate):
        return model_validate(value)
    return schema_class.from_orm(value)


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


class AiAdvisorRequest(ApiSchema):
    question: str = Field(min_length=3, max_length=500)
    grade: str | None = None
    subject: str | None = None
    subjects: list[str] | None = None
    section: str | None = None
    resource_type: str | None = None
    exam_goal: str | None = None


class AiAdvisorDocument(ApiSchema):
    id: str
    title: str
    description: str
    subject: str
    grade: str
    section: str
    resource_type: str
    author: str
    pdf_url: str


class AiAdvisorSubjectPlan(ApiSchema):
    subject: str
    priority: int
    recommendation: str
    documents: list[AiAdvisorDocument]


class AiAdvisorResponse(ApiSchema):
    answer: str
    recommended_documents: list[AiAdvisorDocument]
    applied_grade: str | None = None
    applied_subject: str | None = None
    applied_subjects: list[str] | None = None
    applied_section: str | None = None
    applied_resource_type: str | None = None
    applied_exam_goal: str | None = None
    plan_by_subject: list[AiAdvisorSubjectPlan] = Field(default_factory=list)
