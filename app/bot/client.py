from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings

class BoconicInternalClient:
    def __init__(self, base_url: Optional[str] = None, bot_api_key: Optional[str] = None):
        self.base_url = (base_url or settings.APP_BASE_URL).rstrip("/")
        self.bot_api_key = bot_api_key or settings.BOT_API_KEY

    def _headers(self, telegram_user_id: int) -> Dict[str, str]:
        return {
            "X-Bot-Api-Key": self.bot_api_key,
            "X-Telegram-User-Id": str(telegram_user_id),
            "Content-Type": "application/json",
        }

    async def sync_user(
        self,
        telegram_user_id: int,
        display_name: str,
        telegram_username: Optional[str] = None,
        language_code: str = "vi",
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1/internal/telegram/users/sync"
        payload = {
            "display_name": display_name,
            "telegram_username": telegram_username,
            "language_code": language_code,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=self._headers(telegram_user_id))
            res.raise_for_status()
            return res.json()

    async def search_books(
        self, telegram_user_id: int, query: str, limit: int = 5
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1/internal/telegram/books/search"
        params = {"q": query, "limit": limit}
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, params=params, headers=self._headers(telegram_user_id))
            res.raise_for_status()
            return res.json()

    async def get_my_books(self, telegram_user_id: int) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/api/v1/internal/telegram/my-books"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=self._headers(telegram_user_id))
            res.raise_for_status()
            return res.json()

    async def get_my_loans(self, telegram_user_id: int) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/api/v1/internal/telegram/my-loans"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=self._headers(telegram_user_id))
            res.raise_for_status()
            return res.json()

    async def get_my_lendings(self, telegram_user_id: int) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/api/v1/internal/telegram/my-lendings"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=self._headers(telegram_user_id))
            res.raise_for_status()
            return res.json()

    async def create_borrow_request(
        self, telegram_user_id: int, copy_id: str, duration_days: int = 14
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1/internal/telegram/borrow-requests"
        payload = {"copy_id": copy_id, "duration_days": duration_days}
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=self._headers(telegram_user_id))
            res.raise_for_status()
            return res.json()

    async def confirm_handover(self, telegram_user_id: int, loan_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1/internal/telegram/loans/{loan_id}/confirm-handover"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, headers=self._headers(telegram_user_id))
            res.raise_for_status()
            return res.json()

    async def confirm_return(self, telegram_user_id: int, loan_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1/internal/telegram/loans/{loan_id}/confirm-return"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, headers=self._headers(telegram_user_id))
            res.raise_for_status()
            return res.json()

internal_bot_client = BoconicInternalClient()
