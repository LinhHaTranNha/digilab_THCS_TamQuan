# Frontend README

Frontend cua du an Digital Library duoc xay dung bang React, Vite, React Router va Tailwind CSS.

## Muc tieu

- Hien thi thu vien so cho hoc sinh, giao vien va nha truong
- Goi API that tu backend FastAPI
- Quan ly dang nhap va quyen truy cap giao dien

## Cau truc chinh

```text
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── cards/
│   │   ├── common/
│   │   └── layout/
│   ├── pages/
│   │   ├── Auth/
│   │   ├── Documents/
│   │   ├── Donation/
│   │   ├── Exam/
│   │   ├── Home/
│   │   ├── Library/
│   │   ├── Manage/
│   │   └── Slides/
│   ├── services/
│   ├── store/
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── tailwind.config.js
```

## Cai dat

```powershell
npm install
```

## Bien moi truong

Frontend da implement API backend that qua `src/services/apiService.js`.

URL backend mac dinh duoc cau hinh tai `src/config/api.js`.

Neu can doi theo moi truong, copy `frontend/.env.example` thanh `frontend/.env` va sua:

```env
VITE_API_BASE_URL=https://digilab-thcs-tamquan.onrender.com/api
```

Neu khong tao file nay, frontend mac dinh goi `https://digilab-thcs-tamquan.onrender.com/api`.

## Chay frontend

```powershell
npm run dev
```

Mac dinh Vite chay tai:

```text
http://127.0.0.1:5173
```

## Build frontend

```powershell
npm run build
```

## Thanh phan quan trong

- `src/config/api.js`
  Noi cau hinh URL mac dinh cua backend va doc `VITE_API_BASE_URL`

- `src/services/apiService.js`
  Chua toan bo ham goi API va xu ly token trong `sessionStorage`

- `src/store/AuthContext.jsx`
  Quan ly user dang dang nhap, login, logout, register

- `src/components/common/ProtectedRoute.jsx`
  Chan route neu chua dang nhap hoac sai vai tro

- `src/pages/Manage/Index.jsx`
  Giao dien quan tri cho `school` va `teacher`

- `src/pages/Documents/Detail.jsx`
  Trang chi tiet tai lieu, mo PDF va tai xuong

## Luong giao dien hien co

1. Trang chu
2. Thong ke nhanh so tai lieu
3. Thu vien voi loc khoi, mon, tu khoa
4. De thi va de cuong voi loc loai, khoi, mon
5. Slides voi loc mon va khoi
6. Donation form cong khai cho user da dang nhap
7. Login, register, logout
8. Quan tri noi dung
9. Widget chatbot o goc duoi ben phai (sau khi dang nhap)

## Chatbot UI

- Component: `src/components/common/ChatWidget.jsx`
- Goi API qua `sendChatMessage()` trong `src/services/apiService.js`
- Tu dong scroll xuong cuoi sau moi message
- Link trong tra loi co the click truc tiep
- Neu chua dang nhap, widget se yeu cau dang nhap truoc khi su dung

## Quy tac quyen o frontend

- `school`
  Thay menu quan tri
  Vao duoc `/manage`
  Gui donation duoc

- `teacher`
  Thay menu quan tri
  Vao duoc `/manage`
  Gui donation duoc

- `student`
  Khong thay menu quan tri
  Khong vao duoc `/manage`
  Gui donation duoc

## Thu tu sua frontend an toan

1. Neu doi URL backend, sua `src/config/api.js` hoac `frontend/.env` truoc.
2. Neu doi nghiep vu API, sua `src/services/apiService.js` truoc.
3. Neu doi auth, sua `src/store/AuthContext.jsx`.
4. Neu doi route, sua `src/App.jsx`.
5. Neu doi UI, sua page/component lien quan.
6. Chay `npm run build` sau moi dot thay doi lon.

## Ghi chu ban giao

- Frontend hien phu thuoc vao backend FastAPI dang chay
- Neu backend khong chay, cac page goi API se khong co du lieu
- Token dang duoc luu trong `sessionStorage`, nen tat trinh duyet se mat session dang nhap