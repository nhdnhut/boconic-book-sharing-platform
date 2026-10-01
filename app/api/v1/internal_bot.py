from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.errors import BoconicException, ErrorCode
from app.core.security import generate_public_alias
from app.db.models.catalog import Book, BookCopy
from app.db.models.identity import User
from app.db.models.lending import BorrowRequest, Loan
from app.db.session import get_db
from app.services.catalog import CatalogService
from app.services.community import CommunityService
from app.services.lending import LendingService
from app.services.moderation import ModerationService

router = APIRouter(prefix="/internal/telegram", tags=["Internal Bot Gateway"])

async def verify_bot_actor(
    x_bot_api_key: str = Header(..., alias="X-Bot-Api-Key"),
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate bot service key and resolve the verified delegated Telegram user."""
    if x_bot_api_key != settings.BOT_API_KEY:
        raise BoconicException(
            code=ErrorCode.UNAUTHORIZED,
            message="Khóa truy cập Bot API không hợp lệ.",
            status_code=401,
        )

    res = await db.execute(select(User).where(User.telegram_user_id == x_telegram_user_id))
    user = res.scalar_one_or_none()
    if not user:
        # Auto-provision user on first verified Telegram message
        user = User(
            telegram_user_id=x_telegram_user_id,
            display_name=f"Telegram User {x_telegram_user_id}",
            public_alias=generate_public_alias(),
            language_code="vi",
            status="active",
        )
        db.add(user)
        await db.commit()

    if user.status in ("banned", "deleted"):
        raise BoconicException(
            code=ErrorCode.FORBIDDEN,
            message="Tài khoản này đã bị khóa hoặc ngừng hoạt động.",
            status_code=403,
        )

    return user

class SyncUserDTO(BaseModel):
    display_name: Optional[str] = None
    telegram_username: Optional[str] = None
    language_code: Optional[str] = "vi"

class AddCopyDTO(BaseModel):
    book_id: str
    condition: str = "good"
    maximum_loan_days: int = 14
    notes: Optional[str] = None

class CreateRequestDTO(BaseModel):
    copy_id: str
    duration_days: int = 14
    note: Optional[str] = None

class ReturnRequestDTO(BaseModel):
    note: Optional[str] = None

class CommunityNeedDTO(BaseModel):
    title_query: str
    grade_level: Optional[int] = None
    subject: Optional[str] = None
    curriculum: Optional[str] = None
    quantity: int = 1
    fulfillment_preference: str = "lend"

@router.post("/users/sync")
async def sync_user_profile(
    dto: SyncUserDTO,
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    if dto.display_name:
        actor.display_name = dto.display_name.strip()
    if dto.telegram_username:
        actor.telegram_username = dto.telegram_username.strip()
    if dto.language_code:
        actor.language_code = dto.language_code
    await db.commit()
    return {
        "id": actor.id,
        "telegram_user_id": actor.telegram_user_id,
        "display_name": actor.display_name,
        "public_alias": actor.public_alias,
        "status": actor.status,
    }

@router.get("/books/search")
async def bot_search_books(
    q: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    grade: Optional[int] = Query(None),
    curriculum: Optional[str] = Query(None),
    limit: int = Query(5, ge=1, le=20),
    offset: int = Query(0, ge=0),
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    books, total = await CatalogService.search_books(
        db, query=q, subject=subject, grade_level=grade, curriculum=curriculum,
        limit=limit, offset=offset
    )

    results = []
    for b in books:
        authors = [a.author.name for a in b.authors]
        available_copies = [
            {
                "copy_id": c.id,
                "public_code": c.public_code,
                "condition": c.condition,
                "max_days": c.maximum_loan_days,
                "is_mine": c.owner_id == actor.id,
            }
            for c in b.copies
            if c.circulation_status == "available"
        ]
        results.append({
            "book_id": b.id,
            "title": b.title,
            "authors": authors,
            "publisher": b.publisher,
            "grade_level": b.grade_level,
            "subject": b.subject,
            "curriculum": b.curriculum,
            "isbn13": b.isbn13,
            "available_count": len(available_copies),
            "copies": available_copies,
        })

    return {"items": results, "total": total}

@router.post("/copies")
async def bot_add_copy(
    dto: AddCopyDTO,
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    copy = await CatalogService.add_book_copy(
        db=db,
        book_id=dto.book_id,
        owner_id=actor.id,
        condition=dto.condition,
        maximum_loan_days=dto.maximum_loan_days,
        notes=dto.notes,
    )
    await db.commit()
    return {
        "id": copy.id,
        "public_code": copy.public_code,
        "condition": copy.condition,
        "status": copy.circulation_status,
        "message": f"Bản sách '{copy.public_code}' đã được đăng thành công!",
    }

@router.post("/borrow-requests")
async def bot_create_borrow_request(
    dto: CreateRequestDTO,
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    req = await LendingService.create_borrow_request(
        db=db,
        copy_id=dto.copy_id,
        borrower_id=actor.id,
        duration_days=dto.duration_days,
        note=dto.note,
    )
    await db.commit()
    return {
        "request_id": req.id,
        "status": req.status,
        "message": "Yêu cầu mượn sách đã được gửi tới chủ sở hữu!",
    }

@router.post("/borrow-requests/{request_id}/accept")
async def bot_accept_borrow_request(
    request_id: str,
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    loan = await LendingService.accept_borrow_request(db, request_id, actor.id)
    await db.commit()
    return {
        "loan_id": loan.id,
        "status": loan.status,
        "reservation_expires_at": loan.reservation_expires_at,
        "message": "Bạn đã chấp nhận yêu cầu và giữ chỗ sách cho người mượn.",
    }

@router.post("/loans/{loan_id}/confirm-handover")
async def bot_confirm_handover(
    loan_id: str,
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    loan, is_active = await LendingService.confirm_handover(db, loan_id, actor.id)
    await db.commit()
    return {
        "loan_id": loan.id,
        "status": loan.status,
        "is_active": is_active,
        "due_at": loan.due_at,
        "message": "Sách đã chính thức bắt đầu lượt mượn!" if is_active else "Đã ghi nhận xác nhận giao nhận từ bạn. Đang chờ đối phương xác nhận.",
    }

@router.post("/loans/{loan_id}/request-return")
async def bot_request_return(
    loan_id: str,
    dto: ReturnRequestDTO,
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    loan = await LendingService.request_return(db, loan_id, actor.id, dto.note)
    await db.commit()
    return {
        "loan_id": loan.id,
        "status": loan.status,
        "message": "Đã gửi đề nghị xác nhận trả sách tới đối phương.",
    }

@router.post("/loans/{loan_id}/confirm-return")
async def bot_confirm_return(
    loan_id: str,
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    loan, is_returned = await LendingService.confirm_return(db, loan_id, actor.id)
    await db.commit()
    return {
        "loan_id": loan.id,
        "status": loan.status,
        "is_returned": is_returned,
        "message": "Lượt mượn đã hoàn tất thành công! Bản sách đã được đưa lại kho khả dụng." if is_returned else "Đã ghi nhận xác nhận trả từ bạn. Đang chờ đối phương xác nhận.",
    }

@router.get("/my-books")
async def bot_my_books(
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(BookCopy)
        .where(BookCopy.owner_id == actor.id)
        .options(selectinload(BookCopy.book))
        .order_by(BookCopy.created_at.desc())
    )
    res = await db.execute(stmt)
    copies = res.scalars().all()
    return [
        {
            "copy_id": c.id,
            "public_code": c.public_code,
            "book_title": c.book.title if c.book else "Sách",
            "condition": c.condition,
            "status": c.circulation_status,
            "is_lent": c.circulation_status == "loaned",
        }
        for c in copies
    ]

@router.get("/my-loans")
async def bot_my_loans(
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Loan)
        .where(
            Loan.borrower_id == actor.id,
            Loan.status.in_(["reserved", "active", "return_pending"]),
        )
        .options(
            selectinload(Loan.copy).selectinload(BookCopy.book),
            selectinload(Loan.lender),
        )
        .order_by(Loan.created_at.desc())
    )
    res = await db.execute(stmt)
    loans = res.scalars().all()
    return [
        {
            "loan_id": l.id,
            "status": l.status,
            "book_title": l.copy.book.title if l.copy and l.copy.book else "Sách",
            "public_code": l.copy.public_code if l.copy else "",
            "lender_alias": l.lender.public_alias if l.lender else "Chủ sách",
            "due_at": l.due_at,
            "handed_over_at": l.handed_over_at,
        }
        for l in loans
    ]

@router.get("/my-lendings")
async def bot_my_lendings(
    actor: User = Depends(verify_bot_actor),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Loan)
        .where(
            Loan.lender_id == actor.id,
            Loan.status.in_(["reserved", "active", "return_pending"]),
        )
        .options(
            selectinload(Loan.copy).selectinload(BookCopy.book),
            selectinload(Loan.borrower),
        )
        .order_by(Loan.created_at.desc())
    )
    res = await db.execute(stmt)
    loans = res.scalars().all()
    return [
        {
            "loan_id": l.id,
            "status": l.status,
            "book_title": l.copy.book.title if l.copy and l.copy.book else "Sách",
            "public_code": l.copy.public_code if l.copy else "",
            "borrower_alias": l.borrower.public_alias if l.borrower else "Người mượn",
            "due_at": l.due_at,
            "handed_over_at": l.handed_over_at,
        }
        for l in loans
    ]
