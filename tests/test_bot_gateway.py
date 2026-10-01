import pytest
from app.core.config import settings
from app.core.errors import BoconicException, ErrorCode
from app.db.models.identity import User
from app.services.catalog import CatalogService
from app.services.community import CommunityService
from app.services.lending import LendingService

@pytest.mark.asyncio
async def test_reject_borrow_request(db_session):
    owner = User(telegram_user_id=888, display_name="Owner", public_alias="User #O888")
    borrower = User(telegram_user_id=999, display_name="Borrower", public_alias="User #B999")
    db_session.add_all([owner, borrower])
    await db_session.flush()

    book = await CatalogService.create_book(
        db=db_session,
        title="Hóa Học 12",
        authors=["Tác Giả Hóa"],
        isbn_raw="9780306406157",
    )
    copy = await CatalogService.add_book_copy(
        db=db_session,
        book_id=book.id,
        owner_id=owner.id,
        condition="good",
    )

    req = await LendingService.create_borrow_request(
        db=db_session,
        copy_id=copy.id,
        borrower_id=borrower.id,
        duration_days=14,
    )
    assert req.status == "pending"

    # Reject request as owner
    rejected_req = await LendingService.reject_borrow_request(
        db=db_session,
        request_id=req.id,
        owner_id=owner.id,
        reason="Không tiện giao sách thời điểm này",
    )
    assert rejected_req.status == "rejected"

@pytest.mark.asyncio
async def test_community_request_creation(db_session):
    user = User(telegram_user_id=777, display_name="Student", public_alias="User #S777")
    db_session.add(user)
    await db_session.flush()

    need = await CommunityService.create_community_request(
        db=db_session,
        user_id=user.id,
        title_query="Sách Ngữ Văn 12",
        grade_level=12,
        subject="Ngữ văn",
    )
    assert need.id is not None
    assert need.status == "open"
    assert need.title_query == "Sách Ngữ Văn 12"
