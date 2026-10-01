"""
User-scoped personal API routes: /me/library, /me/needs, /me/offers, /me/loans, /me/warnings, and batch inventory.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BoconicException, ErrorCode
from app.db.models.catalog import Book, BookCopy
from app.db.models.community import CommunityRequest, SupportOffer
from app.db.models.identity import User
from app.db.models.lending import Loan
from app.db.session import get_db
from app.services.catalog import CatalogService
from app.services.library_service import LibraryService
from app.services.warning_service import WarningService


router = APIRouter(prefix="/me", tags=["Personal Library & User Context"])
inventory_router = APIRouter(prefix="/inventory", tags=["Inventory Operations"])


# DTOs
class BatchPreviewDTO(BaseModel):
    csv_content: str


class BatchConfirmRowDTO(BaseModel):
    title: str
    author: Optional[str] = None
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    barcode: Optional[str] = None
    condition: str = "good"
    quantity: int = 1
    visibility: str = "private"


class BatchConfirmDTO(BaseModel):
    user_id: str
    items: List[BatchConfirmRowDTO]


class AppealWarningDTO(BaseModel):
    user_id: str
    appeal_note: str


class AcknowledgeWarningDTO(BaseModel):
    user_id: str


@router.get("/library")
async def get_my_library(
    user_id: str = Query(..., description="User ID"),
    tab: str = Query("all", description="Tab: all, owned, available, lent, borrowed, wishlist, resources, history"),
    db: AsyncSession = Depends(get_db),
):
    """Fetch user's personal library view."""
    return await LibraryService.get_user_library(db=db, user_id=user_id, tab=tab)


