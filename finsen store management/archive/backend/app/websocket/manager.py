from typing import Any
from fastapi import WebSocket
import json
import asyncio


class WebSocketManager:
    def __init__(self):
        # location_id -> set of websockets
        self._connections: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, location_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            if location_id not in self._connections:
                self._connections[location_id] = set()
            self._connections[location_id].add(websocket)

    async def disconnect(self, location_id: str, websocket: WebSocket):
        async with self._lock:
            if location_id in self._connections:
                self._connections[location_id].discard(websocket)
                if not self._connections[location_id]:
                    del self._connections[location_id]

    async def broadcast_to_location(self, location_id: str, message: dict[str, Any]):
        """Send a message to all clients connected to a specific location."""
        payload = json.dumps(message)
        if location_id in self._connections:
            dead = set()
            for ws in self._connections[location_id].copy():
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                await self.disconnect(location_id, ws)

    async def broadcast_to_all(self, message: dict[str, Any]):
        """Send a message to ALL connected clients (Super Admin use)."""
        payload = json.dumps(message)
        for location_id in list(self._connections.keys()):
            dead = set()
            for ws in self._connections[location_id].copy():
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                await self.disconnect(location_id, ws)

    def get_connection_count(self, location_id: str) -> int:
        return len(self._connections.get(location_id, set()))

    def get_all_connection_counts(self) -> dict[str, int]:
        return {loc_id: len(conns) for loc_id, conns in self._connections.items()}


ws_manager = WebSocketManager()
