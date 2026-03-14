# Digital Library

Digital Library la mot MVP thu vien so cho truong hoc, duoc xay dung voi frontend React/Vite/Tailwind va backend FastAPI/PostgreSQL.

## Kien truc hien tai

- Frontend: React 18, Vite, React Router, Tailwind CSS
- Backend: FastAPI, SQLAlchemy 2, Alembic
- Database: PostgreSQL
- Auth: token don gian duoc cap boi backend va luu o `sessionStorage`

## Cau truc thu muc

```text
digital library/
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── dependencies.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── security.py
│   ├── .env.example
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
│   └── package.json
└── README.md
```

## Chuc nang MVP da co

- Dang nhap va dang ky tai khoan hoc sinh
- 3 vai tro: `school`, `teacher`, `student`
- Danh sach tai lieu cho thu vien, de thi va slide
- Loc theo khoi, mon hoc, loai tai lieu va tu khoa
- Trang chi tiet tai lieu, mo PDF va tai xuong
- Form quyên gop cong khai cho tat ca tai khoan da dang nhap
- Khu quan tri cho `school` va `teacher`
- Tao, sua, xoa tai lieu thong qua API va PostgreSQL
- Migration va seed du lieu mau bang Alembic

## Quy tac quyen hien tai

- `school`
  Co the quan ly tat ca tai lieu.
  Co the dang ebook, tai lieu, de thi, de cuong, slide.
  Co the gui donation qua form cong khai.

- `teacher`
  Co the dang tai tai lieu cua minh trong thu vien, slide, de thi va de cuong.
  Co the dang ebook trong thu vien.
  Co the gui donation qua form cong khai.

- `student`
  Co the xem tai lieu, mo PDF, tai xuong PDF.
  Co the dang ky tai khoan.
  Co the gui donation qua form cong khai.
  Khong co quyen vao khu quan tri va khong duoc dang tai tai lieu.

## Du lieu seed mac dinh

Sau khi migrate, he thong co san 3 tai khoan demo:

- `school@tamquan.edu.vn / 123456`
- `teacher@tamquan.edu.vn / 123456`
- `student@tamquan.edu.vn / 123456`

Migration seed nam o `backend/alembic/versions/20260314_0001_initial_schema.py`.

## Bien moi truong

### Backend

Tao file `backend/.env` tu mau `backend/.env.example`:

```env
DATABASE_URL=postgresql://username:password@host/database
SECRET_KEY=change-me
```

Luu y:

- `config.py` tu dong chuyen `postgresql://` sang `postgresql+psycopg://`
- Neu host la Render Postgres, he thong tu them `sslmode=require`

### Frontend

Frontend da goi backend that qua `frontend/src/services/apiService.js`.

Noi cau hinh URL mac dinh cua backend la `frontend/src/config/api.js`.

Co the tao file `frontend/.env` neu muon doi API URL:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api
```

Neu khong khai bao, frontend mac dinh goi `http://127.0.0.1:8001/api`.

## Cai dat va chay du an

### 1. Cai dat backend

Tu thu muc `backend`:

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m pip install -r requirements.txt
```

Neu ban dung Python khac, thay duong dan tren bang interpreter phu hop.

### 2. Chay migration

Tu thu muc `backend`:

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m alembic upgrade head
```

Lenh nay se:

- Tao bang `users`, `documents`, `donations`
- Tao index can thiet
- Seed du lieu demo ban dau

### 3. Chay backend

Tu thu muc `backend`:

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" run_backend.py
```

Lenh tren la cach ngan gon de chay backend local tren port `8001`.

API health check:

```text
GET http://127.0.0.1:8001/health
```

### 4. Cai dat frontend

Tu thu muc `frontend`:

```powershell
npm install
```

### 5. Chay frontend

Tu thu muc `frontend`:

```powershell
npm run dev
```

Frontend mac dinh chay o:

```text
http://127.0.0.1:5173
```

### 6. Build frontend

```powershell
npm run build
```

## Quy trinh phat trien

Muc nay dung de ban giao cho nguoi tiep theo hoac de giu quy trinh lam viec on dinh khi mo rong du an.

### Quy trinh tao tinh nang moi

1. Keo ma moi nhat ve may va chuyen vao root du an.
2. Kiem tra `backend/.env` va `frontend/.env` da dung chua.
3. Khoi dong backend truoc, sau do khoi dong frontend.
4. Xac nhan `GET http://127.0.0.1:8001/health` tra ve `ok`.
5. Neu tinh nang lien quan database, cap nhat model trong `backend/app/models.py`.
6. Neu co thay doi contract API, cap nhat schema trong `backend/app/schemas.py` va route trong `backend/app/api/`.
7. Neu can doi URL backend, sua `frontend/src/config/api.js` hoac `frontend/.env` truoc.
8. Neu frontend can du lieu moi, cap nhat `frontend/src/services/apiService.js`.
9. Sau do moi cap nhat page, component hoac auth context ben frontend.
10. Chay build frontend va test API co ban truoc khi ban giao.

### Quy trinh sua frontend

