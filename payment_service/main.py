import httpx
from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
from pydantic import BaseModel
from typing import List
import uuid

# Tạo bảng
Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- HÀM MỚI: XÁC THỰC USER (Để biết thẻ của ai) ---
async def verify_user(request: Request):
    token = request.headers.get("Authorization")
    if not token: raise HTTPException(401, "Missing Token")
    try:
        async with httpx.AsyncClient() as client:
            # Gọi User Service để check token
            res = await client.get("http://user_service:8001/verify", headers={"Authorization": token})
            if res.status_code != 200: raise HTTPException(401, "Invalid Token")
            return res.json()
    except Exception as e: raise HTTPException(401, str(e))

# --- INPUT MODEL ---
class PaymentRequest(BaseModel):
    order_id: int
    amount: float

# --- MODEL MỚI CHO THẺ ---
class CardCreate(BaseModel):
    card_number: str
    card_holder: str
    expiry_date: str
    bank_name: str

class CardResponse(CardCreate):
    id: int
    class Config:
        orm_mode = True

# ==========================================
# API THANH TOÁN (GIỮ NGUYÊN NHƯ BẠN GỬI)
# ==========================================
@app.post("/pay")
async def process_payment(payload: PaymentRequest, db: Session = Depends(get_db)):
    # 1. Giả lập thành công
    
    # 2. Tạo mã giao dịch duy nhất
    trans_id = f"PAY_{uuid.uuid4().hex[:8].upper()}"
    
    # 3. Lưu lịch sử thanh toán vào DB Payment
    new_payment = models.Payment(
        order_id=payload.order_id,
        amount=payload.amount,
        transaction_id=trans_id,
        status="SUCCESS"
    )
    db.add(new_payment)
    db.commit()
    
    # 4. GỌI SANG ORDER SERVICE ĐỂ CONFIRM
    order_service_url = f"http://order_service:8003/orders/{payload.order_id}/paid"
    
    async with httpx.AsyncClient() as client:
        try:
            # Gọi API nội bộ của Order Service
            res = await client.put(order_service_url)
            
            if res.status_code != 200:
                raise HTTPException(status_code=500, detail="Thanh toán thành công nhưng lỗi cập nhật đơn hàng")
                
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Lỗi kết nối Order Service: {str(e)}")

    return {
        "message": "Thanh toán thành công",
        "transaction_id": trans_id,
        "order_id": payload.order_id,
        "status": "SUCCESS"
    }

@app.get("/payments")
def get_history(db: Session = Depends(get_db)):
    return db.query(models.Payment).all()

# ==========================================
# API QUẢN LÝ THẺ (MỚI)
# ==========================================
@app.get("/payment-methods", response_model=List[CardResponse])
async def get_my_cards(request: Request, db: Session = Depends(get_db)):
    user = await verify_user(request)
    return db.query(models.PaymentMethod).filter(models.PaymentMethod.user_id == user['id']).all()

@app.post("/payment-methods", response_model=CardResponse)
async def add_card(card: CardCreate, request: Request, db: Session = Depends(get_db)):
    user = await verify_user(request)
    
    new_card = models.PaymentMethod(
        user_id=user['id'],
        card_number=card.card_number,
        card_holder=card.card_holder,
        expiry_date=card.expiry_date,
        bank_name=card.bank_name
    )
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card