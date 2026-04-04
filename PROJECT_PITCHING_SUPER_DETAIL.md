# DIGITAL LIBRARY - BÀI GIỚI THIỆU PITCHING CHI TIẾT TOÀN DIỆN

## 1) Tuyên ngôn dự án
Digital Library là một MVP thư viện số hướng tới bối cảnh trường THCS, được thiết kế để kết nối 3 nhóm người dùng trong hệ sinh thái giáo dục nhà trường:
- Nhà trường (school)
- Giáo viên (teacher)
- Học sinh (student)

Mục tiêu của sản phẩm là biến kho tài nguyên học tập rời rạc thành một hệ thống tập trung, dễ tìm, dễ lọc, dễ xem, dễ tải, đồng thời bổ sung cơ chế quyên góp tài liệu và trợ lý AI tư vấn học tập dựa trên dữ liệu có thật trong hệ thống.

Nói ngắn gọn: Đây là một "digital hub" cho tài liệu học tập THCS, có phân quyền rõ ràng, có dashboard quản trị nội dung, có form quyên góp, và có AI advisor được ràng buộc nghiệp vụ để tránh "bịa" tài liệu.

---

## 2) Giá trị cốt lõi mà dự án đang giải quyết
### 2.1. Số hóa tài nguyên học tập
Dự án tập trung hóa tài liệu thư viện, đề thi, đề cương, slide về cùng một nơi duy nhất, thay vì phân tán qua nhiều kênh khác nhau.

### 2.2. Tối ưu tra cứu theo nhu cầu học sinh
Người dùng có thể lọc theo:
- Khối (Khối 6-9, hoặc Tất cả)
- Môn học
- Danh mục (library/exams/slides)
- Loại tài liệu (Ebook/Tài liệu/Đề thi/Đề cương/Slide)
- Từ khóa

### 2.3. Vận hành theo vai trò thực tế trong trường
Hệ thống đã mã hóa rõ quyền của school, teacher, student, tránh tình trạng cấp quyền trộn lẫn.

### 2.4. Tạo kênh tương tác cộng đồng
Donation form cho phép học sinh/giáo viên đóng góp sách-tài liệu, tạo vòng quay chia sẻ tri thức nội bộ.

### 2.5. Tích hợp AI theo hướng an toàn dữ liệu
AI advisor không truy vấn ngẫu nhiên trên internet. Backend shortlist tài liệu từ CSDL, sau đó mới đưa metadata sang mô hình AI để gợi ý.

---

## 3) Kiến trúc tổng thể (đang chạy)
## 3.1. Frontend
- React 18 + Vite
- React Router DOM
- Tailwind CSS
- Axios

Frontend phụ trách:
- Điều hướng route
- Giao diện tra cứu tài liệu
- Đăng nhập/đăng ký
- Khu quản trị (cho school/teacher)
- Form quyên góp
- Chat với trợ lý AI

## 3.2. Backend
- FastAPI
- SQLAlchemy 2.0
- Alembic migration
- PostgreSQL (qua psycopg)

Backend phụ trách:
- Xác thực và phân quyền
- CRUD tài liệu
- Quản lý quyên góp
- API trợ lý AI
- Chuẩn hóa CORS và cấu hình môi trường

## 3.3. Database
Các bảng hiện có:
- users
- documents
- donations

Migration đầu tiên đã:
- Tạo schema đầy đủ
- Tạo index cần thiết
- Seed dữ liệu demo ban đầu

---

## 4) Danh sách tính năng hiện có (xác nhận theo code)
## 4.1. Auth và phiên đăng nhập
- Đăng nhập bằng email hoặc mã số (student_id)
- Đăng ký tài khoản mới (tự động role = student)
- Lấy thông tin người dùng hiện tại (/auth/me)
- Lưu access token trong sessionStorage phía frontend
- Tự động attach Bearer token cho mọi request qua axios interceptor
- Tự động xóa token nếu /auth/me fail

## 4.2. Mô hình vai trò
- school:
  - Quản lý tất cả tài liệu
  - Vào được trang quản trị
  - Xem danh sách donation
- teacher:
  - Quản lý tài liệu do chính mình tạo
  - Vào được trang quản trị
  - Xem danh sách donation
- student:
  - Không được CRUD tài liệu
  - Không vào được trang quản trị
  - Vẫn được quyên góp và sử dụng AI advisor

## 4.3. Quản lý tài liệu
- Liệt kê tài liệu tổng hợp
- Lọc theo section, grade, subject, resourceType, keyword
- Lấy danh sách môn học duy nhất theo section
- Xem chi tiết tài liệu theo id
- Tạo tài liệu mới
- Sửa tài liệu
- Xóa tài liệu

