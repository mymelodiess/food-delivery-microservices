import httpx
import shutil
import os
import uuid
from fastapi import FastAPI, Depends, HTTPException, Request, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
from typing import List, Optional
from pydantic import BaseModel  # <--- ĐÃ THÊM DÒNG NÀY (QUAN TRỌNG)

Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CẤU HÌNH THƯ MỤC ẢNH ---
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def verify_user(request: Request):
    token = request.headers.get("Authorization")
    if not token: raise HTTPException(401, "Missing Token")
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get("http://user_service:8001/verify", headers={"Authorization": token})
            if res.status_code != 200: raise HTTPException(401, "Invalid Token")
            return res.json()
    except Exception as e: raise HTTPException(401, str(e))

# --- API TẠO MÓN (UPLOAD ẢNH) ---
@app.post("/foods")
async def create_food(
    request: Request,
    name: str = Form(...),
    price: float = Form(...),
    discount: int = Form(0),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    user = await verify_user(request)
    if user['role'] != 'seller': raise HTTPException(403, "Only Seller")
    
    image_url = None
    if image:
        file_extension = image.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"static/{file_name}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/static/{file_name}"

    new_food = models.Food(
        name=name, 
        price=price, 
        branch_id=user.get('branch_id'), 
        discount=discount,
        image_url=image_url
    )
    db.add(new_food)
    db.commit()
    db.refresh(new_food)
    return new_food

# --- API TÌM KIẾM ---
@app.get("/foods/search")
def search_foods(q: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Food)
    if q: query = query.filter(models.Food.name.contains(q))
    all_foods = query.all()
    
    grouped = {}
    for f in all_foods:
        final_price = f.price * (1 - f.discount / 100)
        
        ratings = [r.score for r in f.reviews]
        if ratings:
            avg_rating = round(sum(ratings) / len(ratings), 1)
            review_count = len(ratings)
        else:
            avg_rating = 0
            review_count = 0

        if f.name not in grouped: 
            grouped[f.name] = {
                "name": f.name, 
                "min_price": final_price, 
                "max_price": final_price, 
                "branch_count": 1,
                "avg_rating": avg_rating,
                "review_count": review_count,
                "image_url": f.image_url
            }
        else:
            if final_price < grouped[f.name]["min_price"]: grouped[f.name]["min_price"] = final_price
            if final_price > grouped[f.name]["max_price"]: grouped[f.name]["max_price"] = final_price
            grouped[f.name]["branch_count"] += 1
            if review_count > grouped[f.name]["review_count"]:
                 grouped[f.name]["avg_rating"] = avg_rating
                 grouped[f.name]["review_count"] = review_count
                 if f.image_url: grouped[f.name]["image_url"] = f.image_url

    return list(grouped.values())

@app.get("/foods/options")
def get_food_options(name: str, db: Session = Depends(get_db)):
    foods = db.query(models.Food).filter(models.Food.name == name).all()
    results = []
    for f in foods:
        branch = db.query(models.Branch).filter(models.Branch.id == f.branch_id).first()
        final_price = f.price * (1 - f.discount / 100)
        results.append({
            "food_id": f.id, 
            "branch_id": f.branch_id, 
            "branch_name": branch.name if branch else "Unknown", 
            "original_price": f.price, 
            "discount": f.discount, 
            "final_price": final_price,
            "image_url": f.image_url
        })
    results.sort(key=lambda x: x['final_price'])
    return results

@app.get("/foods/{food_id}")
def get_food_detail(food_id: int, db: Session = Depends(get_db)):
    food = db.query(models.Food).filter(models.Food.id == food_id).first()
    if not food: raise HTTPException(status_code=404, detail="Food not found")
    return food

# --- CÁC API KHÁC ---
@app.post("/coupons")
async def create_coupon(coupon: dict, request: Request, db: Session = Depends(get_db)):
    user = await verify_user(request)
    if user['role'] != 'seller': raise HTTPException(403, "Only Seller")
    seller_branch_id = user.get('branch_id')
    if not seller_branch_id: raise HTTPException(400, "No branch")
    new_coupon = models.Coupon(code=coupon['code'].upper(), discount_percent=coupon['discount_percent'], branch_id=seller_branch_id)
    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)
    return new_coupon

@app.get("/coupons/verify")
def verify_coupon(code: str, branch_id: int, db: Session = Depends(get_db)):
    coupon = db.query(models.Coupon).filter(models.Coupon.code == code.upper(), models.Coupon.branch_id == branch_id, models.Coupon.is_active == True).first()
    if not coupon: raise HTTPException(404, "Invalid")
    return {"valid": True, "discount_percent": coupon.discount_percent, "code": coupon.code}

@app.get("/foods") 
def read_foods(branch_id: int = None, db: Session = Depends(get_db)):
    if branch_id: return db.query(models.Food).filter(models.Food.branch_id == branch_id).all()
    return db.query(models.Food).all()

@app.delete("/foods/{food_id}")
async def delete_food(food_id: int, request: Request, db: Session = Depends(get_db)):
    user = await verify_user(request)
    if user.get('seller_mode') != 'owner': raise HTTPException(403, "Only Owner")
    item = db.query(models.Food).filter(models.Food.id == food_id).first()
    if not item: raise HTTPException(404, "Not found")
    db.delete(item)
    db.commit()
    return {"message": "Deleted"}

@app.post("/branches")
def create_branch(branch: dict, db: Session = Depends(get_db)):
    new_b = models.Branch(name=branch['name'], address=branch.get('address'), phone=branch.get('phone'))
    db.add(new_b)
    db.commit()
    db.refresh(new_b)
    return new_b

@app.get("/branches")
def get_branches(db: Session = Depends(get_db)):
    return db.query(models.Branch).all()

@app.get("/branches/{branch_id}")
def get_branch_detail(branch_id: int, db: Session = Depends(get_db)):
    b = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not b: raise HTTPException(404, "Branch not found")
    return b

# --- API REVIEWS (Sửa lại BaseModel) ---
class FoodRatingInput(BaseModel):
    food_id: int
    score: int

class ReviewInput(BaseModel):
    order_id: int
    rating_general: int
    comment: str
    items: List[FoodRatingInput]

@app.post("/reviews")
async def create_review(payload: ReviewInput, request: Request, db: Session = Depends(get_db)):
    user = await verify_user(request)
    async with httpx.AsyncClient() as client:
        check_url = f"http://order_service:8003/orders/{payload.order_id}/check-review"
        try:
            res = await client.get(check_url, params={"user_id": user['id']})
            if res.status_code != 200: raise HTTPException(400, res.json().get("detail", "Error verifying order"))
            data = res.json()
            branch_id = data.get('branch_id')
        except Exception as e: raise HTTPException(500, f"Order Service Error: {str(e)}")

    try:
        new_review = models.OrderReview(user_id=user['id'], user_name=user.get('email'), order_id=payload.order_id, branch_id=branch_id, rating_general=payload.rating_general, comment=payload.comment)
        db.add(new_review)
        db.flush()
        for item in payload.items:
            db.add(models.FoodRating(review_id=new_review.id, food_id=item.food_id, score=item.score))
        db.commit()
        return {"message": "Review added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))