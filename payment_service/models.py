from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
import datetime

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, index=True)
    amount = Column(Float)
    
    # Mã giao dịch (Ví dụ: PAY_123456)
    transaction_id = Column(String(100), unique=True)
    
    status = Column(String(50), default="SUCCESS")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# --- BẢNG MỚI: SỔ THANH TOÁN ---
class PaymentMethod(Base):
    __tablename__ = "payment_methods"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    
    card_number = Column(String(20)) # Lưu số thẻ
    card_holder = Column(String(100)) # Tên chủ thẻ
    expiry_date = Column(String(10))  # MM/YY
    bank_name = Column(String(50))    # Tên ngân hàng