1. Chinh sua UI trong `frontend/src/pages`, `frontend/src/components`.
2. Neu can goi API moi, them ham trong `frontend/src/services/apiService.js`.
3. Neu can state dang nhap, sua `frontend/src/store/AuthContext.jsx`.
4. Chay:

```powershell
Set-Location frontend
npm run build
```

5. Neu can test local, chay them:

```powershell
Set-Location frontend
npm run dev
```

### Quy trinh sua backend

1. Chinh model trong `backend/app/models.py` neu thay doi cau truc du lieu.
2. Chinh schema trong `backend/app/schemas.py` neu thay doi request/response.
3. Chinh route trong `backend/app/api/` neu thay doi nghiep vu.
4. Neu lien quan auth/token, sua `backend/app/security.py` va `backend/app/dependencies.py`.
5. Neu them bien moi truong, cap nhat `backend/.env.example`.
6. Khoi dong lai backend va test endpoint bang `Invoke-RestMethod` hoac Postman.

### Quy trinh test co ban truoc khi ban giao

1. Chay migration moi nhat.
2. Chay backend local.
3. Test `GET /health`.
4. Test `POST /api/auth/login` voi tai khoan seed.
5. Test `GET /api/documents?section=library`.
6. Neu co thay doi donation, test `POST /api/donations`.
7. Neu co thay doi quan tri, test `POST/PUT/DELETE /api/documents` voi tai khoan `school` hoac `teacher`.
8. Build frontend thanh cong truoc khi ket thuc.

## Quy trinh migrate database

Muc nay mo ta chi tiet cach cap nhat schema database khi du an thay doi.

### Truong hop 1: Chi can ap dung migration da co

Dung khi du an da co san migration file, va ban chi muon dong bo schema len database.

1. Tao hoac kiem tra file `backend/.env`.
2. Chuyen vao thu muc `backend`.
3. Chay:

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m alembic upgrade head
```

4. Kiem tra log Alembic co thong bao `Running upgrade`.
5. Test lai API de dam bao schema moi hoat dong.

### Truong hop 2: Thay doi model va can tao migration moi

Dung khi ban da sua `backend/app/models.py` va can tao migration moi.

1. Sua model SQLAlchemy trong `backend/app/models.py`.
2. Neu can, sua schema Pydantic trong `backend/app/schemas.py`.
3. Chuyen vao thu muc `backend`.
4. Tao migration moi:

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m alembic revision --autogenerate -m "ten migration"
```

5. Mo file migration trong `backend/alembic/versions/` de review lai SQL sinh ra.
6. Neu can seed du lieu, viet them `op.bulk_insert(...)` trong file migration.
7. Chay migration:

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m alembic upgrade head
```

8. Test lai endpoint lien quan.

### Truong hop 3: Rollback migration

Dung khi migration moi gay loi va ban can quay ve schema truoc do.

1. Chuyen vao thu muc `backend`.
2. Chay rollback 1 buoc:

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m alembic downgrade -1
```

3. Neu can quay ve revision cu the:

```powershell
& "C:/Users/NHA LINH/AppData/Local/Programs/Python/Python312/python.exe" -m alembic downgrade <revision_id>
```

4. Sau rollback, khoi dong lai backend va test lai API.

### Checklist khi migrate tren database that

1. Backup database neu du an dang co du lieu quan trong.
2. Chac chan `DATABASE_URL` dang tro dung DB dich.
3. Review migration truoc khi chay len production.
4. Chay migrate trong thoi diem it nguoi dung neu co doi schema lon.
5. Test ngay sau migration: auth, documents, donations.

## API hien co

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

## Mo ta bang du lieu

### users

- `id`
- `full_name`
- `email`
- `student_id`
- `password_hash`
- `role`
- `grade`
- `created_at`

### documents

- `id`
- `title`
- `description`
- `author`
- `subject`
- `grade`
- `section`
- `resource_type`
- `image`
- `pdf_url`
- `owner_role`
- `created_by_id`
- `created_by_name`
- `created_at`
- `updated_at`

### donations

- `id`
- `full_name`
- `book_name`
- `grade`
- `condition`
- `message`
- `submitted_by_id`
- `submitted_by_role`
- `created_at`

## Tinh trang hien tai

Da hoan thanh:

- FastAPI backend
- PostgreSQL ket noi that
- Alembic migration va seed
- Frontend noi API that
- Build frontend thanh cong
- Test API co ban thanh cong

Chua hoan thanh:

- Upload file PDF/anh that
- JWT chuan va token expiry
- Test tu dong
- README deploy production
- Logging va monitoring

## Huong phat trien tiep theo

1. Them upload file len storage that thay cho link PDF/anh thu cong.
2. Nang cap auth sang JWT co expiry va refresh token.
3. Them README deployment cho Render hoac VPS.
4. Viet test cho auth, documents va donations.
5. Them trang lam bai thi truc tiep neu can exam engine.

## Tai lieu bo sung

- Xem [backend/README.md](backend/README.md) de van hanh va ban giao rieng cho backend.
- Xem [frontend/README.md](frontend/README.md) de van hanh va ban giao rieng cho frontend.
