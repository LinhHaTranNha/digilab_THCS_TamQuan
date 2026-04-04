# Digital Library - Thu vien so THCS Tam Quan

Du an nay la mot MVP thu vien so cho truong THCS, gom 3 nhom nguoi dung: nha truong, giao vien, hoc sinh. He thong gom backend FastAPI + PostgreSQL, frontend React, va tro ly AI tu van tai lieu hoc tap dua tren metadata trong CSDL.

README nay duoc tong hop sau khi da doc toan bo code hien co trong du an (backend + frontend + migration + seed data).

## 1) Du an dang lam nhung viec gi?

### 1.1 Bai toan nghiep vu

- Tap trung hoa tai lieu hoc tap vao mot he thong duy nhat.
- Cho phep tim kiem va loc tai lieu theo khoi, mon, loai, tu khoa.
- Quan tri noi dung theo phan quyen vai tro trong truong hoc.
- Ho tro quy trinh quyen gop sach/tai lieu.
- Tich hop tro ly AI de goi y tai lieu hoc tap phu hop.

### 1.2 Cac module dang hoat dong

- Auth module
- Documents module
- Donations module
- AI Advisor module

## 2) Kien truc he thong

```text
Frontend (React + Vite + Tailwind)
    -> HTTP JSON + Bearer token
Backend (FastAPI + SQLAlchemy)
    -> PostgreSQL
    -> NVIDIA Chat Completions API
```

## 3) Cong nghe su dung

### Frontend

- React 18
- React Router DOM
- Axios
- TailwindCSS + PostCSS + Autoprefixer
- Vite 5

### Backend

- FastAPI
- Uvicorn
- SQLAlchemy 2
- Alembic
- psycopg (PostgreSQL)
- email-validator

## 4) Cau truc thu muc

```text
digital library/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS, mount routers
│   │   ├── config.py              # Load env + settings
│   │   ├── db.py                  # SQLAlchemy engine/session
│   │   ├── models.py              # User, Document, Donation
│   │   ├── schemas.py             # Request/response schemas (camelCase)
│   │   ├── security.py            # Password hash + token HMAC
│   │   ├── dependencies.py        # Auth dependencies + role check
│   │   ├── ai_service.py          # Infer/filter/rank/call AI
│   │   └── api/
│   │       ├── auth.py
│   │       ├── documents.py
│   │       ├── donations.py
│   │       └── ai.py
│   ├── alembic/
│   │   └── versions/
│   │       └── 20260314_0001_initial_schema.py
│   ├── run_backend.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── config/api.js
│   │   ├── services/apiService.js
│   │   ├── store/AuthContext.jsx
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   └── .env.example
├── run.md
└── README.md
```

## 5) Chi tiet tung chuc nang

### 5.1 Auth va phan quyen

- Dang nhap: `POST /api/auth/login`
  - Cho dang nhap bang email hoac student_id.
  - Verify password bang PBKDF2-HMAC-SHA256.
- Dang ky: `POST /api/auth/register`
  - Tao user moi role mac dinh `student`.
  - Kiem tra trung email/student_id.
- Lay user hien tai: `GET /api/auth/me`.
- Token:
  - Token custom HMAC (khong phai JWT).
  - Frontend luu trong `sessionStorage`.

Phan quyen:

- `school`: quan ly tat ca tai lieu.
- `teacher`: quan ly tai lieu do minh tao.
- `student`: khong duoc tao/sua/xoa tai lieu.

### 5.2 Documents

- Section:
  - `library`: Ebook, Tai lieu.
  - `exams`: De thi, De cuong.
  - `slides`: Slide.
- API co ho tro loc theo `section`, `grade`, `subject`, `resourceType`, `q`.
- Co trang chi tiet tai lieu (`/documents/:documentId`) de xem metadata, mo PDF, tai xuong.

### 5.3 Donations

- Trang `/donation` cho phep gui quyen gop.
- Phai dang nhap moi submit duoc.
- Luu thong tin: fullName, bookName, grade, condition, message.
- Danh sach donations chi school/teacher moi xem duoc trong API quan tri.

### 5.4 Manage (quan tri)

- Route: `/manage`.
- Duoc bao ve boi `ProtectedRoute` va chi role `school`/`teacher` duoc vao.
- Chuc nang:
  - Tao tai lieu moi.
  - Sua tai lieu.
  - Xoa tai lieu.
  - Xem danh sach tai lieu trong pham vi duoc quan ly.
  - Xem danh sach donation da gui.