## 4.4. Danh mục nội dung
Hệ thống chia nội dung thành 3 section:
- library
- exams
- slides

Loại tài liệu map theo section:
- library: Ebook, Tài liệu
- exams: Đề thi, Đề cương
- slides: Slide

## 4.5. Trang Home
- Hero section tìm kiếm nhanh
- Thống kê nhanh:
  - Tổng tài liệu
  - Số tài liệu thư viện
  - Số tài liệu đề thi/đề cương
  - Số tài liệu slide
- Các card điều hướng nhanh đến từng module

## 4.6. Trang Library
- Bộ lọc khối
- Bộ lọc môn học
- Tìm keyword client-side
- Hiển thị card tài liệu
- Empty state khi không có kết quả

## 4.7. Trang Exams
- Banner chủ đề đề thi/đề cương
- Lọc theo loại (Tất cả/Đề cương/Đề thi)
- Lọc theo khối
- Lọc theo môn
- Hiển thị card + empty state

## 4.8. Trang Slides
- Banner chủ đề slide
- Lọc theo môn
- Lọc theo khối
- Hiển thị card + empty state

## 4.9. Trang chi tiết tài liệu
- Hiển thị metadata đầy đủ (section/type/subject/grade/author/người đăng)
- Mở PDF tab mới
- Tải PDF qua link
- Nút quay lại danh mục tương ứng

## 4.10. Donation
- Form quyên góp tài liệu/sách
- Tự động điền tên + khối nếu đã đăng nhập
- Bắt buộc đăng nhập mới gửi được form
- Lưu thông tin: fullName, bookName, grade, condition, message

## 4.11. Khu quản trị (Manage)
- Dashboard headline theo vai trò
- Form tạo/sửa tài liệu đầy đủ trường
- Chuyển section thì tự động đổi resourceType hợp lệ
- Danh sách tài liệu trong phạm vi quyền quản lý
- Thao tác:
  - Sửa
  - Xóa
  - Xem chi tiết
- Danh sách donation đã gửi
- Có feedback/error state rõ ràng

## 4.12. Trợ lý AI (Advisor)
- Route bảo vệ: phải đăng nhập
- Có quick prompts để dùng nhanh
- Có bộ lọc bổ sung (grade, subject, section, resourceType)
- Hiển thị lịch sử hỏi-đáp theo message bubbles
- Hiển thị recommended documents ngay trong kết quả
- Có link xem chi tiết và mở PDF từ kết quả gợi ý

Backend AI pipeline hiện tại:
1. Nhận câu hỏi + filter
2. Infer thêm grade/subject/section/resource_type từ text câu hỏi (regex patterns)
3. Áp bộ lọc ưu tiên:
   - filter payload
   - giá trị infer
   - nếu student thì fallback theo grade của user
4. Select candidate documents từ CSDL
5. Score theo token match trong title/subject/description
6. Chọn top ứng viên
7. Gọi NVIDIA Chat Completions API với context tài liệu
8. Nhận câu trả lời tiếng Việt
9. Trả về answer + danh sách tài liệu đề xuất

---

## 5) API surface hiện có
## 5.1. Health
- GET /health

## 5.2. Auth
- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/me

## 5.3. Documents
- GET /api/documents
- GET /api/documents/subjects
- GET /api/documents/{document_id}
- POST /api/documents
- PUT /api/documents/{document_id}
- DELETE /api/documents/{document_id}

## 5.4. Donations
- GET /api/donations (school, teacher)
- POST /api/donations (tất cả user đã đăng nhập)

## 5.5. AI
- POST /api/ai/advisor

---

## 6) Thiết kế dữ liệu và metadata
## 6.1. User
- id, full_name, email, student_id
- password_hash
- role
- grade
- created_at

## 6.2. Document
- id, title, description, author
- subject, grade, section, resource_type
- image, pdf_url
- owner_role
- created_by_id, created_by_name
- created_at, updated_at

## 6.3. Donation
- id, full_name, book_name
- grade, condition, message
- submitted_by_id, submitted_by_role
- created_at

---

## 7) Seed data và khả năng demo ngay
Migration initial đã seed:
- 3 tài khoản demo:
  - school@tamquan.edu.vn / 123456
  - teacher@tamquan.edu.vn / 123456
  - student@tamquan.edu.vn / 123456
- Bộ tài liệu mẫu đã có đầy đủ 3 section
- Ít nhất 1 donation mẫu

