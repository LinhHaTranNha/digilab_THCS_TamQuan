# Chatbot Documentation (Digital Library)

Tài liệu này mô tả phần chatbot đã tích hợp cho dự án `digilab_THCS_TamQuan`: luồng backend, cách gọi NVIDIA model, cách search tài liệu từ DB, và cách trả lời.

---

## 1) Tổng quan kiến trúc

Luồng tổng thể:

1. User đăng nhập trên frontend (token lưu `sessionStorage`)
2. User mở widget **💬 Chatbot** và gửi câu hỏi
3. Frontend gọi `POST /api/chat` kèm Bearer token
4. Backend xác định intent + tìm tài liệu trong PostgreSQL
5. Nếu có context phù hợp → gọi NVIDIA `/chat/completions`
6. Trả lời về frontend để hiển thị trong bubble chat

### Thành phần chính

- Frontend
  - `frontend/src/components/common/ChatWidget.jsx`
  - `frontend/src/services/apiService.js` (`sendChatMessage`)
- Backend
  - `backend/app/api/chat.py`
  - `backend/app/services/llm_nvidia.py`
  - `backend/app/schemas.py` (`ChatRequest`, `ChatResponse`)

---

## 2) API chatbot

### Endpoint

`POST /api/chat`

### Auth

- Bắt buộc đăng nhập (Bearer token)
- Dùng dependency `get_current_user`

### Request body

```json
{
  "message": "Cho em tài liệu Toán lớp 9"
}
```

### Response body

```json
{
  "reply": "...",
  "sources": ["doc-abc123", "doc-def456"]
}
```

- `reply`: nội dung chatbot trả lời
- `sources`: id tài liệu đã dùng làm context (nếu có)

---

## 3) Cách backend quyết định trả lời

File xử lý chính: `backend/app/api/chat.py`

### Bước 1: detect intent

Backend nhận diện câu hỏi có phải intent tìm tài liệu hay không qua các keyword như:
- tài liệu, đề thi, đề cương, slide, ebook
- môn học (Toán, Văn, Anh, Lý, Hóa, Sinh, Sử, Địa, Tin)
- lớp/khối (lớp 6/7/8/9)

### Bước 2: query DB documents

Backend lọc theo:
- môn (`subject`)
- khối (`grade`)
- mục (`section`: `library` / `exams` / `slides`)
- keyword text (khi không có filter cấu trúc)

Lấy tối đa 5 tài liệu làm context.

### Bước 3: nhánh xử lý

- **Intent tìm tài liệu + không có kết quả**
  - Không gọi AI
  - Trả câu hướng dẫn đổi từ khóa/môn/khối

- **Có kết quả**
  - Gọi NVIDIA model để diễn giải câu trả lời tự nhiên, dựa trên context tài liệu

- **Lỗi NVIDIA/timeout**
  - Trả fallback an toàn: “chatbot đang bận/chậm”

---

## 4) NVIDIA integration

File xử lý: `backend/app/services/llm_nvidia.py`

### Endpoint gọi

`POST https://integrate.api.nvidia.com/v1/chat/completions`

### Header

- `Authorization: Bearer <NVIDIA_API_KEY>`
- `Content-Type: application/json`

### Payload chính

- `model`: lấy từ env `NVIDIA_MODEL`
- `messages`: gồm system prompt + user message (kèm context nếu có)
- `temperature`: `0.2`
- `max_tokens`: `300`

### Timeout

- HTTP timeout: `60s`

### Model hiện tại

- `meta/llama-3.1-8b-instruct` (nhẹ hơn bản 122B để giảm timeout)

---

## 5) Environment variables

`backend/.env`:

```env
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/digilab
SECRET_KEY=change-me
NVIDIA_API_KEY=...
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-8b-instruct
```

---

## 6) Frontend behavior

File chính: `frontend/src/components/common/ChatWidget.jsx`

- Widget nổi góc dưới phải
- Yêu cầu đăng nhập mới chat được
- Auto scroll xuống cuối sau mỗi message
- Link trong trả lời được click trực tiếp
- Hiển thị trạng thái “Đang trả lời...” khi chờ API

### URL API theo môi trường

- Dev: `http://127.0.0.1:8001/api`
- Prod: `https://digilab-thcs-tamquan.onrender.com/api`

Đã cấu hình qua:
- `frontend/.env.development`
- `frontend/.env.production`
- `frontend/src/config/api.js`

---

## 7) Data flow ví dụ

User hỏi: **“Cho em tài liệu Toán lớp 9”**

1. Frontend gửi `/api/chat`
2. Backend detect: subject=Toán, grade=9
3. Query `documents` theo filter
4. Lấy top kết quả, tạo context
5. Gọi NVIDIA để viết câu trả lời dễ đọc
6. Trả `reply + sources` về frontend

---

## 8) Giới hạn hiện tại

- Intent detect đang rule-based, chưa có NLU đầy đủ
- Chưa render card tài liệu đẹp trong chat (hiện trả text + link)
- Chưa có memory hội thoại nhiều lượt
- Chưa có caching response

---

## 9) Nâng cấp đề xuất

1. Trả thêm danh sách tài liệu có cấu trúc (`documents[]`) để frontend render card
2. Bỏ gọi AI với query đơn giản (search DB + template reply) để tiết kiệm token
3. Thêm rate-limit + audit log cho endpoint `/api/chat`
4. Thêm unit test cho detect/filter logic
