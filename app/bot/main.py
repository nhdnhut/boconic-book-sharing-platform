import asyncio
import sys
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from app.bot.handlers import router as bot_router
from app.core.config import settings
from app.core.logging import logger

async def run_bot():
    if not settings.BOT_TOKEN or settings.BOT_TOKEN == "CHANGE_ME":
        logger.warning(
            "===============================================================\n"
            "BOT_TOKEN chưa được cấu hình trong .env!\n"
            "Telegram Bot đang ở chế độ MOCK / OFFLINE DEMO.\n"
            "Backend API và Admin Console vẫn hoạt động bình thường tại http://127.0.0.1:8000/admin\n"
            "Để kết nối Telegram thật, hãy điền BOT_TOKEN nhận từ @BotFather vào .env\n"
            "==============================================================="
        )
        # Keep process alive or exit cleanly in mock mode
        while True:
            await asyncio.sleep(3600)
        return

    logger.info("Khởi động aiogram 3.x long polling cho Telegram Bot...")
    bot = Bot(token=settings.BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(bot_router)

    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()

if __name__ == "__main__":
    try:
        asyncio.run(run_bot())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot process đã dừng an toàn.")
