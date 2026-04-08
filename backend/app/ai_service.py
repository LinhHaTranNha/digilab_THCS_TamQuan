import json
import re
from urllib import error, request

from app.config import Settings
from app.models import Document, User
from app.schemas import AiAdvisorDocument


GRADE_PATTERNS = {
    'Khối 6': [r'kh[oố]i\s*6', r'l[ơo]p\s*6', r'\bto[aá]n\s*6\b', r'\bv[aă]n\s*6\b', r'\banh\s*6\b'],
    'Khối 7': [r'kh[oố]i\s*7', r'l[ơo]p\s*7', r'\bto[aá]n\s*7\b', r'\bv[aă]n\s*7\b', r'\banh\s*7\b'],
    'Khối 8': [r'kh[oố]i\s*8', r'l[ơo]p\s*8', r'\bto[aá]n\s*8\b', r'\bv[aă]n\s*8\b', r'\banh\s*8\b'],
    'Khối 9': [r'kh[oố]i\s*9', r'l[ơo]p\s*9', r'\bto[aá]n\s*9\b', r'\bv[aă]n\s*9\b', r'\banh\s*9\b', r'v[aà]o\s*10'],
}

SUBJECT_PATTERNS = {
    'Toán': [r'\bto[aá]n\b'],
    'Văn': [r'ng[ữu]\s*v[aă]n', r'\bv[aă]n\b'],
    'Tiếng Anh': [r'ti[eế]ng\s*anh', r'\banh\b'],
    'Vật lý': [r'v[aậ]t\s*l[yý]'],
    'Hóa học': [r'h[oó]a\s*h[oọ]c'],
    'Sinh học': [r'sinh\s*h[oọ]c'],
    'Lịch sử': [r'l[ịi]ch\s*s[ửu]'],
    'Địa lý': [r'đ[ịi]a\s*l[yý]'],
}

SECTION_PATTERNS = {
    'library': [r'ebook', r's[aá]ch', r't[aà]i\s*li[ệe]u'],
    'exams': [r'đ[ềe]\s*thi', r'đ[ềe]\s*c[ươu]ng', r'[oô]n\s*thi'],
    'slides': [r'slide', r'b[aà]i\s*gi[aả]ng'],
}

RESOURCE_TYPE_PATTERNS = {
    'Ebook': [r'ebook', r's[aá]ch'],
    'Tài liệu': [r't[aà]i\s*li[ệe]u'],
    'Đề thi': [r'đ[ềe]\s*thi'],
    'Đề cương': [r'đ[ềe]\s*c[ươu]ng'],
    'Slide': [r'slide', r'b[aà]i\s*gi[aả]ng'],
}

EXAM_GOAL_PATTERNS = {
    'entrance_10': [r'thi\s*v[aà]o\s*10', r'luy[eệ]n\s*thi\s*v[aà]o\s*10', r'[oô]n\s*thi\s*v[aà]o\s*10'],
    'midterm': [r'gi[ữu]a\s*k[ỳy]', r'ki[eể]m\s*tra\s*gi[ữu]a\s*k[ỳy]'],
    'final': [r'cu[ốo]i\s*k[ỳy]', r'ki[eể]m\s*tra\s*cu[ốo]i\s*k[ỳy]'],
}


_DIACRITIC_MAP = str.maketrans(
    'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ'
    'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
    'AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD',
)


def remove_diacritics(text: str) -> str:
    return text.translate(_DIACRITIC_MAP)


def tokenize_question(question: str) -> list[str]:
    normalized = re.sub(r'[^\w\s]', ' ', question.lower(), flags=re.UNICODE)
    return [token for token in normalized.split() if len(token) >= 2]


def infer_value_from_patterns(question: str, patterns: dict[str, list[str]]) -> str | None:
    normalized = question.lower()
    for value, expressions in patterns.items():
        if any(re.search(expression, normalized, flags=re.UNICODE) for expression in expressions):
            return value
    return None


def infer_grade_from_question(question: str) -> str | None:
    return infer_value_from_patterns(question, GRADE_PATTERNS)


