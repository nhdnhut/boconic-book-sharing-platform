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
from app.db.models.catalog import Author, Book, BookAuthor, BookCopy
from app.db.models.community import CommunityRequest, Report
from app.db.models.custom_fields import CustomFieldDefinition
from app.db.models.identity import AdminAccount, AdminSession, User
from app.db.models.jobs import AuditLog, BackupJob, ImportJob
from app.db.models.lending import Loan
from app.db.session import get_db
from app.services.audit import AuditService
from app.services.backup import BackupService
from app.services.catalog import CatalogService
from app.services.import_export import ImportExportService

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
    await db.flush()

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
    await db.flush()

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
    return RedirectResponse(url="/admin/backups", status_code=303)
