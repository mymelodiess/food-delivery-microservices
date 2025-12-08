import httpx
import os
from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# --- CẤU HÌNH CORS ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- URL SERVICE ---
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user_service:8001")
RESTAURANT_SERVICE_URL = os.getenv("RESTAURANT_SERVICE_URL", "http://restaurant_service:8002")
ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL", "http://order_service:8003")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment_service:8004")
CART_SERVICE_URL = os.getenv("CART_SERVICE_URL", "http://cart_service:8005")

# --- PROXY FUNCTION ---
async def forward_request(service_url: str, path: str, request: Request):
    client = httpx.AsyncClient()
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)
    params = dict(request.query_params)
    body = await request.body()

    try:
        url = f"{service_url}/{path}"
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            params=params,
            content=body
        )
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers)
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Service Unavailable")
    except Exception as e:
        print(f"Gateway Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Gateway Error")

# --- ROUTES ---
@app.get("/")
def read_root(): return {"message": "Welcome to Food Delivery Gateway!"}

# 1. USER
@app.api_route("/register", methods=["POST", "OPTIONS"])
async def register(req: Request): return await forward_request(USER_SERVICE_URL, "register", req)
@app.api_route("/login", methods=["POST", "OPTIONS"])
async def login(req: Request): return await forward_request(USER_SERVICE_URL, "login", req)
@app.api_route("/verify", methods=["GET"])
async def verify(req: Request): return await forward_request(USER_SERVICE_URL, "verify", req)
@app.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def users_path(path: str, req: Request): return await forward_request(USER_SERVICE_URL, f"users/{path}", req)

# 2. RESTAURANT
@app.api_route("/foods", methods=["GET", "POST"])
async def foods_root(req: Request): return await forward_request(RESTAURANT_SERVICE_URL, "foods", req)
@app.api_route("/foods/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def foods_path(path: str, req: Request): return await forward_request(RESTAURANT_SERVICE_URL, f"foods/{path}", req)
@app.api_route("/branches", methods=["GET", "POST"])
async def branches_root(req: Request): return await forward_request(RESTAURANT_SERVICE_URL, "branches", req)
@app.api_route("/branches/{path:path}", methods=["GET", "PUT", "DELETE"])
async def branches_path(path: str, req: Request): return await forward_request(RESTAURANT_SERVICE_URL, f"branches/{path}", req)
@app.api_route("/coupons", methods=["POST"])
async def coupons_root(req: Request): return await forward_request(RESTAURANT_SERVICE_URL, "coupons", req)
@app.api_route("/coupons/{path:path}", methods=["GET", "PUT", "DELETE"])
async def coupons_path(path: str, req: Request): return await forward_request(RESTAURANT_SERVICE_URL, f"coupons/{path}", req)
@app.api_route("/reviews", methods=["POST"])
async def reviews_root(req: Request): return await forward_request(RESTAURANT_SERVICE_URL, "reviews", req)
@app.api_route("/reviews/{path:path}", methods=["GET"])
async def reviews_path(path: str, req: Request): return await forward_request(RESTAURANT_SERVICE_URL, f"reviews/{path}", req)

# --- QUAN TRỌNG: THÊM ROUTE STATIC ĐỂ XEM ẢNH ---
@app.api_route("/static/{path:path}", methods=["GET"])
async def static_files(path: str, req: Request):
    # Chuyển tiếp request xem ảnh sang Restaurant Service
    return await forward_request(RESTAURANT_SERVICE_URL, f"static/{path}", req)
# ------------------------------------------------

# 3. ORDER
@app.api_route("/checkout", methods=["POST"])
async def checkout(req: Request): return await forward_request(ORDER_SERVICE_URL, "checkout", req)
@app.api_route("/orders", methods=["GET"])
async def orders_root(req: Request): return await forward_request(ORDER_SERVICE_URL, "orders", req)
@app.api_route("/orders/{path:path}", methods=["GET", "PUT", "DELETE"])
async def orders_path(path: str, req: Request): return await forward_request(ORDER_SERVICE_URL, f"orders/{path}", req)

# ... (Phần trên giữ nguyên)

# --- 4. PAYMENT SERVICE ---
@app.api_route("/pay", methods=["POST"])
async def pay(req: Request):
    return await forward_request(PAYMENT_SERVICE_URL, "pay", req)

# --- THÊM ROUTE QUẢN LÝ THẺ ---
@app.api_route("/payment-methods", methods=["GET", "POST"])
async def payment_methods_root(req: Request):
    return await forward_request(PAYMENT_SERVICE_URL, "payment-methods", req)

@app.api_route("/payment-methods/{path:path}", methods=["DELETE"])
async def payment_methods_path(path: str, req: Request):
    return await forward_request(PAYMENT_SERVICE_URL, f"payment-methods/{path}", req)
# ------------------------------

# ... (Phần dưới Cart Service giữ nguyên)
@app.api_route("/cart", methods=["GET", "POST", "PUT", "DELETE"])
async def cart_root(req: Request): return await forward_request(CART_SERVICE_URL, "cart", req)