def infer_subject_from_question(question: str) -> str | None:
    subjects = infer_subjects_from_question(question)
    return subjects[0] if subjects else None


def infer_subjects_from_question(question: str) -> list[str]:
    normalized = question.lower()
    detected: list[str] = []
    for subject, expressions in SUBJECT_PATTERNS.items():
        if any(re.search(expression, normalized, flags=re.UNICODE) for expression in expressions):
            detected.append(subject)
    return detected


def infer_section_from_question(question: str) -> str | None:
    return infer_value_from_patterns(question, SECTION_PATTERNS)


def infer_resource_type_from_question(question: str) -> str | None:
    return infer_value_from_patterns(question, RESOURCE_TYPE_PATTERNS)


def infer_exam_goal_from_question(question: str) -> str | None:
    return infer_value_from_patterns(question, EXAM_GOAL_PATTERNS)


def suggest_sections_for_exam_goal(exam_goal: str | None) -> list[str] | None:
    if exam_goal == 'entrance_10':
        return ['exams', 'slides', 'library']
    if exam_goal in {'midterm', 'final'}:
        return ['exams', 'slides']
    return None


def score_document(
    document: Document,
    tokens: list[str],
    *,
    subjects: list[str] | None,
    exam_goal: str | None,
    section: str | None = None,
    suggested_sections: list[str] | None = None,
    resource_type: str | None = None,
    grade: str | None = None,
) -> int:
    score = 0

    if tokens:
        doc_title_plain = remove_diacritics(document.title.lower())
        doc_desc_plain = remove_diacritics(document.description.lower())
        doc_subject_plain = remove_diacritics(document.subject.lower())

        haystack_plain = ' '.join([
            doc_title_plain,
            doc_desc_plain,
            remove_diacritics(document.author.lower()),
            doc_subject_plain,
            remove_diacritics(document.grade.lower()),
            remove_diacritics(document.resource_type.lower()),
        ])

        for token in tokens:
            token_plain = remove_diacritics(token)
            if token_plain in haystack_plain:
                score += 1
            if token_plain in doc_subject_plain:
                score += 2
            if token_plain in doc_title_plain:
                score += 3
            if token_plain in doc_desc_plain:
                score += 1

    # Subject match (explicit filter or inferred)
    if subjects and document.subject in subjects:
        score += 10

    # Grade match bonus (inferred or explicit)
    if grade and grade != 'Tất cả':
        if document.grade == grade:
            score += 5
        elif document.grade == 'Tất cả':
            score += 2

    # Section match bonus
    if section and section != 'Tất cả' and document.section == section:
        score += 4
    elif suggested_sections and document.section in suggested_sections:
        # Partial bonus based on priority order
        idx = suggested_sections.index(document.section)
        score += max(3 - idx, 1)

    # Resource type match bonus
    if resource_type and resource_type != 'Tất cả' and document.resource_type == resource_type:
        score += 4

    if exam_goal == 'entrance_10':
        if document.section == 'exams':
            score += 5
        if document.resource_type in {'Đề thi', 'Đề cương'}:
            score += 6
        if document.grade == 'Khối 9':
            score += 3
    elif exam_goal in {'midterm', 'final'}:
        if document.section == 'exams':
            score += 3
        if document.resource_type in {'Đề thi', 'Đề cương'}:
            score += 3

    return score


def rank_candidate_documents(
    documents: list[Document],
    question: str,
    *,
    subjects: list[str] | None,
    exam_goal: str | None,
    section: str | None = None,
    suggested_sections: list[str] | None = None,
    resource_type: str | None = None,
    grade: str | None = None,
    limit: int,
) -> list[Document]:
    tokens = tokenize_question(question)
    ranked = [
        (
            score_document(
                document,
                tokens,
                subjects=subjects,
                exam_goal=exam_goal,
                section=section,
                suggested_sections=suggested_sections,
                resource_type=resource_type,
                grade=grade,
            ),
            document,
        )
        for document in documents
    ]
    ranked.sort(key=lambda item: (item[0], item[1].created_at), reverse=True)
    return [document for score, document in ranked if score > 0][:limit]


