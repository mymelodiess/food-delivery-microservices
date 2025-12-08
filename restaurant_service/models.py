from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    address = Column(String(200))
    phone = Column(String(20))
    
    foods = relationship("Food", back_populates="branch")
    coupons = relationship("Coupon", back_populates="branch")

class Food(Base):
    __tablename__ = "foods"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    price = Column(Float)
    discount = Column(Integer, default=0)
    
    image_url = Column(String(500), nullable=True) 
    
    branch_id = Column(Integer, ForeignKey("branches.id"))
    branch = relationship("Branch", back_populates="foods")
    reviews = relationship("FoodRating", back_populates="food")

class Coupon(Base):
    __tablename__ = "coupons"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), index=True)
    discount_percent = Column(Integer)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    
    # --- THÊM CỘT NGÀY THÁNG ---
    start_date = Column(DateTime, default=datetime.datetime.utcnow)
    end_date = Column(DateTime)
    
    is_active = Column(Boolean, default=True)

    branch = relationship("Branch", back_populates="coupons")
    # Quan hệ với bảng lịch sử dùng
    usages = relationship("CouponUsage", back_populates="coupon")

# --- BẢNG MỚI: LỊCH SỬ DÙNG MÃ ---
class CouponUsage(Base):
    __tablename__ = "coupon_usages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # ID của User bên user_service
    coupon_id = Column(Integer, ForeignKey("coupons.id"))
    used_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    coupon = relationship("Coupon", back_populates="usages")

# --- CÁC BẢNG REVIEW ---
class OrderReview(Base):
    __tablename__ = "order_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    user_name = Column(String(100))
    
    order_id = Column(Integer, unique=True, index=True)
    branch_id = Column(Integer, index=True)
    
    rating_general = Column(Integer)
    comment = Column(String(500))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    details = relationship("FoodRating", back_populates="parent_review", cascade="all, delete-orphan")

class FoodRating(Base):
    __tablename__ = "food_ratings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    review_id = Column(Integer, ForeignKey("order_reviews.id"))
    parent_review = relationship("OrderReview", back_populates="details")
    
    food_id = Column(Integer, ForeignKey("foods.id"))
    score = Column(Integer)
    
    food = relationship("Food", back_populates="reviews")