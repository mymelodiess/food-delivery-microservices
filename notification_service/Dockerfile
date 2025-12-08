# Sử dụng Python 3.9 gọn nhẹ
FROM python:3.9-slim

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# Copy file thư viện vào trước để tận dụng cache của Docker
COPY requirements.txt .

# Cài đặt các thư viện
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code vào
COPY . .

# Lệnh chạy server (Cổng 8006)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8006", "--reload"]