def to_advisor_document(document: Document) -> AiAdvisorDocument:
    return AiAdvisorDocument(
        id=document.id,
        title=document.title,
        description=document.description,
        subject=document.subject,
        grade=document.grade,
        section=document.section,
        resource_type=document.resource_type,
        author=document.author,
        pdf_url=document.pdf_url,
    )


def build_messages(
    *,
    current_user: User,
    question: str,
    documents: list[AiAdvisorDocument],
    grade: str | None,
    subjects: list[str] | None,
    section: str | None,
    resource_type: str | None,
    exam_goal: str | None,
) -> list[dict[str, str]]:
    document_context = '\n\n'.join(
        (
            f"Tai lieu {index}:\n"
            f"- ID: {document.id}\n"
            f"- Tieu de: {document.title}\n"
            f"- Mo ta: {document.description}\n"
            f"- Mon hoc: {document.subject}\n"
            f"- Khoi: {document.grade}\n"
            f"- Khu vuc: {document.section}\n"
            f"- Loai: {document.resource_type}\n"
            f"- Tac gia: {document.author}\n"
            f"- Link PDF: {document.pdf_url}"
        )
        for index, document in enumerate(documents, start=1)
    )

    learner_context = (
        f"Vai tro nguoi dung: {current_user.role}\n"
        f"Khoi mac dinh cua nguoi dung: {current_user.grade}\n"
        f"Bo loc dang ap dung: grade={grade or 'khong co'}, subjects={', '.join(subjects or []) or 'khong co'}, "
        f"section={section or 'khong co'}, resource_type={resource_type or 'khong co'}, exam_goal={exam_goal or 'khong co'}"
    )

    return [
        {
            'role': 'system',
            'content': (
                'Ban la tro ly tu van tai lieu hoc tap cho thu vien so THCS Tam Quan. '
                'Nhiem vu cua ban: (1) Phan tich cau hoi de xac dinh mon hoc, khoi lop, muc tieu hoc tap. '
                '(2) Chon nhung tai lieu PHU HOP NHAT tu danh sach duoc cung cap. '
                '(3) Giai thich ngan gon tai sao chon nhung tai lieu do. '
                'Quy tac bat buoc: '
                '- Chi duoc dua tren tai lieu trong danh sach, KHONG duoc bịa them tai lieu nao. '
                '- Neu tai lieu khong dung mon hoc hoac khoi lop ma nguoi dung yeu cau (vi du nguoi dung hoi lop 5 nhung chi co lop 6), ban phai xac nhan la KHONG CO tai lieu phu hop thay vi goi y tai lieu khac mon/khoi. '
                '- Neu co nhieu mon hoc, chia cau tra loi theo tung mon. '
                '- Phai ket thuc bang mot dong JSON duy nhat theo DUNG dinh dang sau (khong them gi khac sau dong nay): '
                '```json\n{"recommended_ids": ["doc-1", "doc-2"]}\n``` '
                '- recommended_ids la mang chuoi ID cua cac tai lieu ban chon (toi da 5, chi lay nhung tai lieu THUC SU LIEN QUAN). '
                '- Neu khong co tai lieu phu hop, de mang rong: {"recommended_ids": []}. '
                '- Tra loi bang tieng Viet.'
            ),
        },
        {
            'role': 'user',
            'content': (
                f"{learner_context}\n\n"
                f"Cau hoi cua hoc sinh: {question}\n\n"
                f"Danh sach tai lieu ung vien (moi tai lieu co mot ID duy nhat):\n{document_context}\n\n"
                'Hay phan tich cau hoi, xac dinh mon hoc/khoi lop/muc tieu, '
                'chon tai lieu phu hop nhat va giai thich ngan gon. '
                'Ket thuc bang JSON: {"recommended_ids": [...]}'
            ),
        },
    ]


