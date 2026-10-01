import datetime
import hashlib
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Form, Query, Request, Response, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse, Response as PlainResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import generate_session_token, generate_csrf_token, verify_password
from app.db.models.catalog import Author, Book, BookAuthor, BookCopy, CopyCoverageRange, Chapter, ChapterProposal
from app.db.models.community import (
    AuthorizedCollection,
    CommunityRequest,
    Report,
    RequestMatch,
    SupportOffer,
    UserWarning,
)
from app.db.models.custom_fields import CustomFieldDefinition
from app.db.models.identity import AdminAccount, AdminSession, User
from app.db.models.jobs import AuditLog, BackupJob, ImportJob, OutboxEvent
from app.db.models.lending import Loan
from app.db.session import get_db
from app.services.assembly_service import AssemblyService
from app.services.audit import AuditService
from app.services.backup import BackupService
from app.services.catalog import CatalogService
from app.services.chapter_service import ChapterService
from app.services.coverage_service import CoverageService
from app.services.import_export import ImportExportService
from app.services.need_service import NeedService
from app.services.user_service import UserService
from app.services.warning_service import WarningService

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

router = APIRouter(prefix="/admin", tags=["Admin Web Console"])

async def get_optional_admin(boconic_session: Optional[str], db: AsyncSession) -> Optional[AdminAccount]:
    if not boconic_session:
        return None
    res = await db.execute(select(AdminSession).where(AdminSession.session_token == boconic_session))
    session = res.scalar_one_or_none()
    if session:
        return await db.get(AdminAccount, session.admin_id)
    return None

@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
async def admin_root(boconic_session: Optional[str] = Cookie(None), db: AsyncSession = Depends(get_db)):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)
    return RedirectResponse(url="/admin/dashboard", status_code=303)

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html", {"error": None})

@router.post("/login", response_class=HTMLResponse)
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(AdminAccount).where(AdminAccount.username == username.strip()))
    admin = res.scalar_one_or_none()
    if not admin or not verify_password(password, admin.password_hash):
        return templates.TemplateResponse(
            request, "login.html", {"error": "Tên đăng nhập hoặc mật khẩu không chính xác."}
        )

    session_token = generate_session_token()
    csrf_token = generate_csrf_token()
    import datetime
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)

    session = AdminSession(
        admin_id=admin.id,
        session_token=session_token,
        csrf_token=csrf_token,
        expires_at=expires_at,
    )
    db.add(session)
    await db.commit()

    response = RedirectResponse(url="/admin/dashboard", status_code=303)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        max_age=86400 * 7,
        httponly=True,
        samesite="lax",
    )
    return response

@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    now = datetime.datetime.now(datetime.timezone.utc)
    u_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    b_count = (await db.execute(select(func.count(Book.id)))).scalar_one()
    c_count = (await db.execute(select(func.count(BookCopy.id)))).scalar_one()
    avail_count = (await db.execute(select(func.count(BookCopy.id)).where(BookCopy.circulation_status == "available"))).scalar_one()
    active_loans = (await db.execute(select(func.count(Loan.id)).where(Loan.status == "active"))).scalar_one()
    reserved_loans = (await db.execute(select(func.count(Loan.id)).where(Loan.status == "reserved"))).scalar_one()
    overdue_loans = (await db.execute(select(func.count(Loan.id)).where(Loan.status == "active", Loan.due_at < now))).scalar_one()
    reports_count = (await db.execute(select(func.count(Report.id)).where(Report.status.in_(["open", "reviewing"])))).scalar_one()

    # Recent loans
    recent_loans_res = await db.execute(
        select(Loan)
        .options(
            selectinload(Loan.copy).selectinload(BookCopy.book),
            selectinload(Loan.borrower),
            selectinload(Loan.lender),
        )
        .order_by(desc(Loan.created_at))
        .limit(10)
    )
    recent_loans = recent_loans_res.scalars().all()

    metrics = {
        "users_count": u_count,
        "books_count": b_count,
        "copies_count": c_count,
        "available_copies_count": avail_count,
        "active_loans_count": active_loans,
        "reserved_loans_count": reserved_loans,
        "overdue_loans_count": overdue_loans,
        "unresolved_reports_count": reports_count,
    }

    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "admin": admin,
            "metrics": metrics,
            "recent_loans": recent_loans,
            "active_nav": "dashboard",
        },
    )

