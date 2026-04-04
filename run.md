I. Chạy Backend trước
1. cd "c:\Users\NHA LINH\Documents\MY WORKSPACE\digital library\backend"
2. pip install -r requirements.txt
3. alembic upgrade head (only lần đầu)
4. python run_backend.py
    4.1. Backend chạy tại: http://127.0.0.1:8001
    4.2. API docs: http://127.0.0.1:8001/docs
II. Chạy Frontend sau
1. Mở terminal mở không tắt terminal cũ
2. cd "c:\Users\NHA LINH\Documents\MY WORKSPACE\digital library\frontend"
3. npm install
4. npm run dev