### 5.5 AI Advisor

- Route: `/advisor` (yeu cau dang nhap).
- Nhan input: `question` + bo loc tuy chon (`grade`, `subject`, `section`, `resourceType`).
- Xu ly backend:
  - Infer thong tin tu cau hoi bang regex tieng Viet.
  - Ket hop voi bo loc tu payload va fallback grade cua student.
  - Lay candidate documents tu CSDL.
  - Cham diem va xep hang tai lieu.
  - Goi NVIDIA model de tao cau tra loi.
- Output:
  - `answer`
  - `recommendedDocuments`
  - `planBySubject`
  - Cac `applied*` filter de frontend hien thi ngu canh.

## 6) CSDL va du lieu demo

Migration dau tien (`20260314_0001_initial_schema.py`) tao 3 bang:

- `users`
- `documents`
- `donations`

Seed data demo co san:

- 3 tai khoan demo:
  - school@tamquan.edu.vn / 123456
  - teacher@tamquan.edu.vn / 123456
  - student@tamquan.edu.vn / 123456
- 6 tai lieu mau (library/exams/slides)
- 1 donation mau

## 7) API hien co

### Health

- `GET /health`

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

### AI

- `POST /api/ai/advisor`

## 8) Huong dan cai dat va chay (HDSD)

### 8.1 Yeu cau moi truong

- Python 3.11+ (khuyen nghi 3.12)
- Node.js 18+
- PostgreSQL

### 8.2 Chay backend

```powershell
cd "c:\Users\NHA LINH\Documents\MY WORKSPACE\digital library\backend"
```

Tao file `.env` (copy tu `.env.example`):

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>
SECRET_KEY=<your-secret>
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_API_KEY=<your-nvidia-api-key>
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
AI_REQUEST_TIMEOUT_SECONDS=30
AI_MAX_RESPONSE_TOKENS=700
AI_CANDIDATE_LIMIT=10
AI_MAX_QUESTION_LENGTH=500
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
CORS_ORIGIN_REGEX=^https?://(localhost|127\.0\.0\.1)(:\d+)?$
```

Cai dependency va chay migration:

```powershell
pip install -r requirements.txt
alembic upgrade head
```

Khoi dong backend:

```powershell
python run_backend.py
```

Truy cap:

- API: `http://127.0.0.1:8001`
- Swagger: `http://127.0.0.1:8001/docs`

### 8.3 Chay frontend

```powershell
cd "c:\Users\NHA LINH\Documents\MY WORKSPACE\digital library\frontend"
```

Tao file `.env` (neu can):

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api
```

Cai dependency va chay:

```powershell
npm install
npm run dev
```

Frontend mac dinh:

- `http://127.0.0.1:5173`

### 8.4 Trinh tu chay nhanh

1. Chay PostgreSQL.
2. Chay backend (`alembic upgrade head` -> `python run_backend.py`).
3. Chay frontend (`npm run dev`).
4. Mo trinh duyet vao frontend.
5. Dang nhap bang tai khoan demo de thu full flow.

## 9) Huong dan su dung nhanh

1. Vao trang chu de tim nhanh bang tu khoa.
2. Vao Library/Exams/Slides de loc tai lieu.
3. Mo trang chi tiet de xem va tai PDF.
4. Dang nhap bang role phu hop:
   - student: hoc tap + donation + advisor.
   - teacher/school: them route quan tri `/manage`.
5. Thu gui donation tai `/donation`.
6. Thu AI advisor tai `/advisor`.

## 10) Trang thai hien tai va gioi han

- Auth token hien la token custom HMAC, chua co expiry ro rang nhu JWT.
- AI Advisor phu thuoc vao `NVIDIA_API_KEY`; thieu key se loi 503.
- Tai lieu dang dung URL PDF/image ngoai, chua co upload file noi bo.
- Chua thay bo test tu dong duoc commit trong repo.
- Thu muc `docs/` dang trong.

## 11) De xuat buoc tiep theo

- Chuyen auth sang JWT + refresh token.
- Them upload file + luu file tren cloud storage.
- Them test cho cac endpoint chinh (`auth`, `documents`, `ai`).
- Them logging/monitoring/rate-limit cho AI Advisor.
- Bo sung tai lieu ky thuat chi tiet trong `docs/`.