def generate_advisor_answer(
    *,
    settings: Settings,
    current_user: User,
    question: str,
    documents: list[AiAdvisorDocument],
    grade: str | None,
    subjects: list[str] | None,
    section: str | None,
    resource_type: str | None,
    exam_goal: str | None,
) -> str:
    if not settings.nvidia_api_key:
        raise RuntimeError('NVIDIA_API_KEY is missing.')

    messages = build_messages(
        current_user=current_user,
        question=question,
        documents=documents,
        grade=grade,
        subjects=subjects,
        section=section,
        resource_type=resource_type,
        exam_goal=exam_goal,
    )
    payload = {
        'model': settings.nvidia_model,
        'messages': messages,
        'temperature': 0.2,
        'top_p': 0.7,
        'max_tokens': settings.ai_max_response_tokens,
        'stream': False,
    }
    http_request = request.Request(
        url=f"{settings.nvidia_api_base_url.rstrip('/')}/chat/completions",
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {settings.nvidia_api_key}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )

    try:
        with request.urlopen(http_request, timeout=settings.ai_request_timeout_seconds) as response:
            response_payload = json.loads(response.read().decode('utf-8'))
    except error.HTTPError as exc:
        raise RuntimeError(f'NVIDIA AI request failed with status {exc.code}.') from exc
    except error.URLError as exc:
        raise RuntimeError('Unable to reach NVIDIA AI service.') from exc

    choices = response_payload.get('choices') or []
    if not choices:
        raise RuntimeError('NVIDIA AI returned an empty response.')

    content = choices[0].get('message', {}).get('content', '').strip()
    if not content:
        raise RuntimeError('NVIDIA AI returned no answer content.')

    return content


def parse_recommended_ids(answer: str) -> list[str]:
    """Extract recommended document IDs from the LLM JSON tail.

    Supports both valid JSON values and common malformed variants such as:
      {"recommended_ids": [doc-4, doc-2]}
    """
    array_match = re.search(
        r'recommended_ids\s*"?\s*:\s*\[([^\]]*)\]',
        answer,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not array_match:
        return []

    array_text = array_match.group(1)

    # First pass: robust token extraction for IDs like doc-4 or quoted strings.
    token_matches = re.findall(r'[A-Za-z0-9][A-Za-z0-9_-]*', array_text)
    if token_matches:
        return list(dict.fromkeys(token_matches))

    # Second pass: strict JSON parse when model returns well-formed output.
    patterns = [
        r'```(?:json)?\s*(\{[^`]*"recommended_ids"\s*:\s*\[[^\]]*\][^`]*\})\s*```',
        r'(\{"recommended_ids"\s*:\s*\[[^\]]*\]\s*\})',
    ]
    for pattern in patterns:
        match = re.search(pattern, answer, re.DOTALL | re.IGNORECASE)
        if not match:
            continue
        try:
            data = json.loads(match.group(1))
            ids = data.get('recommended_ids', [])
            normalized = [str(i).strip() for i in ids if str(i).strip()]
            if normalized:
                return list(dict.fromkeys(normalized))
        except json.JSONDecodeError:
            continue

    return []


def strip_recommended_ids_json(answer: str) -> str:
    """Remove the trailing JSON recommendation block from user-facing text."""
    patterns = [
        r'\n*```(?:json)?\s*\{[^`]*"recommended_ids"\s*:\s*\[[^\]]*\][^`]*\}\s*```\s*$',
        r'\n*\{\s*"recommended_ids"\s*:\s*\[[^\]]*\]\s*\}\s*$',
    ]
    cleaned = answer
    for pattern in patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(
        r'\n*\s*(k[eế]t\s*th[úu]c\s*b[ằa]ng\s*json\s*:?)\s*$',
        '',
        cleaned,
        flags=re.IGNORECASE,
    )
    return cleaned.strip()


def select_recommended_documents(
    answer: str,
    advisor_documents: list[AiAdvisorDocument],
    fallback_limit: int = 5,
) -> list[AiAdvisorDocument]:
    """Return the documents the LLM explicitly selected, falling back to ranked order."""
    recommended_ids = parse_recommended_ids(answer)
    if recommended_ids:
        doc_map = {doc.id: doc for doc in advisor_documents}
        selected = [doc_map[doc_id] for doc_id in recommended_ids if doc_id in doc_map]
        if selected:
            return selected
    # Fallback: return top documents from the scoring-ranked list.
    return advisor_documents[:fallback_limit]