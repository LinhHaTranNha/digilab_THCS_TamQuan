# Backend README

Backend cua du an Digital Library duoc xay dung bang FastAPI, SQLAlchemy, Alembic va PostgreSQL.

## Muc tieu

- Cung cap API cho auth, documents, donations
- Quan ly schema bang Alembic
- Ket noi PostgreSQL that

## Cau truc chinh

```text
backend/
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── app/
│   ├── api/
│   │   ├── auth.py
│   │   ├── documents.py
│   │   └── donations.py
│   ├── config.py
│   ├── db.py
│   ├── dependencies.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── security.py
├── .env.example
├── alembic.ini
└── requirements.txt
```

## Cai dat

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m pip install -r requirements.txt
```

## Bien moi truong

Tao `backend/.env`:

```env
DATABASE_URL=postgresql://username:password@host/database
SECRET_KEY=change-me
```

## Chay migration

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m alembic upgrade head
```

## Tao migration moi

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m alembic revision --autogenerate -m "ten migration"
```

Sau do review file trong `alembic/versions/` truoc khi chay upgrade.

## Chay backend local

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" run_backend.py
```

Lenh tren khoi dong FastAPI local tai `http://127.0.0.1:8001`.

Khi chay tren Render, cung script nay se tu dong bind `0.0.0.0:$PORT` va khong bat `reload`.

## Endpoint hien co

### Auth

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### Documents

- `GET /api/documents`
- `GET /api/documents/subjects`
- `GET /api/documents/{document_id}`
- `POST /api/documents`
- `PUT /api/documents/{document_id}`
- `DELETE /api/documents/{document_id}`

### Donations

- `GET /api/donations`
- `POST /api/donations`

### Chatbot (NVIDIA + tìm tài liệu DB)

- `POST /api/chat`
- Yêu cầu phải **đăng nhập** (dùng token hiện tại)
- Lấy bối cảnh tài liệu từ DB (search theo môn/khối/section/keyword) → nếu không có kết quả thì trả thông báo “chưa tìm thấy, đổi từ khóa” (không gọi AI)
- Nếu có kết quả: đính kèm tối đa 5 tài liệu vào context, gọi model NVIDIA để diễn giải

**Env cần thiết** (trong `backend/.env`):
```
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/digilab
SECRET_KEY=change-me
NVIDIA_API_KEY=<key của bạn>
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-8b-instruct
```

**Model mặc định:** `meta/llama-3.1-8b-instruct` (đã giảm max_tokens 300 cho nhanh)
- Nếu muốn đổi model, sửa `NVIDIA_MODEL` trong `.env`
- Timeout gọi API: 60s, nếu lỗi/timeout → backend trả fallback “Chatbot đang bận…”
- Fallback frontend: nếu backend trả lỗi/timeout sẽ hiện “Hiện chatbot đang bận. Bạn thử lại sau nhé.”

**Luồng xử lý `/api/chat`:**
1) Kiểm tra intent tìm tài liệu (keyword môn/khối/tài liệu/de thi/slide/...)
2) Query DB `documents` → lấy tối đa 5 kết quả phù hợp
3) Nếu không có kết quả và intent tìm tài liệu → trả thông báo “chưa tìm thấy, gợi ý đổi từ khóa” (không gọi AI)
4) Nếu có kết quả → gửi context tài liệu + câu hỏi sang NVIDIA → trả lời

**Frontend widget:**
- Nút “💬 Chatbot” góc dưới phải (sau khi login)
- Auto scroll về cuối sau mỗi tin nhắn
- Link PDF được linkify, xuống dòng đầy đủ
- Nếu backend fallback (model lỗi/chậm) sẽ hiển thị thông báo rõ ràng

## Nghiep vu chinh

- `school`: quan ly tat ca tai lieu
- `teacher`: quan ly tai lieu do minh tao
- `student`: khong duoc tao tai lieu
- Tat ca tai khoan da dang nhap deu co the gui donation
- Giao vien duoc dang ebook trong thu vien

## Thu tu sua backend an toan

1. Sua model trong `app/models.py`
2. Sua schema trong `app/schemas.py`
3. Sua route trong `app/api/`
4. Tao migration moi neu doi schema
5. Chay `upgrade head`
6. Test bang `Invoke-RestMethod` hoac Postman

## Lenh test nhanh

### Health

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8001/health"
```

### Login

```powershell
$body = @{ identifier = 'school@tamquan.edu.vn'; password = '123456' } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/auth/login" -Method Post -ContentType "application/json" -Body $body
```

### Documents

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/documents?section=library"
```

## Seed data

Migration dau tien tao san 3 tai khoan demo va mot so tai lieu mau.

- `school@tamquan.edu.vn / 123456`
- `teacher@tamquan.edu.vn / 123456`
- `student@tamquan.edu.vn / 123456`

## Ghi chu ban giao

- `app/security.py` hien dung token custom, chua phai JWT chuan
- `documents` va `donations` hien chua co upload file that
- Neu editor bao khong resolve duoc `fastapi` hoac `sqlalchemy`, can chon dung Python interpreter da cai dependencies