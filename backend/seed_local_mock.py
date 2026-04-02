from datetime import datetime
from uuid import uuid4

from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import Document, Donation, User

new_docs = [
    dict(title='Chuyên đề Hình học 9', description='Ôn tập hình học lớp 9, trọng tâm đường tròn.', author='Nguyễn Văn A', subject='Toán', grade='9', section='library', resource_type='Ebook', image='https://placehold.co/200x120', pdf_url='https://example.com/toan9-hinh.pdf', owner_role='teacher'),
    dict(title='Đề thi thử Toán 9 - THCS Tam Quan', description='Đề thi thử lần 1 Toán 9', author='Tổ Toán', subject='Toán', grade='9', section='exams', resource_type='Đề thi', image='https://placehold.co/200x120', pdf_url='https://example.com/dethi-toan9.pdf', owner_role='teacher'),
    dict(title='Chuyên đề Ngữ văn 8 - Văn bản thông dụng', description='Tóm tắt văn bản thông dụng lớp 8', author='Trần Thị B', subject='Văn', grade='8', section='library', resource_type='Tài liệu', image='https://placehold.co/200x120', pdf_url='https://example.com/van8.pdf', owner_role='teacher'),
    dict(title='Slide Tiếng Anh 7 - Unit 5', description='Slide bài giảng Unit 5 lớp 7', author='Cô Hoa', subject='Tiếng Anh', grade='7', section='slides', resource_type='Slide', image='https://placehold.co/200x120', pdf_url='https://example.com/slide-anh7.pdf', owner_role='teacher'),
    dict(title='Đề cương Vật Lý 8', description='Ôn tập lực đẩy Acsimet', author='Tổ Lý', subject='Vật Lý', grade='8', section='exams', resource_type='Đề cương', image='https://placehold.co/200x120', pdf_url='https://example.com/dec-ly8.pdf', owner_role='teacher'),
    dict(title='Ebook Hóa học 9 - Chương trình cơ bản', description='Tổng hợp phương trình phản ứng quan trọng.', author='Tổ Hóa', subject='Hóa Học', grade='9', section='library', resource_type='Ebook', image='https://placehold.co/200x120', pdf_url='https://example.com/hoa9.pdf', owner_role='teacher'),
    dict(title='Bài tập Sinh học 7 - Động vật', description='Ôn tập động vật có xương sống.', author='Nguyễn Thị C', subject='Sinh Học', grade='7', section='library', resource_type='Tài liệu', image='https://placehold.co/200x120', pdf_url='https://example.com/sinh7.pdf', owner_role='teacher'),
    dict(title='Địa lý 9 - Kinh tế Việt Nam', description='Tóm tắt chương Kinh tế Việt Nam.', author='Lê Văn D', subject='Địa Lý', grade='9', section='library', resource_type='Tài liệu', image='https://placehold.co/200x120', pdf_url='https://example.com/dia9.pdf', owner_role='teacher'),
]

new_donations = [
    dict(full_name='Phạm Anh', book_name='Sách Toán 7', grade='7', condition='Tốt', message='Tặng lại cho thư viện'),
    dict(full_name='Lê Minh', book_name='Sách Văn 8', grade='8', condition='Khá', message='Mong các bạn dùng tốt'),
]


def main() -> None:
    db = SessionLocal()
    try:
        users = db.scalars(select(User)).all()
        if not users:
            raise RuntimeError('Không tìm thấy user seed. Hãy chạy alembic upgrade head trước.')

        school = next((u for u in users if u.role == 'school'), users[0])

        doc_count = db.scalar(select(func.count()).select_from(Document)) or 0
        if doc_count < 15:
            for doc in new_docs:
                db.add(
                    Document(
                        id=f'doc-{uuid4().hex[:12]}',
                        created_by_id=school.id,
                        created_by_name=school.full_name,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                        **doc,
                    )
                )

        donation_count = db.scalar(select(func.count()).select_from(Donation)) or 0
        if donation_count < 5:
            for dn in new_donations:
                db.add(
                    Donation(
                        id=f'don-{uuid4().hex[:12]}',
                        created_at=datetime.utcnow(),
                        submitted_by_id=school.id,
                        submitted_by_role=school.role,
                        **dn,
                    )
                )

        db.commit()

        final_doc_count = db.scalar(select(func.count()).select_from(Document)) or 0
        final_donation_count = db.scalar(select(func.count()).select_from(Donation)) or 0
        print(f'seeded_ok documents={final_doc_count} donations={final_donation_count}')
    finally:
        db.close()


if __name__ == '__main__':
    main()