@router.get("/needs")
async def get_my_needs(
    user_id: str = Query(..., description="User ID"),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Fetch all community requests created by the user."""
    stmt = select(CommunityRequest).where(CommunityRequest.user_id == user_id)
    if status:
        stmt = stmt.where(CommunityRequest.status == status)
    stmt = stmt.order_by(CommunityRequest.created_at.desc())
    res = await db.execute(stmt)
    needs = res.scalars().all()

    return [
        {
            "id": n.id,
            "title_query": n.title_query,
            "isbn": n.isbn,
            "scope_type": n.scope_type,
            "quantity": n.quantity,
            "quantity_fulfilled": n.quantity_fulfilled,
            "status": n.status,
            "created_at": n.created_at.isoformat(),
        }
        for n in needs
    ]


@router.get("/offers")
async def get_my_offers(
    user_id: str = Query(..., description="User ID"),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Fetch all support offers submitted by the user."""
    stmt = select(SupportOffer).where(SupportOffer.provider_user_id == user_id)
    if status:
        stmt = stmt.where(SupportOffer.status == status)
    stmt = stmt.order_by(SupportOffer.created_at.desc())
    res = await db.execute(stmt)
    offers = res.scalars().all()

    return [
        {
            "id": o.id,
            "need_id": o.need_id,
            "offer_type": o.offer_type,
            "copy_id": o.copy_id,
            "status": o.status,
            "created_at": o.created_at.isoformat(),
        }
        for o in offers
    ]


@router.get("/loans")
async def get_my_loans(
    user_id: str = Query(..., description="User ID"),
    role: str = Query("all", description="Role: borrower, lender, all"),
    db: AsyncSession = Depends(get_db),
):
    """Fetch user's active and past loans."""
    stmt = select(Loan)
    if role == "borrower":
        stmt = stmt.where(Loan.borrower_id == user_id)
    elif role == "lender":
        stmt = stmt.where(Loan.lender_id == user_id)
    else:
        stmt = stmt.where((Loan.borrower_id == user_id) | (Loan.lender_id == user_id))

    stmt = stmt.order_by(Loan.created_at.desc())
    res = await db.execute(stmt)
    loans = res.scalars().all()

    return [
        {
            "id": l.id,
            "copy_id": l.copy_id,
            "borrower_id": l.borrower_id,
            "lender_id": l.lender_id,
            "status": l.status,
            "due_at": l.due_at.isoformat() if l.due_at else None,
            "handed_over_at": l.handed_over_at.isoformat() if l.handed_over_at else None,
            "returned_at": l.returned_at.isoformat() if l.returned_at else None,
        }
        for l in loans
    ]


@router.get("/warnings")
async def get_my_warnings(
    user_id: str = Query(..., description="User ID"),
    include_expired: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Fetch user's warnings."""
    warnings = await WarningService.get_user_warnings(db=db, user_id=user_id, include_expired=include_expired)
    return [
        {
            "id": w.id,
            "category": w.category,
            "severity": w.severity,
            "message": w.message,
            "reason": w.reason,
            "appeal_status": w.appeal_status,
            "acknowledged_at": w.acknowledged_at.isoformat() if w.acknowledged_at else None,
            "created_at": w.created_at.isoformat(),
        }
        for w in warnings
    ]


@router.post("/warnings/{warning_id}/acknowledge")
async def acknowledge_warning(
    warning_id: str,
    dto: AcknowledgeWarningDTO,
    db: AsyncSession = Depends(get_db),
):
    warning = await WarningService.acknowledge_warning(db=db, warning_id=warning_id, user_id=dto.user_id)
    await db.commit()
    return {"id": warning.id, "acknowledged_at": warning.acknowledged_at.isoformat()}


@router.post("/warnings/{warning_id}/appeal")
async def appeal_warning(
    warning_id: str,
    dto: AppealWarningDTO,
    db: AsyncSession = Depends(get_db),
):
    warning = await WarningService.submit_appeal(
        db=db,
        warning_id=warning_id,
        user_id=dto.user_id,
        appeal_note=dto.appeal_note,
    )
    await db.commit()
    return {"id": warning.id, "appeal_status": warning.appeal_status}


# Batch Inventory Endpoints
@inventory_router.post("/batch-preview")
async def preview_batch_inventory(
    dto: BatchPreviewDTO,
):
    """Preview CSV import items and validate ISBNs/barcodes without committing."""
    return await LibraryService.parse_and_preview_csv(dto.csv_content)


@inventory_router.post("/batch-confirm")
async def confirm_batch_inventory(
    dto: BatchConfirmDTO,
    db: AsyncSession = Depends(get_db),
):
    """
    Commit previewed batch books and physical copies.
    Creates distinct Book metadata records or links to existing ones,
    and creates distinct copies with individual barcodes.
    """
    user = await db.get(User, dto.user_id)
    if not user:
        raise BoconicException(code=ErrorCode.NOT_FOUND, message="Không tìm thấy người dùng.", status_code=404)

    created_books_count = 0
    created_copies_count = 0

    for item in dto.items:
        # Find or create book
        book_res = await db.execute(
            select(Book).where(Book.title.ilike(item.title.strip()))
        )
        book = book_res.scalar_one_or_none()
        if not book:
            book = await CatalogService.create_book(
                db=db,
                title=item.title.strip(),
                authors=[item.author.strip()] if item.author else ["Unknown"],
                publisher=item.publisher.strip() if item.publisher else None,
                isbn_raw=item.isbn.strip() if item.isbn else None,
            )
            created_books_count += 1

        # Create N physical copies
        for idx in range(max(1, item.quantity)):
            barcode = f"{item.barcode}_{idx+1}" if item.barcode and item.quantity > 1 else item.barcode
            await CatalogService.add_book_copy(
                db=db,
                book_id=book.id,
                owner_id=user.id,
                condition=item.condition,
                barcode=barcode,
                visibility=item.visibility,
            )
            created_copies_count += 1

    await db.commit()
    return {
        "status": "success",
        "created_books_count": created_books_count,
        "created_copies_count": created_copies_count,
    }


class UpdateProgressDTO(BaseModel):
    user_id: str
    book_id: str
    reading_state: str
    bookmark_page: Optional[int] = None
    bookmark_note: Optional[str] = None
    personal_notes: Optional[str] = None


@router.get("/progress/{book_id}")
async def get_personal_book_progress(
    book_id: str,
    user_id: str = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get personal chapter study progress and bookmark breakdown."""
    from app.services.chapter_service import ChapterService
    return await ChapterService.get_user_progress(db, user_id=user_id, book_id=book_id)


@router.post("/progress/{chapter_id}")
async def update_personal_chapter_progress(
    chapter_id: str,
    dto: UpdateProgressDTO,
    db: AsyncSession = Depends(get_db),
):
    """
    Update personal study progress on a chapter.
    Does NOT affect Loan status, Need status, or trust score.
    """
    from app.services.chapter_service import ChapterService
    progress = await ChapterService.update_chapter_progress(
        db=db,
        user_id=dto.user_id,
        book_id=dto.book_id,
        chapter_id=chapter_id,
        reading_state=dto.reading_state,
        bookmark_page=dto.bookmark_page,
        bookmark_note=dto.bookmark_note,
        personal_notes=dto.personal_notes,
    )
    await db.commit()
    return {
        "status": "success",
        "chapter_id": progress.chapter_id,
        "reading_state": progress.reading_state,
        "bookmark_page": progress.bookmark_page,
        "version": progress.version,
    }


@router.get("/notes/{book_id}/export")
async def export_personal_notes(
    book_id: str,
    user_id: str = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db),
):
    """Export user's private chapter notes and bookmarks as Markdown."""
    from app.services.chapter_service import ChapterService
    md_content = await ChapterService.export_user_notes(db, user_id=user_id, book_id=book_id)
    return {"book_id": book_id, "markdown": md_content}

