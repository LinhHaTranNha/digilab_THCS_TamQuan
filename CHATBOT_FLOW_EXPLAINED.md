# Vì sao chatbot trả lời đúng kiểu có doc-id + link PDF?

Chuẩn, câu này hay. Giải thích đúng theo flow hiện tại luôn, không màu mè.

## Vì sao chatbot trả lời “đúng kiểu có doc-id + link PDF”?

Vì nó **không tự nghĩ ra từ đầu**. Nó đi theo 2 tầng:

---

## Tầng 1: Backend tự lọc dữ liệu thật từ DB

Khi hỏi kiểu:

> “sách toán cho khối 9”

`/api/chat` sẽ chạy logic trong `backend/app/api/chat.py`:

1. **Detect intent**: đây là câu tìm tài liệu
   - bắt được keyword như: “toán”, “khối/lớp 9”, “tài liệu/ebook...”

2. **Query bảng documents (PostgreSQL local)**
   - lọc theo `subject = Toán`
   - lọc theo `grade = 9`
   - lọc thêm `section` nếu có (`library/exams/slides`)

3. **Lấy top kết quả** (tối đa 5), rồi dựng thành context dạng text:

```text
[doc-id] title | môn | khối | mục | loại | PDF
```

=> Chỗ này là **dữ liệu thật trong DB**, không phải model bịa.

---

## Tầng 2: Model NVIDIA chỉ “diễn đạt lại”

Sau khi có context ở trên, backend gọi NVIDIA (`chat/completions`) với prompt kiểu:

- đây là câu hỏi user
- đây là danh sách tài liệu phù hợp từ hệ thống
- hãy trả lời ngắn gọn, thân thiện
- nếu không có dữ liệu thì nói không tìm thấy

Model làm nhiệm vụ:

- viết câu cho dễ đọc
- sắp xếp lại list đẹp hơn
- giữ thông tin từ context

Nên output thường có dạng:

- “Bạn có thể tìm thấy...”
- liệt kê tài liệu + link PDF

---

## Cái gì là “đúng thật”, cái gì là “AI văn vẻ”

- **Đúng thật**: doc-id, title, môn, khối, link PDF (đến từ DB)
- **AI văn vẻ**: câu mở đầu/kết thúc, cách trình bày

---

## Khi nào nó sai / ảo?

- Nếu lọc DB lỏng quá → nhét tài liệu hơi lệch ngữ cảnh
- Nếu prompt cho model quá tự do → model “đẹp lời” nhưng có thể diễn giải quá đà
- Nếu timeout NVIDIA → fallback message (“chatbot đang bận…”) 

---

## Muốn “chắc kèo hơn” nữa

Nếu muốn kiểu production cứng:

1. Backend trả luôn `documents[]` dạng JSON cấu trúc
2. Frontend render card trực tiếp
3. Model chỉ trả “phần mở đầu” (hoặc bỏ model luôn với query đơn giản)

=> Lúc đó gần như hết cửa hallucination ở phần tài liệu.

---

## Đề xuất mode production

**Deterministic mode**:

- Search DB là chính
- AI chỉ phụ câu chữ

Cách này ổn định, dễ kiểm soát, ít tốn token hơn.
