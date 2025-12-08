from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List, Dict
import uvicorn
from pydantic import BaseModel

app = FastAPI()

# QUẢN LÝ KẾT NỐI
class ConnectionManager:
    def __init__(self):
        # Lưu danh sách socket theo branch_id
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, branch_id: int):
        await websocket.accept()
        if branch_id not in self.active_connections:
            self.active_connections[branch_id] = []
        self.active_connections[branch_id].append(websocket)
        print(f"Branch {branch_id} connected")

    def disconnect(self, websocket: WebSocket, branch_id: int):
        if branch_id in self.active_connections:
            if websocket in self.active_connections[branch_id]:
                self.active_connections[branch_id].remove(websocket)

    async def send_message(self, message: str, branch_id: int):
        if branch_id in self.active_connections:
            for connection in self.active_connections[branch_id]:
                try:
                    await connection.send_text(message)
                except:
                    continue

manager = ConnectionManager()

# 1. API WebSocket cho Frontend kết nối
@app.websocket("/ws/{branch_id}")
async def websocket_endpoint(websocket: WebSocket, branch_id: int):
    await manager.connect(websocket, branch_id)
    try:
        while True:
            await websocket.receive_text() # Giữ kết nối
    except WebSocketDisconnect:
        manager.disconnect(websocket, branch_id)

# 2. API cho Order Service gọi sang
class NotifyPayload(BaseModel):
    branch_id: int
    message: str

@app.post("/notify")
async def notify_branch(payload: NotifyPayload):
    await manager.send_message(payload.message, payload.branch_id)
    return {"status": "sent"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8006)