@router.get("/books", response_class=HTMLResponse)
async def books_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    books_res = await db.execute(
        select(Book)
        .options(
            selectinload(Book.authors).selectinload(BookAuthor.author),
            selectinload(Book.copies),
        )
        .order_by(desc(Book.created_at))
    )
    books = books_res.scalars().all()

    custom_fields_res = await db.execute(
        select(CustomFieldDefinition)
        .where(CustomFieldDefinition.entity_type == "book", CustomFieldDefinition.active.is_(True))
    )
    custom_fields = custom_fields_res.scalars().all()

    return templates.TemplateResponse(
        request,
        "books.html",
        {
            "admin": admin,
            "books": books,
            "custom_fields": custom_fields,
            "active_nav": "books",
        },
    )

@router.post("/books", response_class=HTMLResponse)
async def admin_create_book_form(
    request: Request,
    title: str = Form(...),
    authors: str = Form(...),
    isbn: Optional[str] = Form(None),
    curriculum: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    grade_level: Optional[int] = Form(None),
    publisher: Optional[str] = Form(None),
    publication_year: Optional[int] = Form(None),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    author_list = [a.strip() for a in authors.split(",") if a.strip()]
    book = await CatalogService.create_book(
        db=db,
        title=title,
        authors=author_list,
        publisher=publisher,
        publication_year=publication_year,
        subject=subject,
        grade_level=grade_level,
        curriculum=curriculum,
        isbn_raw=isbn,
    )
    await AuditService.log_action(
        db,
        action="create_book",
        entity_type="book",
        entity_id=book.id,
        actor_id=admin.id,
    )
    await db.commit()
    return RedirectResponse(url="/admin/books", status_code=303)

@router.get("/copies", response_class=HTMLResponse)
async def copies_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    res = await db.execute(
        select(BookCopy)
        .options(
            selectinload(BookCopy.book),
            selectinload(BookCopy.owner),
            selectinload(BookCopy.current_holder),
        )
        .order_by(desc(BookCopy.created_at))
    )
    copies = res.scalars().all()

    return templates.TemplateResponse(
        request,
        "copies.html",
        {"admin": admin, "copies": copies, "active_nav": "copies"},
    )

@router.get("/loans", response_class=HTMLResponse)
async def loans_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    res = await db.execute(
        select(Loan)
        .options(
            selectinload(Loan.copy).selectinload(BookCopy.book),
            selectinload(Loan.borrower),
            selectinload(Loan.lender),
        )
        .order_by(desc(Loan.created_at))
    )
    loans = res.scalars().all()

    return templates.TemplateResponse(
        request,
        "loans.html",
        {"admin": admin, "loans": loans, "active_nav": "loans"},
    )

@router.get("/custom-fields", response_class=HTMLResponse)
async def custom_fields_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    res = await db.execute(select(CustomFieldDefinition).order_by(CustomFieldDefinition.entity_type, CustomFieldDefinition.key))
    fields = res.scalars().all()

    return templates.TemplateResponse(
        request,
        "custom_fields.html",
        {"admin": admin, "fields": fields, "active_nav": "custom_fields"},
    )

@router.post("/custom-fields", response_class=HTMLResponse)
async def custom_fields_submit(
    entity_type: str = Form(...),
    key: str = Form(...),
    label: str = Form(...),
    field_type: str = Form(...),
    options_raw: Optional[str] = Form(None),
    required: bool = Form(False),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    options = []
    if options_raw:
        for item in options_raw.split(","):
            if ":" in item:
                k, v = item.split(":", 1)
                options.append({"id": k.strip(), "label": v.strip()})

    field_def = CustomFieldDefinition(
        entity_type=entity_type,
        key=key.strip(),
        label=label.strip(),
        field_type=field_type,
        required=required,
        options=options,
    )
    db.add(field_def)
    await db.commit()

    return RedirectResponse(url="/admin/custom-fields", status_code=303)

@router.get("/import", response_class=HTMLResponse)
async def import_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    res = await db.execute(select(ImportJob).order_by(desc(ImportJob.created_at)).limit(10))
    history = res.scalars().all()

    return templates.TemplateResponse(
        request,
        "import_wizard.html",
        {"admin": admin, "import_history": history, "message": None, "active_nav": "import"},
    )

@router.post("/import/upload", response_class=HTMLResponse)
async def import_upload(
    request: Request,
    entity_type: str = Form(...),
    mode: str = Form("upsert"),
    csv_file: UploadFile = File(...),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    content = await csv_file.read()
    headers, rows, delimiter = ImportExportService.parse_csv_content(content)
    file_hash = hashlib.sha256(content).hexdigest()

    # Default mapping heuristic
    mapping = {}
    for h in headers:
        hl = h.lower()
        if "tên" in hl or "title" in hl or "sách" in hl:
            mapping["title"] = h
        elif "tác giả" in hl or "author" in hl:
            mapping["authors"] = h
        elif "isbn" in hl:
            mapping["isbn"] = h
        elif "nxb" in hl or "publisher" in hl:
            mapping["publisher"] = h
        elif "lớp" in hl or "grade" in hl:
            mapping["grade_level"] = h
        elif "môn" in hl or "subject" in hl:
            mapping["subject"] = h
        elif "bộ" in hl or "chương trình" in hl or "curriculum" in hl:
            mapping["curriculum"] = h
        elif "năm" in hl or "year" in hl:
            mapping["publication_year"] = h

    job = ImportJob(
        entity_type=entity_type,
        filename=csv_file.filename or "import.csv",
        file_hash=file_hash,
        mode=mode,
        mapping=mapping,
        status="staged",
        total_rows=len(rows),
        created_by=admin.id,
    )
    db.add(job)
    await db.flush()

    # Execute directly for P0 demo
    await ImportExportService.execute_book_import(db, job.id, rows, mapping, mode=mode)
    await db.commit()

    res = await db.execute(select(ImportJob).order_by(desc(ImportJob.created_at)).limit(10))
    history = res.scalars().all()

    msg = f"Đã nhập thành công tệp '{csv_file.filename}' ({len(rows)} dòng). Tạo mới: {job.created_count}, Cập nhật: {job.updated_count}, Lỗi: {job.error_count}."
    return templates.TemplateResponse(
        request,
        "import_wizard.html",
        {"admin": admin, "import_history": history, "message": msg, "active_nav": "import"},
    )

@router.get("/export")
async def export_data(
    entity: str = Query("books"),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    if entity == "books":
        res = await db.execute(select(Book).options(selectinload(Book.copies)))
        books = res.scalars().all()
        csv_data = await ImportExportService.export_books_csv(db, list(books))
        return PlainResponse(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=boconic_books_catalog.csv"},
        )
    return RedirectResponse(url="/admin/dashboard", status_code=303)

@router.get("/audit", response_class=HTMLResponse)
async def audit_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    res = await db.execute(select(AuditLog).order_by(desc(AuditLog.created_at)).limit(50))
    logs = res.scalars().all()

    return templates.TemplateResponse(
        request, "audit.html", {"admin": admin, "logs": logs, "active_nav": "audit"}
    )

@router.get("/backups", response_class=HTMLResponse)
async def backups_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    res = await db.execute(select(BackupJob).order_by(desc(BackupJob.created_at)))
    backups = res.scalars().all()

    return templates.TemplateResponse(
        request, "backups.html", {"admin": admin, "backups": backups, "active_nav": "backups"}
    )

@router.post("/backups", response_class=HTMLResponse)
async def create_backup_submit(
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    await BackupService.create_backup(db, created_by=admin.id)
    await db.commit()
    return RedirectResponse(url="/admin/backups", status_code=303)


# ==========================================
# REQUESTS & OFFERS ADMIN OPERATIONS
# ==========================================

@router.get("/requests", response_class=HTMLResponse)
async def admin_requests_page(
    request: Request,
    status: Optional[str] = Query(None),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    stmt = select(CommunityRequest, User.public_alias).join(User, CommunityRequest.user_id == User.id)
    if status:
        stmt = stmt.where(CommunityRequest.status == status)
    stmt = stmt.order_by(desc(CommunityRequest.created_at))
    res = await db.execute(stmt)
    rows = res.all()

    requests_data = []
    for req, alias in rows:
        m_count = (await db.execute(select(func.count(RequestMatch.id)).where(RequestMatch.need_id == req.id))).scalar_one() or 0
        o_count = (await db.execute(select(func.count(SupportOffer.id)).where(SupportOffer.need_id == req.id))).scalar_one() or 0
        requests_data.append((req, alias, m_count, o_count))

    return templates.TemplateResponse(
        request,
        "requests.html",
        {
            "admin": admin,
            "requests": requests_data,
            "current_status": status,
            "active_nav": "requests",
        },
    )


@router.post("/requests/{need_id}/rematch", response_class=HTMLResponse)
async def admin_rematch_need(
    need_id: str,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    await NeedService.match_need_with_owners(db, need_id)
    await db.commit()
    return RedirectResponse(url="/admin/requests", status_code=303)


@router.post("/requests/{need_id}/cancel", response_class=HTMLResponse)
async def admin_cancel_need(
    need_id: str,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    need = await db.get(CommunityRequest, need_id)
    if need:
        need.status = "cancelled"
        await db.commit()
    return RedirectResponse(url="/admin/requests", status_code=303)


# ==========================================
# INVENTORY & PARTIAL MATERIALS ADMIN
# ==========================================

@router.get("/inventory", response_class=HTMLResponse)
async def admin_inventory_page(
    request: Request,
    visibility: Optional[str] = Query(None),
    format: Optional[str] = Query(None),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    owner_user = select(User.id, User.public_alias).subquery("owner_user")
    holder_user = select(User.id, User.public_alias).subquery("holder_user")

    stmt = (
        select(
            BookCopy,
            Book,
            owner_user.c.public_alias.label("owner_alias"),
            holder_user.c.public_alias.label("holder_alias"),
        )
        .join(Book, BookCopy.book_id == Book.id)
        .outerjoin(owner_user, BookCopy.owner_id == owner_user.c.id)
        .outerjoin(holder_user, BookCopy.current_holder_id == holder_user.c.id)
    )
    if visibility:
        stmt = stmt.where(BookCopy.visibility == visibility)
    if format:
        stmt = stmt.where(BookCopy.format == format)

    stmt = stmt.order_by(desc(BookCopy.created_at))
    res = await db.execute(stmt)
    copies = res.all()

    return templates.TemplateResponse(
        request,
        "inventory.html",
        {
            "admin": admin,
            "copies": copies,
            "current_vis": visibility,
            "current_format": format,
            "active_nav": "inventory",
        },
    )


@router.get("/partial-materials", response_class=HTMLResponse)
async def admin_partial_materials_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    stmt = (
        select(CopyCoverageRange, BookCopy, Book, User.public_alias)
        .join(BookCopy, CopyCoverageRange.copy_id == BookCopy.id)
        .join(Book, BookCopy.book_id == Book.id)
        .join(User, BookCopy.owner_id == User.id)
        .order_by(desc(CopyCoverageRange.created_at))
    )
    res = await db.execute(stmt)
    partial_items = res.all()

    return templates.TemplateResponse(
        request,
        "partial_materials.html",
        {
            "admin": admin,
            "partial_items": partial_items,
            "active_nav": "partial_materials",
        },
    )


@router.post("/partial-materials/{range_id}/verify", response_class=HTMLResponse)
async def admin_verify_partial_material(
    range_id: str,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    r_item = await db.get(CopyCoverageRange, range_id)
    if r_item:
        r_item.verification_status = "verified"
        await db.commit()
    return RedirectResponse(url="/admin/partial-materials", status_code=303)


@router.post("/partial-materials/{range_id}/reject", response_class=HTMLResponse)
async def admin_reject_partial_material(
    range_id: str,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    r_item = await db.get(CopyCoverageRange, range_id)
    if r_item:
        r_item.verification_status = "rejected"
        await db.commit()
    return RedirectResponse(url="/admin/partial-materials", status_code=303)


# ==========================================
# AUTHORIZED COLLECTIONS ADMIN
# ==========================================

@router.get("/collections", response_class=HTMLResponse)
async def admin_collections_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    stmt = select(AuthorizedCollection, Book).join(Book, AuthorizedCollection.book_id == Book.id).order_by(desc(AuthorizedCollection.created_at))
    res = await db.execute(stmt)
    collections = res.all()

    return templates.TemplateResponse(
        request,
        "collections.html",
        {
            "admin": admin,
            "collections": collections,
            "active_nav": "collections",
        },
    )


@router.post("/collections/{col_id}/assemble", response_class=HTMLResponse)
async def admin_assemble_collection(
    col_id: str,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    await AssemblyService.run_assembly_job(db, col_id, requested_by=admin.id)
    await db.commit()
    return RedirectResponse(url="/admin/collections", status_code=303)


# ==========================================
# MODERATION & WARNINGS ADMIN
# ==========================================

@router.get("/moderation", response_class=HTMLResponse)
async def admin_moderation_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    stmt = select(UserWarning, User.public_alias).join(User, UserWarning.subject_user_id == User.id).order_by(desc(UserWarning.created_at))
    res = await db.execute(stmt)
    warnings = res.all()

    return templates.TemplateResponse(
        request,
        "moderation.html",
        {
            "admin": admin,
            "warnings": warnings,
            "active_nav": "moderation",
        },
    )


@router.post("/warnings/issue", response_class=HTMLResponse)
async def admin_issue_warning(
    user_id: str = Form(...),
    category: str = Form(...),
    severity: str = Form(...),
    message: str = Form(...),
    reason: str = Form(...),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    await WarningService.issue_warning(
        db=db,
        subject_user_id=user_id.strip(),
        category=category,
        severity=severity,
        message=message,
        reason=reason,
        issued_by=admin.id,
    )
    await db.commit()
    return RedirectResponse(url="/admin/moderation", status_code=303)


@router.post("/warnings/{warning_id}/appeal/accept", response_class=HTMLResponse)
async def admin_accept_appeal(
    warning_id: str,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    await WarningService.review_appeal(db, warning_id, moderator_id=admin.id, decision="accepted")
    await db.commit()
    return RedirectResponse(url="/admin/moderation", status_code=303)


@router.post("/warnings/{warning_id}/appeal/reject", response_class=HTMLResponse)
async def admin_reject_appeal(
    warning_id: str,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    await WarningService.review_appeal(db, warning_id, moderator_id=admin.id, decision="rejected")
    await db.commit()
    return RedirectResponse(url="/admin/moderation", status_code=303)


# ==========================================
# ANALYTICS & JOBS ADMIN
# ==========================================

@router.get("/analytics", response_class=HTMLResponse)
async def admin_analytics_page(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    total_needs = (await db.execute(select(func.count(CommunityRequest.id)))).scalar_one() or 0
    open_needs = (await db.execute(select(func.count(CommunityRequest.id)).where(CommunityRequest.status == "open"))).scalar_one() or 0
    fulfilled_needs = (await db.execute(select(func.count(CommunityRequest.id)).where(CommunityRequest.status == "fulfilled"))).scalar_one() or 0

    total_offers = (await db.execute(select(func.count(SupportOffer.id)))).scalar_one() or 0
    selected_offers = (await db.execute(select(func.count(SupportOffer.id)).where(SupportOffer.status.in_(["selected", "fulfilled"])))).scalar_one() or 0
    selection_rate = round((selected_offers / total_offers * 100.0), 1) if total_offers > 0 else 0.0

    matched_owners_count = (await db.execute(select(func.count(RequestMatch.id)))).scalar_one() or 0
    notified_count = (await db.execute(select(func.count(RequestMatch.id)).where(RequestMatch.notification_status == "sent"))).scalar_one() or 0

    active_loans = (await db.execute(select(func.count(Loan.id)).where(Loan.status.in_(["reserved", "active", "return_pending"])))).scalar_one() or 0
    now = datetime.datetime.now(datetime.timezone.utc)
    overdue_loans = (await db.execute(select(func.count(Loan.id)).where(Loan.status == "active", Loan.due_at < now))).scalar_one() or 0

    total_warnings = (await db.execute(select(func.count(UserWarning.id)))).scalar_one() or 0
    rights_warnings = (await db.execute(select(func.count(UserWarning.id)).where(UserWarning.category == "rights_review"))).scalar_one() or 0
    pending_appeals = (await db.execute(select(func.count(UserWarning.id)).where(UserWarning.appeal_status == "pending"))).scalar_one() or 0
    active_collections = (await db.execute(select(func.count(AuthorizedCollection.id)).where(AuthorizedCollection.status == "active"))).scalar_one() or 0

    fulfillment_rate = round((fulfilled_needs / total_needs * 100.0), 1) if total_needs > 0 else 0.0

    stats = {
        "total_needs": total_needs,
        "open_needs": open_needs,
        "fulfilled_needs": fulfilled_needs,
        "total_offers": total_offers,
        "selected_offers": selected_offers,
        "selection_rate": selection_rate,
        "matched_owners_count": matched_owners_count,
        "notified_count": notified_count,
        "active_loans": active_loans,
        "overdue_loans": overdue_loans,
        "total_warnings": total_warnings,
        "rights_warnings": rights_warnings,
        "pending_appeals": pending_appeals,
        "active_collections": active_collections,
        "fulfillment_rate": fulfillment_rate,
    }

    return templates.TemplateResponse(
        request,
        "analytics.html",
        {
            "admin": admin,
            "stats": stats,
            "active_nav": "analytics",
        },
    )


@router.get("/chapter-proposals", response_class=HTMLResponse)
async def list_chapter_proposals(
    request: Request,
    status: str = Query("all"),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    query = select(ChapterProposal).options(
        selectinload(ChapterProposal.book),
        selectinload(ChapterProposal.chapter),
        selectinload(ChapterProposal.proposer),
    ).order_by(desc(ChapterProposal.created_at))

    if status != "all":
        query = query.where(ChapterProposal.status == status)

    res = await db.execute(query)
    proposals = list(res.scalars().all())

    return templates.TemplateResponse(
        request,
        "chapter_proposals.html",
        {
            "admin": admin,
            "proposals": proposals,
            "current_status": status,
            "active_nav": "chapter_proposals",
        },
    )


@router.post("/chapter-proposals/{proposal_id}/review")
async def review_chapter_proposal(
    proposal_id: str,
    action: str = Form(...), # approve or reject
    review_notes: Optional[str] = Form(None),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    is_approved = (action == "approve")
    await ChapterService.review_chapter_proposal(
        db=db,
        proposal_id=proposal_id,
        reviewer_id=admin.username,
        approved=is_approved,
        review_notes=review_notes,
    )
    await db.commit()
    return RedirectResponse(url="/admin/chapter-proposals", status_code=303)


@router.get("/process-audit", response_class=HTMLResponse)
async def process_audit_dashboard(
    request: Request,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    # Revalidation needs
    reval_res = await db.execute(
        select(CommunityRequest).options(
            selectinload(CommunityRequest.user)
        ).where(CommunityRequest.revalidation_required == True)
    )
    revalidation_needs = list(reval_res.scalars().all())

    # Pending proposals
    pending_prop_res = await db.execute(
        select(func.count(ChapterProposal.id)).where(ChapterProposal.status == "pending")
    )
    pending_proposals_count = pending_prop_res.scalar_one() or 0

    # Active and overdue loans
    now = datetime.datetime.now(datetime.timezone.utc)
    active_loans_count = (await db.execute(select(func.count(Loan.id)).where(Loan.status == "active"))).scalar_one() or 0
    overdue_loans_count = (await db.execute(select(func.count(Loan.id)).where(Loan.status == "active", Loan.due_at < now))).scalar_one() or 0

    # Outbox events
    pending_outbox_count = (await db.execute(select(func.count(OutboxEvent.id)).where(OutboxEvent.processed_at.is_(None)))).scalar_one() or 0
    recent_outbox_res = await db.execute(
        select(OutboxEvent).order_by(desc(OutboxEvent.created_at)).limit(25)
    )
    recent_outbox = list(recent_outbox_res.scalars().all())

    return templates.TemplateResponse(
        request,
        "process_audit.html",
        {
            "admin": admin,
            "revalidation_needs": revalidation_needs,
            "pending_proposals_count": pending_proposals_count,
            "active_loans_count": active_loans_count,
            "overdue_loans_count": overdue_loans_count,
            "pending_outbox_count": pending_outbox_count,
            "recent_outbox": recent_outbox,
            "active_nav": "process_audit",
        },
    )


@router.post("/process-audit/resolve-revalidation/{need_id}")
async def resolve_need_revalidation(
    need_id: str,
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    need = await db.get(CommunityRequest, need_id)
    if need:
        need.revalidation_required = False
        await db.commit()

    return RedirectResponse(url="/admin/process-audit", status_code=303)


# ==========================================
# USER MANAGEMENT & RESOURCE TRACKING ADMIN
# ==========================================

@router.get("/users", response_class=HTMLResponse)
async def admin_users_page(
    request: Request,
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    data = await UserService.list_users(
        db=db,
        search=search,
        status=status,
        page=page,
        page_size=page_size,
    )

    return templates.TemplateResponse(
        request,
        "users.html",
        {
            "admin": admin,
            "users_data": data["users"],
            "total_count": data["total_count"],
            "current_page": data["page"],
            "total_pages": data["total_pages"],
            "search_query": search or "",
            "status_filter": status or "all",
            "stats": data["stats"],
            "active_nav": "users",
        },
    )


@router.get("/users/{user_id}", response_class=HTMLResponse)
async def admin_user_detail_page(
    request: Request,
    user_id: str,
    message: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    details = await UserService.get_user_resource_details(db, user_id=user_id)

    return templates.TemplateResponse(
        request,
        "user_detail.html",
        {
            "admin": admin,
            "user": details["user"],
            "locations": details["locations"],
            "settings": details["settings"],
            "trust_profile": details["trust_profile"],
            "warnings": details["warnings"],
            "borrowed_loans": details["borrowed_loans"],
            "lent_loans": details["lent_loans"],
            "owned_copies": details["owned_copies"],
            "chapter_resources": details["chapter_resources"],
            "open_needs": details["open_needs"],
            "open_offers": details["open_offers"],
            "study_progress": details["study_progress"],
            "message": message,
            "error": error,
            "active_nav": "users",
        },
    )


@router.post("/users/{user_id}/status", response_class=HTMLResponse)
async def admin_update_user_status_form(
    user_id: str,
    status: str = Form(...),
    reason: str = Form(""),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    try:
        await UserService.update_user_status(
            db=db,
            user_id=user_id,
            new_status=status,
            reason=reason,
            admin_id=admin.username,
        )
        await db.commit()
        return RedirectResponse(
            url=f"/admin/users/{user_id}?message=Đã+cập+nhật+trạng+thái+thành+công",
            status_code=303,
        )
    except Exception as e:
        await db.rollback()
        return RedirectResponse(
            url=f"/admin/users/{user_id}?error={str(e)}",
            status_code=303,
        )


@router.post("/users/{user_id}/warn", response_class=HTMLResponse)
async def admin_warn_user_form(
    user_id: str,
    category: str = Form(...),
    severity: str = Form(...),
    message: str = Form(...),
    reason: str = Form(...),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    try:
        await WarningService.issue_warning(
            db=db,
            subject_user_id=user_id,
            category=category,
            severity=severity,
            message=message,
            reason=reason,
            issued_by=admin.username,
        )
        await db.commit()
        return RedirectResponse(
            url=f"/admin/users/{user_id}?message=Đã+gửi+cảnh+cáo+thành+công",
            status_code=303,
        )
    except Exception as e:
        await db.rollback()
        return RedirectResponse(
            url=f"/admin/users/{user_id}?error={str(e)}",
            status_code=303,
        )


@router.post("/users/{user_id}/force-return/{loan_id}", response_class=HTMLResponse)
async def admin_force_return_loan_form(
    user_id: str,
    loan_id: str,
    resolution_notes: str = Form(...),
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    admin = await get_optional_admin(boconic_session, db)
    if not admin:
        return RedirectResponse(url="/admin/login", status_code=303)

    try:
        await UserService.admin_force_return_loan(
            db=db,
            loan_id=loan_id,
            admin_id=admin.username,
            resolution_notes=resolution_notes,
        )
        await db.commit()
        return RedirectResponse(
            url=f"/admin/users/{user_id}?message=Đã+hoàn+tất+cưỡng+chế+giao+dịch+mượn",
            status_code=303,
        )
    except Exception as e:
        await db.rollback()
        return RedirectResponse(
            url=f"/admin/users/{user_id}?error={str(e)}",
            status_code=303,
        )


@router.get("/logout", response_class=HTMLResponse)
@router.post("/logout", response_class=HTMLResponse)
async def admin_logout(
    boconic_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if boconic_session:
        res = await db.execute(select(AdminSession).where(AdminSession.session_token == boconic_session))
        sess = res.scalar_one_or_none()
        if sess:
            await db.delete(sess)
            await db.commit()
    response = RedirectResponse(url="/admin/login", status_code=303)
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME)
    return response
