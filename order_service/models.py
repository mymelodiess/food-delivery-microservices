from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    user_name = Column(String(100))
    branch_id = Column(Integer)
    
    total_price = Column(Float)
    status = Column(String(50), default="PENDING") # PENDING_PAYMENT, PAID, SHIPPING, COMPLETED, CANCELLED
    
    customer_name = Column(String(100))
    customer_phone = Column(String(20))
    delivery_address = Column(String(255))
    note = Column(String(255), nullable=True)
    
    coupon_code = Column(String(50), nullable=True)
    discount_amount = Column(Float, default=0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    
    food_id = Column(Integer)
    food_name = Column(String(100))
    # --- THÊM CỘT NÀY ---
    image_url = Column(String(500), nullable=True)
    # --------------------
    price = Column(Float)
    quantity = Column(Integer)

    order = relationship("Order", back_populates="items")