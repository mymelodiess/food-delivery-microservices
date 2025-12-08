import httpx
import asyncio
import os
from jose import jwt
from datetime import datetime, timedelta

# --- CẤU HÌNH ---
GATEWAY_URL = "http://localhost:8000" 
# Key này lấy từ file .env bạn gửi
SECRET_KEY = "thay_doi_chuoi_nay_thanh_mat_ma_bi_mat_nhe" 
ALGORITHM = "HS256"
IMAGE_FOLDER = "demo_images" 

def create_headers(user_id, role="seller", branch_id=None, seller_mode="owner"):
    expire = datetime.utcnow() + timedelta(minutes=10)
    to_encode = {
        "sub": f"admin_seed_{user_id}",
        "id": user_id, "role": role, "branch_id": branch_id, "seller_mode": seller_mode, "exp": expire
    }
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}

async def seed_data():
    print("🚀 ĐANG KHỞI TẠO DỮ LIỆU DEMO (AUTO-LINK BRANCH)...")
    
    STRONG_PASS = "Admin@123" 

    async with httpx.AsyncClient() as client:
        # ==========================================
        # 1. TẠO CHI NHÁNH
        # ==========================================
        print("\n🏢 [1] TẠO CHI NHÁNH...")
        branches = [
            {"name": "Cơm Tấm Sài Gòn (Q1)", "address": "123 Nguyễn Huệ, Q1", "phone": "0901111111"},
            {"name": "Cơm Tấm Chợ Lớn (Q5)", "address": "456 Trần Hưng Đạo, Q5", "phone": "0902222222"},
            {"name": "Cơm Tấm Làng ĐH (Thủ Đức)", "address": "Khu A ĐHQG", "phone": "0903333333"}
        ]
        branch_ids = []
        for b in branches:
            try:
                # Tạo bằng user ảo ID=1
                res = await client.post(f"{GATEWAY_URL}/branches", json=b, headers=create_headers(1))
                if res.status_code == 200:
                    data = res.json()
                    branch_ids.append(data['id'])
                    print(f"   ✅ Đã tạo: {data['name']} (ID: {data['id']})")
            except: pass

        if not branch_ids: return print("🛑 Lỗi: Không tạo được chi nhánh.")

        # ==========================================
        # 2. TẠO USER & GÁN BRANCH LUÔN (QUAN TRỌNG)
        # ==========================================
        print("\n👤 [2] TẠO TÀI KHOẢN & GÁN QUYỀN...")
        
        # Khách hàng
        for i in range(1, 3):
            payload = {
                "email": f"khach{i}@gmail.com", "password": STRONG_PASS, "name": f"Khách Hàng {i}",
                "role": "buyer", "phone": f"091000000{i}", "address": "TP.HCM"
            }
            await client.post(f"{GATEWAY_URL}/register", json=payload)
            print(f"   👤 Buyer: khach{i}@gmail.com")

        # Chủ quán & Nhân viên (Vòng lặp quan trọng)
        for b_id in branch_ids:
            # --- OWNER ---
            email_owner = f"owner_cn{b_id}@gmail.com"
            res_owner = await client.post(f"{GATEWAY_URL}/register", json={
                "email": email_owner, "password": STRONG_PASS, "name": f"Chủ CN {b_id}",
                "role": "seller", "seller_mode": "owner", "phone": f"098{b_id:02d}00001", "address": "Tại quán"
            })
            
            # [MỚI] Gán Branch ID ngay lập tức
            if res_owner.status_code == 200:
                owner_id = res_owner.json()['id']
                # Gọi API cập nhật chi nhánh (API này mới thêm ở User Service)
                await client.put(f"{GATEWAY_URL}/users/{owner_id}/branch", params={"branch_id": b_id})
                print(f"   👔 Owner: {email_owner} -> Đã gán Branch {b_id}")

            # --- STAFF ---
            email_staff = f"staff_cn{b_id}@gmail.com"
            res_staff = await client.post(f"{GATEWAY_URL}/register", json={
                "email": email_staff, "password": STRONG_PASS, "name": f"NV CN {b_id}",
                "role": "seller", "seller_mode": "staff", "phone": f"099{b_id:02d}00001", "address": "Tại quán"
            })

            # [MỚI] Gán Branch ID cho Staff luôn
            if res_staff.status_code == 200:
                staff_id = res_staff.json()['id']
                await client.put(f"{GATEWAY_URL}/users/{staff_id}/branch", params={"branch_id": b_id})
                print(f"   🧢 Staff: {email_staff} -> Đã gán Branch {b_id}")

        # ==========================================
        # 3. TẠO MÓN ĂN & COUPON
        # ==========================================
        print("\n🍛 [3] TẠO MÓN ĂN & COUPON...")
        base_foods = [
            {"name": "Cơm Sườn Bì Chả", "price": 50000, "img": "food1.jpg"},
            {"name": "Bún Bò Huế", "price": 60000, "img": "food2.jpg"},
            {"name": "Phở Bò", "price": 70000, "img": "food3.jpg"}
        ]

        now = datetime.utcnow()

        for b_id in branch_ids:
            # Token giả lập Owner của chi nhánh b_id
            headers = create_headers(999, branch_id=b_id, seller_mode="owner")
            
            # Tạo món
            for food in base_foods:
                price = int(food["price"] * (1 + b_id * 0.05)) # Giá khác nhau chút
                data = {"name": food["name"], "price": str(price), "discount": "0"}
                files = {}
                path = os.path.join(IMAGE_FOLDER, food["img"])
                if os.path.exists(path):
                    files = {"image": (food["img"], open(path, "rb"), "image/jpeg")}
                
                try:
                    await client.post(f"{GATEWAY_URL}/foods", data=data, files=files, headers=headers)
                except: pass
                if files: files["image"][1].close()
            
            # Tạo Coupon
            c1 = {"code": f"GIAMNGAY{b_id}", "discount_percent": 15, "start_date": str(now), "end_date": str(now + timedelta(days=30))}
            c2 = {"code": f"HETHAN{b_id}", "discount_percent": 50, "start_date": str(now - timedelta(days=30)), "end_date": str(now - timedelta(days=1))}
            
            for c in [c1, c2]:
                await client.post(f"{GATEWAY_URL}/coupons", json=c, headers=headers)
            
            print(f"   ✅ Xong dữ liệu CN {b_id}")

    print("\n------------------------------------------------")
    print("🎉 HOÀN TẤT! DỮ LIỆU ĐÃ ĐƯỢC LINK TỰ ĐỘNG.")
    print(f"👉 Mật khẩu chung: {STRONG_PASS}")
    print("👉 Bạn có thể đăng nhập ngay mà KHÔNG cần sửa DB thủ công!")
    print("------------------------------------------------")

if __name__ == "__main__":
    asyncio.run(seed_data())