Ý nghĩa pitching:
Chỉ cần migrate và run là có ngay một bản demo "có nội dung thật" để trình bày cho nhà trường/đối tác.

---

## 8) Bảo mật và phân quyền (thực tế hiện tại)
## 8.1. Có những gì
- Token-based auth
- HTTP Bearer enforcement cho endpoint cần bảo vệ
- Role check cho route nhạy cảm
- Sở hữu tài liệu theo created_by_id cho teacher
- Password hash PBKDF2-HMAC-SHA256 có secret key

## 8.2. Chưa có/Cần lưu ý
- Token custom (không phải JWT có exp claim)
- Không có refresh token flow
- Không có upload file thật (đang lưu link image/pdf)
- allow_credentials của CORS đang false

---

## 9) Vận hành và deployment readiness
## 9.1. Backend runtime strategy
Script run_backend.py tự động:
- local: 127.0.0.1:8001, reload true
- deploy (có PORT): bind 0.0.0.0, reload false

## 9.2. Env strategy
Backend hỗ trợ:
- DATABASE_URL
- SECRET_KEY
- NVIDIA_* biến cho AI
- CORS config

Frontend hỗ trợ:
- VITE_API_BASE_URL

Mặc định frontend đang trỏ đến endpoint Render sẵn.

## 9.3. Migration governance
- Alembic env đã wired với SQLAlchemy metadata
- compare_type đã bật
- Có quy trình tạo migration autogenerate

---

## 10) Luồng nghiệp vụ đầu-cuối tiêu biểu
## 10.1. Học sinh
1. Đăng ký tài khoản
2. Đăng nhập
3. Vào Library/Exams/Slides để lọc tài liệu
4. Xem chi tiết, mở PDF, tải PDF
5. Gửi quyên góp
6. Hỏi AI để xin lộ trình học

## 10.2. Giáo viên
1. Đăng nhập teacher
2. Vào Manage
3. Đăng tải tài liệu mới theo section
4. Chỉnh sửa/xóa tài liệu của mình
5. Theo dõi donation
6. Trải nghiệm AI như một cố vấn học tập

## 10.3. Nhà trường
1. Đăng nhập school
2. Có quyền full quản trị nội dung
3. Cập nhật kho tài nguyên toàn trường
4. Theo dõi donation toàn hệ thống

---

## 11) Trải nghiệm sản phẩm và UX hiện tại
- Header sticky + menu module rõ ràng
- Card-based browsing tạo cảm giác thư viện số thân thiện
- Form có validation/có thông báo lỗi
- Protected routes cho trang cần xác thực
- ScrollToTop theo route để tránh "giữ cuộn" gây nhiễu
- Giao diện sử dụng Tailwind utility, dễ mở rộng nhanh

---

## 12) Điểm mạnh pitching để trình bày với stakeholder
1. Đã có sẵn MVP đầu-cuối, không phải mockup
2. Có role model sát với thực tế nhà trường
3. Có hệ thống nội dung có cấu trúc và metadata rõ
4. Có dashboard quản trị ngay trong bản đầu
5. Có AI advisor ràng buộc dữ liệu nội bộ, giảm nguy cơ hallucination
6. Có migration + seed data, demo nhanh cho buổi báo cáo
7. Full stack tách backend/frontend rõ ràng, dễ bàn giao nhóm

---

## 13) Giới hạn hiện tại (để pitch minh bạch)
1. Chưa có upload file trực tiếp (đang dùng URL)
2. Token auth chưa theo JWT standard hoàn chỉnh
3. Chưa có test suite tự động (unit/integration/e2e)
4. Chưa có observability (metrics/tracing/log dashboard)
5. Chưa có workflow duyệt nội dung trước khi xuất bản
6. Chưa thấy paginated API, hiện list full trên một số endpoint

---

## 14) Kết luận pitching
Digital Library hiện đang ở trạng thái MVP rất "thực chiến":
- Có kiến trúc rõ
- Có nghiệp vụ đầy đủ cho 3 vai trò
- Có luồng dữ liệu thật qua PostgreSQL
- Có quản trị nội dung
- Có AI trợ lý tied-to-data

Đây không chỉ là một website giới thiệu, mà là một nền tảng vận hành thư viện số cấp trường đã có thể demo, bàn giao, và mở rộng tiếp theo hướng production.

Nếu dùng trong buổi pitching, thông điệp mạnh nhất là:
"Chúng tôi đã có một hệ thống thư viện số hoạt động thật, có role governance, có content operations, có AI support, và sẵn sàng cho giai đoạn nâng cấp lên bản vận hành quy mô lớn."
