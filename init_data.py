import httpx
import asyncio
import os
from jose import jwt
from datetime import datetime, timedelta

# --- CẤU HÌNH ---
GATEWAY_URL = "http://localhost:8000" 

# 👇 KEY NÀY LẤY TỪ FILE .ENV BẠN GỬI
SECRET_KEY = "thay_doi_chuoi_nay_thanh_mat_ma_bi_mat_nhe" 

ALGORITHM = "HS256"
IMAGE_FOLDER = "demo_images" 

# --- HÀM TẠO TOKEN GIẢ (Bypass Auth) ---
def create_headers(user_id, role="seller", branch_id=None, seller_mode="owner"):
    expire = datetime.utcnow() + timedelta(minutes=10)
    to_encode = {
        "sub": f"admin_seed_{user_id}",
        "id": user_id,
        "role": role,
        "branch_id": branch_id,
        "seller_mode": seller_mode, 
        "exp": expire
    }
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}

async def seed_data():
    print("🚀 ĐANG KHỞI TẠO DỮ LIỆU DEMO (FIXED VALIDATION)...")
    print(f"🎯 Gateway: {GATEWAY_URL}")
    
    # Mật khẩu mạnh để vượt qua Validate (8 ký tự, Hoa, thường, số, đặc biệt)
    STRONG_PASS = "Admin@123" 

    async with httpx.AsyncClient() as client:
        
        # ==========================================
        # 1. TẠO 3 CHI NHÁNH
        # ==========================================
        print("\n🏢 [1] TẠO CHI NHÁNH...")
        branches_data = [
            {"name": "Cơm Tấm Sài Gòn (Q1)", "address": "123 Nguyễn Huệ, Q1", "phone": "0901111111"},
            {"name": "Cơm Tấm Chợ Lớn (Q5)", "address": "456 Trần Hưng Đạo, Q5", "phone": "0902222222"},
            {"name": "Cơm Tấm Làng ĐH (Thủ Đức)", "address": "Khu A ĐHQG", "phone": "0903333333"}
        ]
        
        branch_ids = []

        for b in branches_data:
            try:
                headers = create_headers(1) 
                res = await client.post(f"{GATEWAY_URL}/branches", json=b, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    branch_ids.append(data['id'])
                    print(f"   ✅ Đã tạo: {data['name']} (ID: {data['id']})")
                else:
                    print(f"   ⚠️ Lỗi tạo {b['name']}: {res.text}")
            except Exception as e:
                print(f"   ❌ Lỗi kết nối: {e}")
                return

        if not branch_ids:
            print("🛑 Không tạo được chi nhánh nào. Dừng.")
            return

        # ==========================================
        # 2. TẠO USERS (FIX PHONE & PASSWORD)
        # ==========================================
        print("\n👤 [2] TẠO TÀI KHOẢN (Password: Admin@123)...")
        
        # -> TẠO 2 KHÁCH HÀNG
        buyers = [
            {"email": "khach1@gmail.com", "name": "Nguyễn Văn Khách A", "phone": "0910000001"},
            {"email": "khach2@gmail.com", "name": "Trần Thị Khách B", "phone": "0910000002"}
        ]
        for buyer in buyers:
            payload = {
                "email": buyer["email"], 
                "password": STRONG_PASS, # <--- SỬA THÀNH PASS MẠNH
                "name": buyer["name"],
                "role": "buyer", 
                "phone": buyer["phone"], # <--- ĐÃ SỬA SĐT ĐỦ 10 SỐ
                "address": "TP.HCM"
            }
            try:
                res = await client.post(f"{GATEWAY_URL}/register", json=payload)
                if res.status_code == 200:
                    print(f"   ✅ Buyer: {buyer['email']}")
                else:
                    print(f"   ❌ Lỗi Buyer {buyer['email']}: {res.text}")
            except: pass

        # -> TẠO OWNER & STAFF
        for b_id in branch_ids:
            # 2 Owners
            for i in range(1, 3):
                email = f"owner{i}_cn{b_id}@gmail.com"
                # Tạo số điện thoại đảm bảo đủ 10 số (098 + b_id + 0000 + i)
                valid_phone = f"098{b_id}00000{i}"[-10:] # Lấy 10 số cuối để chắc chắn, thêm prefix 0
                valid_phone = "098" + f"{b_id:01d}" + f"{i:06d}" # Cách đơn giản: 098 + id_nhánh + i (padding 0)
                # Sửa lại cách tạo sđt đơn giản nhất:
                valid_phone = f"098{b_id:02d}000{i:02d}" # Ví dụ branch 1, user 1 -> 0980100001 (10 số)

                await client.post(f"{GATEWAY_URL}/register", json={
                    "email": email, 
                    "password": STRONG_PASS, # <--- SỬA PASS MẠNH
                    "name": f"Chủ {i} - CN {b_id}",
                    "role": "seller", 
                    "seller_mode": "owner", 
                    "phone": valid_phone, 
                    "address": "Tại quán"
                })
                print(f"   👔 Owner: {email} (Pass: {STRONG_PASS})")
            
            # 2 Staffs
            for i in range(1, 3):
                email = f"staff{i}_cn{b_id}@gmail.com"
                valid_phone = f"099{b_id:02d}000{i:02d}" # Ví dụ: 0990100001
                
                await client.post(f"{GATEWAY_URL}/register", json={
                    "email": email, 
                    "password": STRONG_PASS, # <--- SỬA PASS MẠNH
                    "name": f"NV {i} - CN {b_id}",
                    "role": "seller", 
                    "seller_mode": "staff", 
                    "phone": valid_phone, 
                    "address": "Tại quán"
                })
                print(f"   🧢 Staff: {email}")

        # ==========================================
        # 3. TẠO MÓN ĂN
        # ==========================================
        print("\n🍛 [3] TẠO MÓN ĂN...")

        base_foods = [
            {"name": "Cơm Sườn Bì Chả", "base_price": 50000, "img_file": "food1.jpg"},
            {"name": "Bún Bò Huế Đặc Biệt", "base_price": 60000, "img_file": "food2.jpg"},
            {"name": "Phở Bò Tái Nạm", "base_price": 70000, "img_file": "food3.jpg"}
        ]

        for b_id in branch_ids:
            # Token Owner giả lập (Bypass check role)
            headers = create_headers(user_id=999, role="seller", branch_id=b_id, seller_mode="owner")
            
            price_multiplier = 1 + (b_id * 0.1)

            for food in base_foods:
                final_price = int(food["base_price"] * price_multiplier)
                
                data_payload = {
                    "name": food["name"],
                    "price": str(final_price),
                    "discount": "0"
                }

                files_payload = {}
                img_path = os.path.join(IMAGE_FOLDER, food["img_file"])
                file_handle = None 
                
                if os.path.exists(img_path):
                    file_handle = open(img_path, "rb")
                    files_payload = {"image": (food["img_file"], file_handle, "image/jpeg")}
                
                try:
                    res = await client.post(
                        f"{GATEWAY_URL}/foods", 
                        data=data_payload, 
                        files=files_payload if files_payload else None,
                        headers=headers
                    )
                    if res.status_code == 200:
                        print(f"   ✅ CN {b_id}: {food['name']} - {final_price}đ")
                    else:
                        print(f"   ❌ Lỗi món ăn CN {b_id}: {res.text}")
                
                except Exception as e:
                    print(f"   ❌ Lỗi: {e}")
                
                finally:
                    if file_handle: file_handle.close()

        # ==========================================
        # 4. TẠO COUPONS
        # ==========================================
        print("\n🎟️  [4] TẠO MÃ GIẢM GIÁ...")
        
        now = datetime.utcnow()
        
        for b_id in branch_ids:
            headers = create_headers(user_id=999, role="seller", branch_id=b_id, seller_mode="owner")

            active_coupon = {
                "code": f"GIAMNGAY{b_id}", 
                "discount_percent": 15,
                "start_date": (now - timedelta(days=1)).isoformat(),
                "end_date": (now + timedelta(days=30)).isoformat()
            }

            expired_coupon = {
                "code": f"HETHAN{b_id}",
                "discount_percent": 50,
                "start_date": (now - timedelta(days=30)).isoformat(),
                "end_date": (now - timedelta(days=1)).isoformat()
            }

            for c in [active_coupon, expired_coupon]:
                try:
                    res = await client.post(f"{GATEWAY_URL}/coupons", json=c, headers=headers)
                    if res.status_code == 200:
                        print(f"   ✅ CN {b_id}: Mã {c['code']}")
                    else:
                        print(f"   ⚠️ Lỗi mã {c['code']}: {res.text}")
                except: pass

    print("\n------------------------------------------------")
    print("🎉 ĐÃ HOÀN TẤT!")
    print(f"👉 Mật khẩu chung cho tất cả user là: {STRONG_PASS}")
    print("👉 Nhớ cập nhật 'managed_branch_id' trong Database nhé!")
    print("------------------------------------------------")

if __name__ == "__main__":
    asyncio.run(seed_data())