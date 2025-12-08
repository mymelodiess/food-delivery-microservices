from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(200))
    
    role = Column(String(20), default="buyer") # buyer / seller
    
    # 'owner': Chủ quán (Full quyền), 'staff': Nhân viên
    seller_mode = Column(String(20), nullable=True) 
    
    managed_branch_id = Column(Integer, nullable=True)
    
    phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    
    # Quan hệ sổ địa chỉ
    addresses = relationship("UserAddress", back_populates="user")

class UserAddress(Base):
    __tablename__ = "user_addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    title = Column(String(50)) 
    
    # [MỚI] Thêm cột tên người nhận
    name = Column(String(100))
    
    address = Column(String(255))
    phone = Column(String(20))
    
    user = relationship("User", back_populates="addresses")