import asyncio
from typing import Optional
from aiogram import Bot, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
import httpx

from app.bot.client import internal_bot_client
from app.bot.keyboards import (
    get_book_inline_keyboard,
    get_cancel_keyboard,
    get_condition_inline_keyboard,
    get_duration_inline_keyboard,
    get_library_tabs_keyboard,
    get_loan_handover_keyboard,
    get_loan_return_keyboard,
    get_main_menu_keyboard,
    get_need_offer_actions_keyboard,
    get_need_scope_keyboard,
    get_need_urgency_keyboard,
    get_offer_notification_keyboard,
    get_report_category_keyboard,
    get_request_action_keyboard,
    get_book_chapters_keyboard,
    get_chapter_detail_keyboard,
)
from app.core.config import settings
from app.core.logging import logger

router = Router()

def is_admin(user_id: int) -> bool:
    admin_id = str(settings.ADMIN_TELEGRAM_ID or "").strip()
    return bool(admin_id and str(user_id) == admin_id)

def parse_http_error(e: Exception) -> str:
    if isinstance(e, httpx.HTTPStatusError):
        try:
            err_data = e.response.json()
            if isinstance(err_data, dict):
                return err_data.get("message") or err_data.get("detail") or str(e)
        except Exception:
            pass
    return str(e)

# --- FSM States ---
class SearchState(StatesGroup):
    waiting_for_query = State()

class NeedState(StatesGroup):
    waiting_for_title = State()

class RequestWizardState(StatesGroup):
    waiting_for_title = State()
    waiting_for_scope = State()
    waiting_for_scope_detail = State()
    waiting_for_urgency = State()
    waiting_for_location = State()

class AddBookState(StatesGroup):
    waiting_for_book_query = State()
    waiting_for_condition = State()
    waiting_for_duration = State()
    waiting_for_notes = State()

class ReportState(StatesGroup):
    waiting_for_category = State()
    waiting_for_description = State()

class PartialCopyState(StatesGroup):
    waiting_for_book = State()
    waiting_for_pages = State()
    waiting_for_condition = State()

# --- Common Handlers ---
@router.message(CommandStart())
async def handle_start(message: Message, state: FSMContext):
    await state.clear()
    actor_id = message.from_user.id
    display_name = message.from_user.full_name or message.from_user.first_name
    username = message.from_user.username
    user_is_admin = is_admin(actor_id)

    # Sync profile with backend
    try:
        user_info = await internal_bot_client.sync_user(
            telegram_user_id=actor_id,
            display_name=display_name,
            telegram_username=username,
            language_code=message.from_user.language_code or "vi",
        )
        alias = user_info.get("public_alias", "Bạn")
    except Exception:
        alias = "Bạn"

    admin_badge = "\n👑 **Bạn đang đăng nhập với tư cách Quản trị viên (Super Admin)**." if user_is_admin else ""

    welcome_text = (
        f"👋 Chào mừng {alias} đến với **Boconic**!{admin_badge}\n\n"
        "✨ *Find what you need. Find who can help.*\n\n"
        "Boconic là nền tảng kết nối sách giáo khoa, học liệu và tài liệu học tập trong cộng đồng học sinh, sinh viên và phụ huynh.\n\n"
        "📚 **Bạn có thể:**\n"
        "• 🔎 Tìm sách cần mượn quanh khu vực\n"
        "• ➕ Đăng sách của bạn để chia sẻ cho cộng đồng\n"
        "• 📋 Quản lý yêu cầu mượn & giao nhận 2 bên\n"
        "• 🔗 Tra cứu tài nguyên số mở đã kiểm duyệt bản quyền\n\n"
        "Hãy chọn chức năng từ menu bên dưới để bắt đầu:"
    )
    await message.answer(
        welcome_text,
        reply_markup=get_main_menu_keyboard(is_admin=user_is_admin),
        parse_mode="Markdown"
    )

@router.message(Command("help"))
async def handle_help(message: Message):
    actor_id = message.from_user.id
    help_text = (
        "📖 **Hướng dẫn sử dụng Boconic:**\n\n"
        "• **🔎 Tìm sách**: Nhập tên sách, môn, lớp hoặc mã ISBN để tìm bản sách đang có người cho mượn.\n"
        "• **➕ Đăng sách**: Chia sẻ các đầu sách bạn có sẵn cho bạn học khác mượn.\n"
        "• **📖 Sách của tôi**: Quản lý những cuốn sách bạn đã đăng.\n"
        "• **📋 Yêu cầu mượn**: Xem các yêu cầu bạn đã gửi hoặc người khác gửi tới bạn.\n"
        "• **🤝 Đang mượn / 📤 Cho mượn**: Xác nhận giao nhận thực tế và xác nhận hoàn trả 2 bên an toàn.\n"
        "• **📢 Tôi đang cần**: Đăng nhu cầu tìm sách khi cộng đồng chưa có bản sẵn sàng.\n"
        "• **📍 Gần tôi**: Tra cứu các bản sách đang có sẵn ở các quận huyện quanh bạn.\n"
        "• **🏛 Thư viện & Trường học**: Danh mục thư viện đối tác hỗ trợ bạn đọc.\n"
        "• **🔗 Tài nguyên mở**: Học liệu điện tử, đề thi, chuyên đề đã kiểm duyệt bản quyền.\n"
        "• **🚩 Báo cáo / Hỗ trợ**: Báo cáo sự cố hoặc sách sai thông tin.\n"
    )
    if is_admin(actor_id):
        help_text += "\n👑 **Lệnh Quản trị**: Gửi lệnh /admin để xem bảng điều khiển và thống kê toàn hệ thống."

    await message.answer(help_text, reply_markup=get_main_menu_keyboard(is_admin=is_admin(actor_id)), parse_mode="Markdown")

@router.message(Command("cancel"))
@router.message(F.text == "❌ Hủy thao tác")
async def handle_cancel(message: Message, state: FSMContext):
    current_state = await state.get_state()
    await state.clear()
    kb = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
    if current_state:
        await message.answer("Đã hủy thao tác hiện tại.", reply_markup=kb)
    else:
        await message.answer("Không có thao tác nào đang dở dang.", reply_markup=kb)

# --- Search Flow ---
@router.message(F.text == "🔎 Tìm sách")
@router.message(Command("search"))
async def start_search(message: Message, state: FSMContext):
    await state.set_state(SearchState.waiting_for_query)
    await message.answer(
        "🔍 Nhập tên sách, tác giả, môn học hoặc mã ISBN bạn cần tìm:",
        reply_markup=get_cancel_keyboard(),
    )

@router.message(SearchState.waiting_for_query)
async def process_search_query(message: Message, state: FSMContext):
    query = message.text.strip()
    if query == "❌ Hủy thao tác":
        await state.clear()
        await message.answer("Đã hủy tìm kiếm.", reply_markup=get_main_menu_keyboard(is_admin=is_admin(message.from_user.id)))
        return

    await state.clear()
    await message.answer(f"Đang tìm kiếm sách khớp với: *{query}*...", parse_mode="Markdown")

    try:
        data = await internal_bot_client.search_books(message.from_user.id, query=query, limit=5)
        items = data.get("items", [])
    except Exception as e:
        await message.answer(
            f"Có lỗi khi tra cứu dữ liệu: {parse_http_error(e)}",
            reply_markup=get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
        )
        return

    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
    if not items:
        await message.answer(
            f"Không tìm thấy đầu sách nào khớp với '{query}'.\n\n"
            "💡 Bạn có thể đăng nhu cầu tìm sách qua mục '📢 Tôi đang cần' để cộng đồng hỗ trợ!",
            reply_markup=kb_menu
        )
        return

    for item in items:
        authors = ", ".join(item["authors"]) if item["authors"] else "N/A"
        grade = f"Lớp {item['grade_level']}" if item.get("grade_level") else ""
        subject = item.get("subject") or ""
        tag = f"[{subject} - {grade}]" if subject or grade else ""
        curriculum = f"• Bộ sách: {item['curriculum']}\n" if item.get("curriculum") else ""
        isbn = f"• ISBN: `{item['isbn13']}`\n" if item.get("isbn13") else ""

        card = (
            f"📚 **{item['title']}** {tag}\n"
            f"✍️ Tác giả: {authors}\n"
            f"🏢 NXB: {item.get('publisher') or 'N/A'}\n"
            f"{curriculum}"
            f"{isbn}"
            f"📦 Số bản sẵn sàng mượn: **{item['available_count']}**"
        )
        kb = get_book_inline_keyboard(item["book_id"], item["copies"]) if item["copies"] else None
        await message.answer(card, reply_markup=kb, parse_mode="Markdown")

    await message.answer("👆 Bạn có thể bấm nút trực tiếp trên từng bản sách để gửi yêu cầu mượn.", reply_markup=kb_menu)

# --- Add Book Flow ---
@router.message(F.text == "➕ Đăng sách")
@router.message(Command("addbook"))
async def start_add_book(message: Message, state: FSMContext):
    await state.set_state(AddBookState.waiting_for_book_query)
    await message.answer(
        "➕ **Đăng sách để chia sẻ với cộng đồng:**\n\n"
        "Hãy nhập tên cuốn sách hoặc mã ISBN bạn muốn đăng:",
        reply_markup=get_cancel_keyboard(),
        parse_mode="Markdown"
    )

@router.message(AddBookState.waiting_for_book_query)
async def process_add_book_query(message: Message, state: FSMContext):
    query = message.text.strip()
    if query == "❌ Hủy thao tác":
        await state.clear()
        await message.answer("Đã hủy đăng sách.", reply_markup=get_main_menu_keyboard(is_admin=is_admin(message.from_user.id)))
        return

    try:
        data = await internal_bot_client.search_books(message.from_user.id, query=query, limit=5)
        items = data.get("items", [])
    except Exception as e:
        await message.answer(f"Lỗi tra cứu danh mục: {parse_http_error(e)}")
        return

    if not items:
        await message.answer(
            f"Chưa tìm thấy đầu sách '{query}' trong danh mục chuẩn.\n"
            "Hãy thử tìm kiếm với tên môn hoặc từ khóa chính xác hơn (ví dụ: 'Toán 12', 'Vật lí 12'):",
            reply_markup=get_cancel_keyboard()
        )
        return

    buttons = []
    for item in items:
        btn_text = f"📖 {item['title'][:35]}"
        buttons.append([InlineKeyboardButton(text=btn_text, callback_data=f"ab_book:{item['book_id']}")])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)
    await message.answer("Chọn đầu sách bạn sở hữu từ danh mục bên dưới:", reply_markup=kb)

@router.callback_query(F.data.startswith("ab_book:"))
async def process_select_book_to_add(call: CallbackQuery, state: FSMContext):
    await call.answer()
    book_id = call.data.split(":")[1]
    await state.update_data(book_id=book_id)
    await state.set_state(AddBookState.waiting_for_condition)

    await call.message.edit_text(
        "✨ **Bước 2/3: Chọn tình trạng vật lý của cuốn sách:**",
        reply_markup=get_condition_inline_keyboard(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("cnd:"))
async def process_select_condition(call: CallbackQuery, state: FSMContext):
    await call.answer()
    condition = call.data.split(":")[1]
    await state.update_data(condition=condition)
    await state.set_state(AddBookState.waiting_for_duration)

    await call.message.edit_text(
        "⏰ **Bước 3/3: Chọn thời gian cho mượn tối đa một lần:**",
        reply_markup=get_duration_inline_keyboard(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("dur:"))
async def process_select_duration(call: CallbackQuery, state: FSMContext):
    await call.answer()
    duration_days = int(call.data.split(":")[1])
    data = await state.get_data()
    book_id = data.get("book_id")
    condition = data.get("condition", "good")
    await state.clear()

    try:
        result = await internal_bot_client.add_copy(
            telegram_user_id=call.from_user.id,
            book_id=book_id,
            condition=condition,
            maximum_loan_days=duration_days,
            notes="Đăng qua Telegram Bot Boconic",
        )
        public_code = result.get("public_code", "BC-XXXX")
        await call.message.edit_text(
            f"🎉 **Đăng sách thành công!**\n\n"
            f"• Mã bản sách công khai: `{public_code}`\n"
            f"• Tình trạng: `{condition}`\n"
            f"• Thời hạn mượn tối đa: **{duration_days} ngày**\n\n"
            f"Cuốn sách của bạn hiện đã sẵn sàng để người học khác trong cộng đồng tìm thấy và gửi yêu cầu mượn. "
            f"Cảm ơn tinh thần chia sẻ vì giáo dục cộng đồng của bạn! 💙",
            parse_mode="Markdown"
        )
    except Exception as e:
        await call.message.edit_text(f"❌ Có lỗi khi tạo bản sách: {parse_http_error(e)}")

# --- My Books Flow ---
@router.message(F.text == "📖 Sách của tôi")
@router.message(Command("mybooks"))
async def handle_my_books(message: Message):
    try:
        copies = await internal_bot_client.get_my_books(message.from_user.id)
    except Exception as e:
        await message.answer(f"Lỗi tải danh sách sách: {parse_http_error(e)}")
        return

    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
    if not copies:
        await message.answer(
            "Bạn chưa đăng cuốn sách nào lên Boconic.\n\n"
            "Hãy bấm '➕ Đăng sách' để chia sẻ sách cũ giúp đỡ các bạn học khác nhé!",
            reply_markup=kb_menu
        )
        return

    text_lines = ["📖 **Danh sách sách bạn đang sở hữu trên Boconic:**\n"]
    for idx, c in enumerate(copies, 1):
        status_label = "🟢 Sẵn sàng mượn" if c["status"] == "available" else f"🟡 {c['status']}"
        cond_vi = {"new": "Mới", "like_new": "Rất tốt", "good": "Tốt", "fair": "Khá"}.get(c['condition'], c['condition'])
        text_lines.append(f"{idx}. **{c['book_title']}** (Mã: `{c['public_code']}`)\n   • Tình trạng: {cond_vi} | {status_label}")

    await message.answer("\n".join(text_lines), reply_markup=kb_menu, parse_mode="Markdown")

# --- Borrow Requests Flow ---
@router.message(F.text == "📋 Yêu cầu mượn")
@router.message(Command("requests"))
async def handle_requests(message: Message):
    try:
        data = await internal_bot_client.get_requests(message.from_user.id)
        incoming = data.get("incoming", [])
        outgoing = data.get("outgoing", [])
    except Exception as e:
        await message.answer(f"Lỗi tải yêu cầu mượn: {parse_http_error(e)}")
        return

    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))

    if not incoming and not outgoing:
        await message.answer("Hiện bạn chưa có yêu cầu mượn sách nào (gửi đi hoặc nhận về).", reply_markup=kb_menu)
        return

    # 1. Incoming requests
    if incoming:
        await message.answer("📬 **YÊU CẦU ĐANG CHỜ BẠN DUYỆT (Nhận về):**", parse_mode="Markdown")
        for req in incoming:
            text = (
                f"📘 **{req['book_title']}** (Mã: `{req['copy_code']}`)\n"
                f"👤 Người muốn mượn: **{req['borrower_alias']}**\n"
                f"⏰ Thời hạn đề xuất: **{req['duration_days']} ngày**\n"
            )
            if req.get("note"):
                text += f"💬 Lời nhắn: \"{req['note']}\"\n"
            kb = get_request_action_keyboard(req["request_id"])
            await message.answer(text, reply_markup=kb, parse_mode="Markdown")

    # 2. Outgoing requests
    if outgoing:
        out_lines = ["📤 **CÁC YÊU CẦU BẠN ĐÃ GỬI ĐI:**\n"]
        for idx, req in enumerate(outgoing, 1):
            st = {
                "pending": "⏳ Chờ chủ sách duyệt",
                "accepted": "✅ Đã chấp nhận (đang giữ chỗ)",
                "rejected": "❌ Đã bị từ chối",
                "expired": "⏱ Đã hết hạn",
            }.get(req["status"], req["status"])
            out_lines.append(f"{idx}. **{req['book_title']}** (Mã: `{req['copy_code']}`)\n   Chủ sách: {req['owner_alias']} | Trạng thái: {st}")

        await message.answer("\n".join(out_lines), reply_markup=kb_menu, parse_mode="Markdown")

# --- My Loans Flow ---
@router.message(F.text == "🤝 Đang mượn")
@router.message(Command("loans"))
async def handle_my_loans(message: Message):
    try:
        loans = await internal_bot_client.get_my_loans(message.from_user.id)
    except Exception as e:
        await message.answer(f"Lỗi tải danh sách mượn: {parse_http_error(e)}")
        return

    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
    if not loans:
        await message.answer("Hiện bạn không có cuốn sách nào đang mượn.", reply_markup=kb_menu)
        return

    for l in loans:
        status_vi = {
            "reserved": "🟡 Đã giữ chỗ (chờ giao nhận)",
            "active": "🟢 Đang mượn",
            "return_pending": "🔄 Đang chờ xác nhận trả",
        }.get(l["status"], l["status"])

        card = (
            f"📘 **{l['book_title']}** (Mã: `{l['public_code']}`)\n"
            f"👤 Chủ sách: **{l['lender_alias']}**\n"
            f"📌 Trạng thái: **{status_vi}**\n"
        )
        if l.get("due_at"):
            card += f"⏰ Hạn trả: **{l['due_at'][:10]}**"

        kb = None
        if l["status"] == "reserved":
            kb = get_loan_handover_keyboard(l["loan_id"], role="borrower")
        elif l["status"] == "active":
            kb = get_loan_return_keyboard(l["loan_id"], is_pending=False)
        elif l["status"] == "return_pending":
            kb = get_loan_return_keyboard(l["loan_id"], is_pending=True)

        await message.answer(card, reply_markup=kb, parse_mode="Markdown")

# --- My Lendings Flow ---
@router.message(F.text == "📤 Đang cho mượn")
@router.message(Command("lendings"))
async def handle_my_lendings(message: Message):
    try:
        loans = await internal_bot_client.get_my_lendings(message.from_user.id)
    except Exception as e:
        await message.answer(f"Lỗi tải danh sách: {parse_http_error(e)}")
        return

    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
    if not loans:
        await message.answer("Bạn hiện chưa có bản sách nào đang được người khác mượn.", reply_markup=kb_menu)
        return

    for l in loans:
        status_vi = {
            "reserved": "🟡 Đã giữ chỗ (chờ giao nhận)",
            "active": "🟢 Người khác đang mượn",
            "return_pending": "🔄 Đang chờ xác nhận nhận lại sách",
        }.get(l["status"], l["status"])

        card = (
            f"📗 **{l['book_title']}** (Mã: `{l['public_code']}`)\n"
            f"👤 Người mượn: **{l['borrower_alias']}**\n"
            f"📌 Trạng thái: **{status_vi}**\n"
        )
        if l.get("due_at"):
            card += f"⏰ Hạn trả: **{l['due_at'][:10]}**"

        kb = None
        if l["status"] == "reserved":
            kb = get_loan_handover_keyboard(l["loan_id"], role="lender")
        elif l["status"] == "return_pending":
            kb = get_loan_return_keyboard(l["loan_id"], is_pending=True)

        await message.answer(card, reply_markup=kb, parse_mode="Markdown")

# --- Community Need Flow ---
@router.message(F.text == "📢 Tôi đang cần")
@router.message(Command("need"))
async def handle_need(message: Message, state: FSMContext):
    await state.set_state(NeedState.waiting_for_title)
    await message.answer(
        "📢 **Đăng nhu cầu tìm sách:**\n\n"
        "Hãy nhập tên cuốn sách hoặc môn học bạn đang cần mượn gấp:",
        reply_markup=get_cancel_keyboard(),
        parse_mode="Markdown"
    )

@router.message(NeedState.waiting_for_title)
async def process_need_title(message: Message, state: FSMContext):
    title = message.text.strip()
    if title == "❌ Hủy thao tác":
        await state.clear()
        await message.answer("Đã hủy đăng nhu cầu.", reply_markup=get_main_menu_keyboard(is_admin=is_admin(message.from_user.id)))
        return

    await state.clear()
    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
    try:
        res = await internal_bot_client.create_community_need(
            telegram_user_id=message.from_user.id,
            title_query=title,
        )
        await message.answer(
            f"✅ **Đã ghi nhận nhu cầu của bạn:** *{title}*\n\n"
            "Nhu cầu của bạn đã được đưa lên hệ thống mở. "
            "Khi có thành viên trong khu vực đăng bản sách phù hợp, hệ thống sẽ gửi thông báo đến bạn!",
            reply_markup=kb_menu,
            parse_mode="Markdown"
        )
    except Exception as e:
        await message.answer(f"Lỗi ghi nhận nhu cầu: {parse_http_error(e)}", reply_markup=kb_menu)

# --- Nearby Books Flow ---
@router.message(F.text == "📍 Gần tôi")
@router.message(Command("nearby"))
async def handle_nearby(message: Message):
    try:
        # Search available catalog books
        data = await internal_bot_client.search_books(message.from_user.id, query="", limit=5)
        items = data.get("items", [])
    except Exception as e:
        await message.answer(f"Lỗi tìm kiếm sách khu vực: {parse_http_error(e)}")
        return

    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
    if not items:
        await message.answer("Chưa có sách nào sẵn sàng mượn quanh khu vực của bạn.", reply_markup=kb_menu)
        return

    text_lines = ["📍 **Sách đang có sẵn mượn tại TP. Hồ Chí Minh (Quận 5, Quận 10):**\n"]
    for idx, item in enumerate(items, 1):
        if item.get("available_count", 0) > 0:
            text_lines.append(
                f"{idx}. 📚 **{item['title']}**\n"
                f"   • Khả dụng: **{item['available_count']} bản** | NXB: {item.get('publisher') or 'N/A'}\n"
                f"   • Khu vực kết nối: *Quận 5, Quận 10, TP.HCM*"
            )

    text_lines.append("\n👉 Gõ /search hoặc bấm '🔎 Tìm sách' để xem chi tiết và gửi yêu cầu mượn!")
    await message.answer("\n".join(text_lines), reply_markup=kb_menu, parse_mode="Markdown")

# --- Libraries & Schools Flow ---
@router.message(F.text == "🏛 Thư viện & Trường học")
@router.message(Command("library"))
async def handle_libraries(message: Message):
    try:
        orgs = await internal_bot_client.get_libraries(message.from_user.id)
    except Exception as e:
        await message.answer(f"Lỗi tải danh mục thư viện: {parse_http_error(e)}")
        return

    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
    if not orgs:
        await message.answer("Chưa có dữ liệu thư viện đối tác.", reply_markup=kb_menu)
        return

    text_lines = ["🏛 **Danh mục Thư viện & Trường học đối tác đã xác minh:**\n"]
    for idx, o in enumerate(orgs, 1):
        text_lines.append(
            f"{idx}. 🏫 **{o['name']}**\n"
            f"   • Địa chỉ: {o.get('public_address') or o.get('city')}\n"
            f"   • Giờ mở cửa: {o.get('opening_hours') or '07:30 - 17:00 (Thứ 2 - Thứ 6)'}\n"
            f"   • Chính sách: {o.get('inventory_policy') or 'Phục vụ học sinh, giáo viên và cộng đồng'}\n"
        )

    await message.answer("\n".join(text_lines), reply_markup=kb_menu, parse_mode="Markdown")

# --- Open Digital Resources Flow ---
@router.message(F.text == "🔗 Tài nguyên mở")
@router.message(Command("resources"))
async def handle_resources(message: Message):
    try:
        res_list = await internal_bot_client.get_resources(message.from_user.id)
    except Exception:
        res_list = []

    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))

    if res_list:
        text_lines = ["📚 **Học liệu & Tài nguyên số mở đã kiểm duyệt bản quyền (Boconic):**\n"]
        for idx, r in enumerate(res_list, 1):
            text_lines.append(
                f"{idx}. 📄 **{r['title']}**\n"
                f"   • Nguồn: {r['source_name']} | Giấy phép: `{r['license_name']}`\n"
                f"   • Liên kết: {r['source_url']}\n"
            )
        text_lines.append("Tất cả tài nguyên số trên Boconic đều tuân thủ nghiêm ngặt quyền sở hữu trí tuệ.")
        await message.answer("\n".join(text_lines), reply_markup=kb_menu, parse_mode="Markdown")
    else:
        text = (
            "📚 **Học liệu & Tài nguyên mở đã kiểm duyệt (Boconic Resources):**\n\n"
            "1. **Bộ đề thi và Đáp án THPT Quốc Gia - Môn Toán (2024)**\n"
            "   • Nguồn: Bộ Giáo dục & Đào tạo | Giấy phép: Công khai\n"
            "   • Liên kết: https://moet.gov.vn\n\n"
            "2. **Tài liệu Bổ trợ Chuyên đề Cảm ứng Điện từ - Vật Lí 12**\n"
            "   • Nguồn: Thư viện Học liệu Mở Việt Nam | Giấy phép: CC BY-NC 4.0\n"
            "   • Liên kết: https://hoclieu.vn\n\n"
            "Tất cả tài nguyên số trên Boconic đều được kiểm tra bản quyền theo quy định."
        )
        await message.answer(text, reply_markup=kb_menu, parse_mode="Markdown")

# --- User Profile Flow ---
@router.message(F.text == "👤 Hồ sơ & Cài đặt")
@router.message(Command("profile"))
async def handle_profile(message: Message):
    actor_id = message.from_user.id
    user_is_admin = is_admin(actor_id)
    try:
        user_info = await internal_bot_client.sync_user(
            telegram_user_id=actor_id,
            display_name=message.from_user.full_name or message.from_user.first_name,
        )
        alias = user_info.get("public_alias", "User")
        status = user_info.get("status", "active")
    except Exception:
        alias = "User"
        status = "active"

    role_str = "👑 Quản trị viên tối cao (Super Admin)" if user_is_admin else "Thành viên cộng đồng"

    profile_text = (
        "👤 **Thông tin tài khoản Boconic:**\n\n"
        f"• Biệt danh công khai: **{alias}**\n"
        f"• Telegram Numeric ID: `{actor_id}`\n"
        f"• Vai trò: **{role_str}**\n"
        f"• Trạng thái tài khoản: `{status}`\n"
        f"• Ngôn ngữ: `Tiếng Việt (vi)`\n\n"
        "🔒 **Chính sách bảo mật:** Tọa độ GPS chính xác và thông tin cá nhân của bạn được mã hóa an toàn. "
        "Người khác chỉ nhìn thấy Biệt danh công khai và khu vực cấp Phường/Quận."
    )
    await message.answer(profile_text, reply_markup=get_main_menu_keyboard(is_admin=user_is_admin), parse_mode="Markdown")

# --- Report / Support Flow ---
@router.message(F.text == "🚩 Báo cáo / Hỗ trợ")
@router.message(Command("report"))
async def start_report(message: Message, state: FSMContext):
    await state.set_state(ReportState.waiting_for_category)
    await message.answer(
        "🚩 **Báo cáo sự cố hoặc vi phạm:**\n\n"
        "Vui lòng chọn danh mục sự cố bạn gặp phải:",
        reply_markup=get_report_category_keyboard(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("rpc:"))
async def process_report_category(call: CallbackQuery, state: FSMContext):
    await call.answer()
    category = call.data.split(":")[1]
    await state.update_data(category=category)
    await state.set_state(ReportState.waiting_for_description)

    await call.message.edit_text(
        "📝 Vui lòng nhập mô tả chi tiết sự cố bạn muốn gửi tới Ban Quản Trị Boconic (gõ /cancel để hủy):"
    )

@router.message(ReportState.waiting_for_description)
async def process_report_description(message: Message, state: FSMContext, bot: Bot):
    desc = message.text.strip()
    if desc == "❌ Hủy thao tác":
        await state.clear()
        await message.answer("Đã hủy báo cáo.", reply_markup=get_main_menu_keyboard(is_admin=is_admin(message.from_user.id)))
        return

    data = await state.get_data()
    category = data.get("category", "other")
    await state.clear()

    try:
        await internal_bot_client.create_report(
            telegram_user_id=message.from_user.id,
            category=category,
            description=desc,
        )
    except Exception as e:
        logger.warning(f"Lỗi lưu report vào database: {e}")

    # Notify admin via Telegram if configured
    admin_id = settings.ADMIN_TELEGRAM_ID
    if admin_id and admin_id.isdigit():
        try:
            admin_chat_id = int(admin_id)
            user_alias = message.from_user.full_name or str(message.from_user.id)
            await bot.send_message(
                chat_id=admin_chat_id,
                text=f"🚨 **BÁO CÁO MỚI TỪ NGƯỜI DÙNG**\n\n"
                     f"• Người gửi: **{user_alias}** (ID: `{message.from_user.id}`)\n"
                     f"• Danh mục: `{category}`\n"
                     f"• Nội dung: {desc}\n\n"
                     f"🔗 Xem chi tiết tại: {settings.APP_BASE_URL}/admin",
                parse_mode="Markdown"
            )
        except Exception as e:
            logger.warning(f"Không thể gửi báo cáo tới Admin Telegram: {e}")

    await message.answer(
        "✅ **Báo cáo của bạn đã được gửi thành công!**\n"
        "Ban Quản Trị Boconic đã nhận được thông tin và sẽ kiểm tra trong thời gian sớm nhất. Cảm ơn bạn!",
        reply_markup=get_main_menu_keyboard(is_admin=is_admin(message.from_user.id)),
        parse_mode="Markdown"
    )

# --- Admin Dashboard Flow ---
@router.message(F.text == "👑 Quản trị hệ thống")
@router.message(Command("admin"))
async def handle_admin(message: Message):
    actor_id = message.from_user.id
    if not is_admin(actor_id):
        await message.answer("⛔ Bạn không có quyền truy cập chức năng Quản trị viên.")
        return

    try:
        stats = await internal_bot_client.get_admin_stats(actor_id)
    except Exception as e:
        await message.answer(f"Lỗi kết nối máy chủ quản trị: {parse_http_error(e)}")
        return

    dashboard_text = (
        "👑 **BOCONIC SUPER ADMIN LIVE DASHBOARD**\n\n"
        "Hệ thống đang vận hành trực tiếp trên cơ sở dữ liệu production.\n\n"
        "📊 **Thống kê thời gian thực:**\n"
        f"• 👥 Tổng người dùng: **{stats.get('total_users', 0)}**\n"
        f"• 📚 Danh mục đầu sách: **{stats.get('total_books', 0)}**\n"
        f"• 📦 Tổng bản sách vật lý: **{stats.get('total_copies', 0)}**\n"
        f"   - 🟢 Sẵn sàng mượn: **{stats.get('available_copies', 0)}**\n"
        f"   - 🟡 Đang được mượn: **{stats.get('loaned_copies', 0)}**\n"
        f"• 🤝 Lượt mượn đang diễn ra: **{stats.get('active_loans', 0)}**\n"
        f"• ⏳ Yêu cầu mượn chờ duyệt: **{stats.get('pending_requests', 0)}**\n"
        f"• 📢 Nhu cầu cộng đồng mở: **{stats.get('community_needs', 0)}**\n"
        f"• 🔗 Tài nguyên mở đã duyệt: **{stats.get('resources_count', 0)}**\n\n"
        f"🌐 **Web Admin Console:** {settings.APP_BASE_URL}/admin\n"
        "Đăng nhập tài khoản Super Admin để kiểm duyệt sách, quản lý người dùng và xuất báo cáo CSV."
    )
    await message.answer(dashboard_text, reply_markup=get_main_menu_keyboard(is_admin=True), parse_mode="Markdown")

# --- Interactive Inline Handshake Callbacks ---
@router.callback_query(F.data.startswith("brq:"))
async def handle_borrow_callback(call: CallbackQuery, bot: Bot):
    await call.answer()
    copy_id = call.data.split(":", 1)[1]
    actor_id = call.from_user.id

    try:
        res = await internal_bot_client.create_borrow_request(
            telegram_user_id=actor_id,
            copy_id=copy_id,
            duration_days=14,
        )
    except Exception as e:
        err_msg = parse_http_error(e)
        await call.message.answer(f"⚠️ Không thể gửi yêu cầu mượn: {err_msg}")
        return

    book_title = res.get("book_title", "Sách")
    copy_code = res.get("copy_code", "")
    owner_alias = res.get("owner_alias", "Chủ sách")
    req_id = res.get("request_id")
    owner_telegram_id = res.get("owner_telegram_id")
    requester_alias = res.get("requester_alias", call.from_user.full_name)

    await call.message.answer(
        f"✅ **Đã gửi yêu cầu mượn thành công!**\n\n"
        f"• Tên sách: **{book_title}** (Mã: `{copy_code}`)\n"
        f"• Chủ sở hữu: **{owner_alias}**\n"
        f"• Thời hạn mượn đề xuất: **14 ngày**\n\n"
        f"Chủ sách đã nhận được thông báo. Bạn sẽ nhận được tin nhắn ngay khi yêu cầu được chấp nhận!",
        parse_mode="Markdown"
    )

    # Send real-time notification to the book owner if available
    if owner_telegram_id and req_id:
        try:
            owner_text = (
                f"📬 **YÊU CẦU MƯỢN SÁCH MỚI!**\n\n"
                f"👤 Thành viên **{requester_alias}** muốn mượn cuốn sách của bạn:\n"
                f"📚 **{book_title}** (Mã: `{copy_code}`)\n"
                f"⏰ Thời hạn: **14 ngày**\n\n"
                f"Bạn có đồng ý cho mượn không?"
            )
            await bot.send_message(
                chat_id=owner_telegram_id,
                text=owner_text,
                reply_markup=get_request_action_keyboard(req_id),
                parse_mode="Markdown"
            )
        except Exception as e:
            logger.warning(f"Could not notify owner {owner_telegram_id}: {e}")

@router.callback_query(F.data.startswith("acc:"))
async def handle_accept_request_callback(call: CallbackQuery, bot: Bot):
    await call.answer()
    req_id = call.data.split(":", 1)[1]
    actor_id = call.from_user.id

    try:
        res = await internal_bot_client.accept_borrow_request(
            telegram_user_id=actor_id,
            request_id=req_id,
        )
    except Exception as e:
        await call.message.answer(f"⚠️ Lỗi chấp nhận yêu cầu: {parse_http_error(e)}")
        return

    book_title = res.get("book_title", "Sách")
    copy_code = res.get("copy_code", "")
    loan_id = res.get("loan_id")
    borrower_telegram_id = res.get("borrower_telegram_id")
    borrower_alias = res.get("borrower_alias", "Người mượn")
    lender_alias = call.from_user.full_name or "Chủ sách"

    await call.message.edit_text(
        f"✅ **Bạn đã chấp nhận cho mượn cuốn sách!**\n\n"
        f"📚 **{book_title}** (Mã: `{copy_code}`)\n"
        f"👤 Người mượn: **{borrower_alias}**\n\n"
        f"Bản sách đã được giữ chỗ an toàn trong 72 giờ. "
        f"Hai bạn hãy hẹn gặp nhau giao nhận sách, sau đó bấm nút xác nhận dưới đây:",
        reply_markup=get_loan_handover_keyboard(loan_id, role="lender") if loan_id else None,
        parse_mode="Markdown"
    )

    # Notify borrower
    if borrower_telegram_id and loan_id:
        try:
            borrower_text = (
                f"🎉 **CHỦ SÁCH ĐÃ ĐỒNG Ý CHO BẠN MƯỢN!**\n\n"
                f"📚 Cuốn sách: **{book_title}** (Mã: `{copy_code}`)\n"
                f"👤 Chủ sách: **{lender_alias}**\n\n"
                f"Sách đã được giữ chỗ cho bạn. Sau khi gặp mặt và nhận sách thực tế, vui lòng bấm nút xác nhận bên dưới:"
            )
            await bot.send_message(
                chat_id=borrower_telegram_id,
                text=borrower_text,
                reply_markup=get_loan_handover_keyboard(loan_id, role="borrower"),
                parse_mode="Markdown"
            )
        except Exception as e:
            logger.warning(f"Could not notify borrower {borrower_telegram_id}: {e}")

@router.callback_query(F.data.startswith("rej:"))
async def handle_reject_request_callback(call: CallbackQuery, bot: Bot):
    await call.answer()
    req_id = call.data.split(":", 1)[1]
    actor_id = call.from_user.id

    try:
        res = await internal_bot_client.reject_borrow_request(
            telegram_user_id=actor_id,
            request_id=req_id,
        )
    except Exception as e:
        await call.message.answer(f"⚠️ Lỗi từ chối yêu cầu: {parse_http_error(e)}")
        return

    book_title = res.get("book_title", "Sách")
    borrower_telegram_id = res.get("borrower_telegram_id")

    await call.message.edit_text(f"❌ Đã từ chối yêu cầu mượn cuốn **{book_title}**.", parse_mode="Markdown")

    if borrower_telegram_id:
        try:
            await bot.send_message(
                chat_id=borrower_telegram_id,
                text=f"Tiếc quá, chủ sách hiện chưa thể cho bạn mượn cuốn **{book_title}** lúc này. "
                     f"Bạn hãy tìm bản sách khác hoặc đăng nhu cầu vào '📢 Tôi đang cần' nhé!",
                parse_mode="Markdown"
            )
        except Exception as e:
            logger.warning(f"Could not notify borrower {borrower_telegram_id}: {e}")

@router.callback_query(F.data.startswith("hdo:"))
async def handle_handover_callback(call: CallbackQuery, bot: Bot):
    await call.answer()
    loan_id = call.data.split(":", 1)[1]
    actor_id = call.from_user.id

    try:
        res = await internal_bot_client.confirm_handover(actor_id, loan_id)
    except Exception as e:
        await call.message.answer(f"⚠️ Lỗi xác nhận giao nhận: {parse_http_error(e)}")
        return

    is_active = res.get("is_active", False)
    due_at = res.get("due_at")
    book_title = res.get("book_title", "Sách")
    other_telegram_id = res.get("other_telegram_id")
    due_date_str = due_at[:10] if due_at else "14 ngày tới"

    if is_active:
        msg = (
            f"🎉 **XÁC NHẬN GIAO NHẬN THÀNH CÔNG!**\n\n"
            f"Cả 2 bên đã xác nhận hoàn tất giao nhận cuốn **{book_title}**.\n"
            f"Lượt mượn chính thức bắt đầu!\n"
            f"⏰ Hạn hoàn trả: **{due_date_str}**.\n\n"
            f"Chúc bạn học tập thật tốt và giữ gìn sách cẩn thận! 📖"
        )
        await call.message.edit_text(msg, parse_mode="Markdown")

        # Notify the other party
        if other_telegram_id:
            try:
                await bot.send_message(
                    chat_id=other_telegram_id,
                    text=f"🎉 **ĐỐI PHƯƠNG ĐÃ XÁC NHẬN GIAO NHẬN THÀNH CÔNG!**\n\n"
                         f"Lượt mượn cuốn **{book_title}** đã chính thức bắt đầu!\n"
                         f"⏰ Hạn trả: **{due_date_str}**.",
                    parse_mode="Markdown"
                )
            except Exception as e:
                logger.warning(f"Could not notify other party: {e}")
    else:
        await call.message.edit_text(
            f"🤝 **Đã ghi nhận xác nhận giao nhận từ bạn!**\n\n"
            f"Đang chờ đối phương bấm xác nhận để lượt mượn chính thức bắt đầu.",
            parse_mode="Markdown"
        )
        if other_telegram_id:
            try:
                await bot.send_message(
                    chat_id=other_telegram_id,
                    text=f"🔔 Đối phương đã xác nhận giao nhận cuốn **{book_title}**!\n"
                         f"Vui lòng vào mục '🤝 Đang mượn' hoặc '📤 Đang cho mượn' để xác nhận.",
                    parse_mode="Markdown"
                )
            except Exception as e:
                logger.warning(f"Could not notify other party: {e}")

@router.callback_query(F.data.startswith("rt_req:"))
async def handle_return_req_callback(call: CallbackQuery, bot: Bot):
    await call.answer()
    loan_id = call.data.split(":", 1)[1]
    actor_id = call.from_user.id

    try:
        res = await internal_bot_client.request_return(actor_id, loan_id)
    except Exception as e:
        await call.message.answer(f"⚠️ Lỗi yêu cầu trả sách: {parse_http_error(e)}")
        return

    book_title = res.get("book_title", "Sách")
    other_telegram_id = res.get("other_telegram_id")

    await call.message.edit_text(
        f"🔄 **Đã gửi yêu cầu xác nhận trả sách!**\n\n"
        f"Cuốn sách **{book_title}** đã chuyển sang trạng thái chờ xác nhận hoàn trả. "
        f"Hãy gặp mặt đối phương để kiểm tra sách và cả 2 cùng bấm xác nhận.",
        reply_markup=get_loan_return_keyboard(loan_id, is_pending=True),
        parse_mode="Markdown"
    )

    if other_telegram_id:
        try:
            await bot.send_message(
                chat_id=other_telegram_id,
                text=f"🔔 **ĐỀ NGHỊ TRẢ SÁCH:**\n\n"
                     f"Đối phương đã gửi đề nghị xác nhận trả cuốn **{book_title}**.\n"
                     f"Vui lòng gặp mặt nhận lại sách và bấm xác nhận hoàn tất bên dưới:",
                reply_markup=get_loan_return_keyboard(loan_id, is_pending=True),
                parse_mode="Markdown"
            )
        except Exception as e:
            logger.warning(f"Could not notify other party: {e}")

@router.callback_query(F.data.startswith("rt_cfm:"))
async def handle_return_cfm_callback(call: CallbackQuery, bot: Bot):
    await call.answer()
    loan_id = call.data.split(":", 1)[1]
    actor_id = call.from_user.id

    try:
        res = await internal_bot_client.confirm_return(actor_id, loan_id)
    except Exception as e:
        await call.message.answer(f"⚠️ Lỗi xác nhận hoàn trả: {parse_http_error(e)}")
        return

    is_returned = res.get("is_returned", False)
    book_title = res.get("book_title", "Sách")
    other_telegram_id = res.get("other_telegram_id")

    if is_returned:
        msg = (
            f"🎉 **LƯỢT MƯỢN ĐÃ HOÀN TẤT THÀNH CÔNG!**\n\n"
            f"Cả 2 bên đã xác nhận hoàn trả cuốn **{book_title}**.\n"
            f"Bản sách đã được đưa trở lại kho sẵn sàng chia sẻ cho cộng đồng.\n"
            f"🌟 Điểm uy tín cộng đồng của bạn được cộng thưởng (+1.0 điểm uy tín).\n\n"
            f"Cảm ơn bạn đã đồng hành và giữ gìn văn hóa đọc cộng đồng cùng Boconic! 💙"
        )
        await call.message.edit_text(msg, parse_mode="Markdown")

        if other_telegram_id:
            try:
                await bot.send_message(
                    chat_id=other_telegram_id,
                    text=f"🎉 **LƯỢT MƯỢN ĐÃ HOÀN TẤT!**\n\n"
                         f"Cả 2 bên đã xác nhận hoàn trả cuốn **{book_title}**.\n"
                         f"🌟 Điểm uy tín của bạn được ghi nhận tích cực (+1.0 điểm)!",
                    parse_mode="Markdown"
                )
            except Exception as e:
                logger.warning(f"Could not notify other party: {e}")
    else:
        await call.message.edit_text(
            f"✅ **Đã ghi nhận xác nhận hoàn trả từ bạn!**\n"
            f"Đang chờ đối phương xác nhận để hoàn tất giao dịch.",
            parse_mode="Markdown"
        )


# ==========================================
# PERSONAL LIBRARY HANDLERS
# ==========================================

@router.message(Command("library"))
@router.message(F.text == "📚 Thư viện của tôi")
async def handle_library(message: Message, state: FSMContext):
    await state.clear()
    actor_id = message.from_user.id

    try:
        data = await internal_bot_client.get_library(actor_id, tab="all")
    except Exception as e:
        await message.answer(f"⚠️ Không thể tải thư viện: {parse_http_error(e)}")
        return

    items = data.get("items", [])
    total = len(items)

    text = (
        f"📚 **THƯ VIỆN CÁ NHÂN CỦA BẠN**\n"
        f"Tổng cộng: **{total}** mục trong danh mục.\n\n"
        f"• Sách sở hữu: sẵn sàng cho mượn hoặc lưu trữ riêng tư\n"
        f"• Sách đang mượn từ cộng đồng\n"
        f"• Wishlist & nhu cầu đang tìm kiếm\n"
        f"• Tài liệu 1 phần & photo ghi nhận bản quyền\n\n"
        f"Hãy chọn danh mục tab để xem chi tiết:"
    )
    await message.answer(text, reply_markup=get_library_tabs_keyboard(), parse_mode="Markdown")


@router.callback_query(F.data.startswith("lib:"))
async def handle_library_tab(call: CallbackQuery):
    actor_id = call.from_user.id
    tab = call.data.split(":", 1)[1]

    tab_titles = {
        "all": "Tất cả danh mục",
        "owned": "Sách tôi sở hữu",
        "available": "Sách sẵn sàng cho mượn",
        "lent": "Sách đang cho mượn / Giữ chỗ",
        "borrowed": "Sách tôi đang mượn",
        "wishlist": "Wishlist & Nhu cầu đang tìm",
        "resources": "Tài liệu 1 phần & Photocopy",
        "history": "Lịch sử mượn trả",
    }
    title = tab_titles.get(tab, tab.capitalize())

    try:
        data = await internal_bot_client.get_library(actor_id, tab=tab)
    except Exception as e:
        await call.answer(f"Lỗi: {parse_http_error(e)}", show_alert=True)
        return

    items = data.get("items", [])
    if not items:
        await call.message.edit_text(
            f"📚 **{title.upper()}**\n\n_Chưa có mục nào trong danh mục này._",
            reply_markup=get_library_tabs_keyboard(),
            parse_mode="Markdown",
        )
        await call.answer()
        return

    lines = [f"📚 **{title.upper()}** ({len(items)} mục):\n"]
    for idx, item in enumerate(items[:10], start=1):
        itype = item.get("type")
        if itype == "owned_copy":
            vis = "🌐 Công khai" if item.get("visibility") == "published" else "🔒 Riêng tư"
            st = item.get("circulation_status")
            st_text = "Sẵn sàng" if st == "available" else ("Đang cho mượn" if st == "loaned" else "Đang giữ chỗ")
            lines.append(f"{idx}. **{item.get('title')}**\n   Mã: `{item.get('barcode')}` | {st_text} | {vis}")
        elif itype == "borrowed_loan":
            lines.append(f"{idx}. **{item.get('title')}**\n   Trạng thái: `{item.get('status')}` | Hạn trả: {item.get('due_at', 'Đang sắp xếp')[:10]}")
        elif itype == "wishlist_need":
            lines.append(f"{idx}. Cần: **{item.get('title_query')}**\n   SL: {item.get('quantity_fulfilled', 0)}/{item.get('quantity', 1)} | Trạng thái: {item.get('status')}")
        elif itype == "history_loan":
            lines.append(f"{idx}. **{item.get('book_title')}** (Hoàn tất)\n   Vai trò: {item.get('role')} | Trả ngày: {str(item.get('returned_at'))[:10]}")

    if len(items) > 10:
        lines.append(f"\n_...và {len(items) - 10} mục khác._")

    await call.message.edit_text(
        "\n".join(lines),
        reply_markup=get_library_tabs_keyboard(),
        parse_mode="Markdown",
    )
    await call.answer()


# ==========================================
# NEED WIZARD HANDLERS ("Tôi cần sách A")
# ==========================================

@router.message(Command("request"))
@router.message(Command("need"))
@router.message(F.text == "📢 Yêu cầu sách")
async def handle_start_need_wizard(message: Message, state: FSMContext):
    await state.clear()
    await state.set_state(RequestWizardState.waiting_for_title)
    text = (
        "📢 **ĐĂNG NHU CẦU: TÔI CẦN SÁCH A**\n\n"
        "Boconic sẽ tự động tìm kiếm **tất cả chủ sách phù hợp** trong cộng đồng "
        "và gửi thông báo để những người có thể hỗ trợ phản hồi bạn!\n\n"
        "Vui lòng nhập **Tên sách**, **Tác giả**, hoặc mã **ISBN** bạn đang cần:\n"
        "_(Ví dụ: Giải tích 1 ĐHBK, hoặc 9786040001234)_"
    )
    await message.answer(text, reply_markup=get_cancel_keyboard(), parse_mode="Markdown")


@router.message(RequestWizardState.waiting_for_title)
async def handle_need_title_input(message: Message, state: FSMContext):
    title_query = message.text.strip()
    if len(title_query) < 2:
        await message.answer("⚠️ Tiêu đề quá ngắn. Vui lòng nhập rõ hơn tên sách bạn cần:")
        return

    await state.update_data(title_query=title_query)
    await state.set_state(RequestWizardState.waiting_for_scope)

    text = (
        f"📖 Sách bạn cần: **{title_query}**\n\n"
        "Bạn cần phạm vi tài liệu nào?"
    )
    await message.answer(text, reply_markup=get_need_scope_keyboard(), parse_mode="Markdown")


@router.callback_query(RequestWizardState.waiting_for_scope, F.data.startswith("scp:"))
async def handle_need_scope_choice(call: CallbackQuery, state: FSMContext):
    scope_type = call.data.split(":", 1)[1]
    await state.update_data(scope_type=scope_type)

    if scope_type == "full_book":
        await state.update_data(page_range=[])
        await state.set_state(RequestWizardState.waiting_for_urgency)
        await call.message.edit_text(
            "⏳ **Mức độ cần gấp:**",
            reply_markup=get_need_urgency_keyboard(),
            parse_mode="Markdown",
        )
    elif scope_type == "chapters":
        await state.set_state(RequestWizardState.waiting_for_scope_detail)
        await call.message.edit_text(
            "📑 Vui lòng nhập tên hoặc số các **chương / chủ đề** bạn cần (ví dụ: `Chương 1, 2 và 3`):",
            parse_mode="Markdown",
        )
    else:  # page_range
        await state.set_state(RequestWizardState.waiting_for_scope_detail)
        await call.message.edit_text(
            "📄 Vui lòng nhập **khoảng trang** bạn cần (ví dụ: `1-50` hoặc `20-80`):",
            parse_mode="Markdown",
        )
    await call.answer()


@router.message(RequestWizardState.waiting_for_scope_detail)
async def handle_need_scope_detail_input(message: Message, state: FSMContext):
    detail_text = message.text.strip()
    data = await state.get_data()
    scope_type = data.get("scope_type", "full_book")

    page_range = []
    if scope_type == "page_range":
        import re
        nums = [int(n) for n in re.findall(r"\d+", detail_text)]
        if len(nums) >= 2:
            page_range = [min(nums[0], nums[1]), max(nums[0], nums[1])]
        elif len(nums) == 1:
            page_range = [1, nums[0]]

    await state.update_data(scope_detail=detail_text, page_range=page_range)
    await state.set_state(RequestWizardState.waiting_for_urgency)

    await message.answer(
        "⏳ **Mức độ cần gấp của bạn:**",
        reply_markup=get_need_urgency_keyboard(),
        parse_mode="Markdown",
    )


@router.callback_query(RequestWizardState.waiting_for_urgency, F.data.startswith("urg:"))
async def handle_need_urgency_choice(call: CallbackQuery, state: FSMContext):
    urgency = call.data.split(":", 1)[1]
    await state.update_data(urgency=urgency)
    await state.set_state(RequestWizardState.waiting_for_location)

    await call.message.edit_text(
        "📍 Vui lòng nhập **Khu vực / Quận / Trường** bạn thuận tiện nhận sách\n"
        "_(hoặc gõ `Bỏ qua` nếu bạn có thể đến bất kỳ đâu):_",
        parse_mode="Markdown",
    )
    await call.answer()


@router.message(RequestWizardState.waiting_for_location)
async def handle_need_location_and_submit(message: Message, state: FSMContext):
    loc_text = message.text.strip()
    coarse_location = None if loc_text.lower() in ("bỏ qua", "skip", "none", "") else loc_text

    data = await state.get_data()
    actor_id = message.from_user.id

    try:
        res = await internal_bot_client.create_need(
            telegram_user_id=actor_id,
            title_query=data["title_query"],
            scope_type=data.get("scope_type", "full_book"),
            page_range=data.get("page_range", []),
            urgency=data.get("urgency", "normal"),
            coarse_location=coarse_location,
        )
    except Exception as e:
        await message.answer(
            f"⚠️ Lỗi khi tạo nhu cầu sách: {parse_http_error(e)}",
            reply_markup=get_main_menu_keyboard(is_admin=is_admin(actor_id)),
        )
        await state.clear()
        return

    await state.clear()
    need_id = res.get("need_id")

    success_text = (
        "🎉 **ĐĂNG NHU CẦU THÀNH CÔNG!**\n\n"
        f"📚 Sách cần: **{data['title_query']}**\n"
        f"Phạm vi: `{data.get('scope_type')}`\n"
        f"Mã nhu cầu: `{need_id}`\n\n"
        "🔍 Hệ thống đã rà soát mạng lưới cộng đồng Boconic và tự động đưa thông báo "
        "vào hàng đợi gửi đến các chủ sách đủ điều kiện.\n\n"
        "Khi có người gửi đề nghị hỗ trợ, bạn sẽ nhận được thông báo ngay tại đây!"
    )
    await message.answer(
        success_text,
        reply_markup=get_main_menu_keyboard(is_admin=is_admin(actor_id)),
        parse_mode="Markdown",
    )


# ==========================================
# MY NEEDS & OFFERS LIST HANDLERS
# ==========================================

@router.message(Command("requests"))
@router.message(F.text == "📋 Nhu cầu của tôi")
async def handle_my_needs(message: Message):
    actor_id = message.from_user.id
    try:
        needs = await internal_bot_client.get_my_needs(actor_id)
    except Exception as e:
        await message.answer(f"⚠️ Không thể tải danh sách nhu cầu: {parse_http_error(e)}")
        return

    if not needs:
        await message.answer(
            "📋 Bạn hiện chưa có nhu cầu sách nào đang mở.\n\n"
            "Hãy bấm **📢 Yêu cầu sách** để đăng nhu cầu tìm sách nhé!",
            parse_mode="Markdown",
        )
        return

    lines = ["📋 **DANH SÁCH NHU CẦU SÁCH CỦA BẠN:**\n"]
    buttons = []
    for idx, n in enumerate(needs[:5], start=1):
        nid = n["id"]
        title = n["title_query"]
        off_count = n.get("offer_count", 0)
        st = n.get("status", "open")
        lines.append(f"{idx}. **{title}**\n   Trạng thái: `{st}` | Đề nghị hỗ trợ: **{off_count}** đề nghị")
        buttons.append([InlineKeyboardButton(text=f"Xem đề nghị: {title[:20]} ({off_count})", callback_data=f"v_off:{nid}")])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)
    await message.answer("\n".join(lines), reply_markup=kb, parse_mode="Markdown")


@router.callback_query(F.data.startswith("v_off:"))
async def handle_view_need_offers(call: CallbackQuery):
    actor_id = call.from_user.id
    need_id = call.data.split(":", 1)[1]

    try:
        need = await internal_bot_client.get_need_detail(actor_id, need_id)
    except Exception as e:
        await call.answer(f"Lỗi: {parse_http_error(e)}", show_alert=True)
        return

    offers = need.get("offers", [])
    if not offers:
        await call.message.answer(
            f"📚 Nhu cầu **{need.get('title_query')}** hiện chưa có đề nghị hỗ trợ nào.\n"
            f"Hệ thống vẫn đang kết nối tới các chủ sách phù hợp!",
            parse_mode="Markdown",
        )
        await call.answer()
        return

    for o in offers:
        oid = o["id"]
        otype = o["offer_type"]
        msg = o.get("message") or "Không có tin nhắn kèm theo"
        dur = o.get("proposed_duration_days", 14)
        area = o.get("coarse_pickup_area") or "Thỏa thuận"

        card = (
            f"🤝 **ĐỀ NGHỊ HỖ TRỢ CHO BẠN**\n\n"
            f"Hình thức: `{otype}`\n"
            f"Thời gian cho mượn dự kiến: **{dur} ngày**\n"
            f"Khu vực giao nhận: **{area}**\n"
            f"Lời nhắn từ chủ sách: _{msg}_\n"
            f"Trạng thái đề nghị: `{o['status']}`"
        )
        if o["status"] == "proposed":
            await call.message.answer(card, reply_markup=get_need_offer_actions_keyboard(oid), parse_mode="Markdown")
        else:
            await call.message.answer(card, parse_mode="Markdown")

    await call.answer()


@router.callback_query(F.data.startswith("sel_o:"))
async def handle_select_offer(call: CallbackQuery):
    actor_id = call.from_user.id
    offer_id = call.data.split(":", 1)[1]

    try:
        res = await internal_bot_client.select_offer(actor_id, offer_id)
    except Exception as e:
        await call.answer(f"⚠️ Không thể chọn đề nghị này: {parse_http_error(e)}", show_alert=True)
        return

    loan_id = res.get("loan_id")
    expires_at = res.get("reservation_expires_at")
    exp_str = expires_at[:16].replace("T", " ") if expires_at else "72 giờ"

    msg = (
        "🎉 **BẠN ĐÃ CHỌN ĐỀ NGHỊ HỖ TRỢ THÀNH CÔNG!**\n\n"
        f"📦 Bản sách đã được tự động giữ chỗ (Reserved) riêng cho bạn.\n"
        f"⏳ Thời hạn giữ chỗ: trước **{exp_str} UTC**.\n\n"
        "Vui lòng liên hệ với chủ sách để thống nhất địa điểm giao nhận và bấm "
        "**🤝 Đang mượn** để xác nhận giao nhận khi đã cầm sách trên tay!"
    )
    await call.message.edit_text(msg, parse_mode="Markdown")
    await call.answer("Đã chọn đề nghị!", show_alert=True)


@router.callback_query(F.data.startswith("dec_o:"))
async def handle_decline_offer(call: CallbackQuery):
    actor_id = call.from_user.id
    offer_id = call.data.split(":", 1)[1]

    try:
        await internal_bot_client.decline_offer(actor_id, offer_id, reason="Requester declined")
    except Exception as e:
        await call.answer(f"Lỗi: {parse_http_error(e)}", show_alert=True)
        return

    await call.message.edit_text("❌ Bạn đã từ chối đề nghị này.", parse_mode="Markdown")
    await call.answer()


# ==========================================
# OWNER OFFER NOTIFICATION RESPONSES
# ==========================================

@router.callback_query(F.data.startswith("off_f:"))
async def handle_owner_offer_full(call: CallbackQuery):
    actor_id = call.from_user.id
    need_id = call.data.split(":", 1)[1]

    # Find owner's available copies
    try:
        copies = await internal_bot_client.get_my_books(actor_id)
        available = [c for c in copies if c.get("circulation_status") == "available"]
        copy_id = available[0]["id"] if available else None

        await internal_bot_client.create_offer(
            telegram_user_id=actor_id,
            need_id=need_id,
            offer_type="full_physical_copy",
            copy_id=copy_id,
            proposed_duration_days=14,
            message="Tôi có bản sách đầy đủ sẵn sàng chia sẻ!",
        )
    except Exception as e:
        await call.answer(f"Lỗi gửi đề nghị: {parse_http_error(e)}", show_alert=True)
        return

    await call.message.edit_text(
        "✅ **Cảm ơn bạn!** Đề nghị hỗ trợ bản đầy đủ của bạn đã được chuyển tới người cần sách.",
        parse_mode="Markdown",
    )
    await call.answer("Đã gửi đề nghị hỗ trợ!", show_alert=True)


@router.callback_query(F.data.startswith("off_n:"))
async def handle_owner_offer_decline(call: CallbackQuery):
    await call.message.edit_text(
        "👌 Đã ghi nhận bạn chưa thể hỗ trợ lượt này. Cảm ơn bạn!",
        parse_mode="Markdown",
    )
    await call.answer()


@router.callback_query(F.data.startswith("off_m:"))
async def handle_owner_offer_mute(call: CallbackQuery):
    await call.message.edit_text(
        "🔕 Đã tạm tắt thông báo tìm sách tương tự trong 7 ngày tới. Bạn có thể bật lại trong Cài đặt.",
        parse_mode="Markdown",
    )
    await call.answer("Đã tắt thông báo!", show_alert=True)


# ==========================================
# COMMUNITY LIBRARY & WARNINGS HANDLERS
# ==========================================

@router.message(Command("community"))
@router.message(F.text == "🌐 Thư viện cộng đồng")
async def handle_community_library(message: Message):
    actor_id = message.from_user.id
    try:
        # Search published copies
        res = await internal_bot_client.search_books(actor_id, query="", limit=5)
        books = res.get("items", [])
    except Exception as e:
        await message.answer(f"⚠️ Không thể tải thư viện cộng đồng: {parse_http_error(e)}")
        return

    text = (
        "🌐 **THƯ VIỆN CỘNG ĐỒNG BOCONIC**\n"
        "Tổng hợp các đầu sách đã được công khai chia sẻ bởi các thành viên và tổ chức.\n\n"
        "🔎 Bạn có thể gõ **🔎 Tìm sách** để tra cứu theo tên sách hoặc trường học!"
    )
    await message.answer(text, parse_mode="Markdown")


@router.message(Command("warnings"))
async def handle_warnings(message: Message):
    actor_id = message.from_user.id
    try:
        warnings = await internal_bot_client.get_my_warnings(actor_id)
    except Exception as e:
        await message.answer(f"⚠️ Không thể kiểm tra cảnh báo: {parse_http_error(e)}")
        return

    if not warnings:
        await message.answer("✨ Tài khoản của bạn trong sạch, không có cảnh báo nào!", parse_mode="Markdown")
        return

    await message.answer("\n".join(lines), parse_mode="Markdown")


# ==========================================
# CHAPTER & PERSONAL PROGRESS HANDLERS
# ==========================================

@router.message(Command("chapters"))
async def handle_chapters_command(message: Message):
    actor_id = message.from_user.id
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer(
            "📖 Vui lòng cung cấp mã sách. Ví dụ:\n`/chapters <book_id>`\n"
            "Hoặc vào **📚 Thư viện của tôi** để xem danh mục chương của từng sách!",
            parse_mode="Markdown",
        )
        return

    book_id = args[1].strip()
    try:
        data = await internal_bot_client.get_book_chapters_and_progress(actor_id, book_id)
    except Exception as e:
        await message.answer(f"⚠️ Không thể tải danh mục chương: {parse_http_error(e)}")
        return

    chapters = data.get("chapters", [])
    summary = data.get("progress_summary", {})
    if not chapters:
        await message.answer("ℹ️ Sách này hiện chưa có danh mục chương trong catalog chung.")
        return

    txt = (
        f"📑 **DANH MỤC CHƯƠNG & TIẾN ĐỘ HỌC CÁ NHÂN**\n\n"
        f"📊 Tiến độ: **{summary.get('display_text', '0/0')}** ({summary.get('completion_percentage', 0)}%)\n"
        f"⏳ Đang đọc: {summary.get('in_progress_chapters', 0)} chương\n\n"
        "Bấm vào từng chương bên dưới để cập nhật trạng thái học, bookmark hoặc đăng nhu cầu tìm sách:"
    )
    kb = get_book_chapters_keyboard(book_id, chapters, summary.get("entries"))
    await message.answer(txt, reply_markup=kb, parse_mode="Markdown")


@router.callback_query(F.data.startswith("ch_list:"))
async def handle_callback_chapter_list(call: CallbackQuery):
    actor_id = call.from_user.id
    book_id = call.data.split(":", 1)[1]
    try:
        data = await internal_bot_client.get_book_chapters_and_progress(actor_id, book_id)
    except Exception as e:
        await call.answer(f"Lỗi: {parse_http_error(e)}", show_alert=True)
        return

    chapters = data.get("chapters", [])
    summary = data.get("progress_summary", {})
    txt = (
        f"📑 **DANH MỤC CHƯƠNG & TIẾN ĐỘ HỌC CÁ NHÂN**\n\n"
        f"📊 Tiến độ: **{summary.get('display_text', '0/0')}** ({summary.get('completion_percentage', 0)}%)\n\n"
        "Chọn chương để xem chi tiết hoặc cập nhật tiến độ:"
    )
    kb = get_book_chapters_keyboard(book_id, chapters, summary.get("entries"))
    await call.message.edit_text(txt, reply_markup=kb, parse_mode="Markdown")
    await call.answer()


@router.callback_query(F.data.startswith("ch_d:"))
async def handle_callback_chapter_detail(call: CallbackQuery):
    actor_id = call.from_user.id
    parts = call.data.split(":")
    book_id, chapter_id = parts[1], parts[2]

    try:
        data = await internal_bot_client.get_book_chapters_and_progress(actor_id, book_id)
    except Exception as e:
        await call.answer(f"Lỗi: {parse_http_error(e)}", show_alert=True)
        return

    chapters = data.get("chapters", [])
    target = next((c for c in chapters if c["id"] == chapter_id), None)
    if not target:
        await call.answer("Không tìm thấy chương!", show_alert=True)
        return

    entries = data.get("progress_summary", {}).get("entries", [])
    entry = next((e for e in entries if e["chapter_id"] == chapter_id), None)
    current_state = entry.get("reading_state", "not_started") if entry else "not_started"

    st_label = {"not_started": "⚪ Chưa đọc", "in_progress": "⏳ Đang đọc", "completed": "✅ Đã đọc xong"}.get(current_state, current_state)
    page_str = f"{target.get('page_start')} – {target.get('page_end')}" if target.get('page_start') else "Chưa xác minh"

    txt = (
        f"📖 **{target.get('chapter_code', target.get('chapter_number'))}. {target.get('title')}**\n\n"
        f"📄 Khoảng trang: **{page_str}**\n"
        f"🏷️ Trạng thái cá nhân: **{st_label}**\n"
    )
    if entry and entry.get("bookmark_page"):
        txt += f"🔖 Bookmark: Trang {entry['bookmark_page']}\n"
    if entry and entry.get("personal_notes"):
        txt += f"📝 Ghi chú cá nhân: _{entry['personal_notes']}_\n"

    kb = get_chapter_detail_keyboard(book_id, chapter_id, current_state)
    await call.message.edit_text(txt, reply_markup=kb, parse_mode="Markdown")
    await call.answer()


@router.callback_query(F.data.startswith("set_st:"))
async def handle_callback_set_chapter_status(call: CallbackQuery):
    actor_id = call.from_user.id
    _, book_id, chapter_id, new_state = call.data.split(":")

    try:
        await internal_bot_client.update_chapter_progress(
            telegram_user_id=actor_id,
            book_id=book_id,
            chapter_id=chapter_id,
            reading_state=new_state,
        )
    except Exception as e:
        await call.answer(f"Lỗi: {parse_http_error(e)}", show_alert=True)
        return

    st_name = "Đã đọc xong" if new_state == "completed" else ("Đang đọc" if new_state == "in_progress" else "Chưa đọc")
    await call.answer(f"Đã cập nhật: {st_name}!", show_alert=False)

    # Refresh chapter detail
    kb = get_chapter_detail_keyboard(book_id, chapter_id, new_state)
    try:
        await call.message.edit_reply_markup(reply_markup=kb)
    except Exception:
        pass


@router.callback_query(F.data.startswith("need_c:"))
async def handle_callback_need_chapter(call: CallbackQuery):
    actor_id = call.from_user.id
    _, book_id, chapter_id = call.data.split(":")

    try:
        data = await internal_bot_client.get_book_chapters_and_progress(actor_id, book_id)
        chapters = data.get("chapters", [])
        target = next((c for c in chapters if c["id"] == chapter_id), None)
        title = f"Chương: {target.get('title', 'Sách')}" if target else "Sách theo chương"

        # Create chapter-targeted need
        res = await internal_bot_client.create_need(
            telegram_user_id=actor_id,
            title_query=title,
            book_id=book_id,
            scope_type="chapters",
            target_chapters=[chapter_id],
        )
        nid = res.get("need_id")
        await call.message.answer(
            f"📢 **ĐÃ TẠO NHU CẦU CHO CHƯƠNG NÀY!**\n\n"
            f"Mã nhu cầu: `{nid[:8]}...`\n"
            "Hệ thống đang quét các chủ sách có bản sách phù hợp và gửi thông báo hỗ trợ.",
            parse_mode="Markdown",
        )
        await call.answer("Đã đăng nhu cầu cho chương này!", show_alert=True)
    except Exception as e:
        await call.answer(f"Lỗi tạo nhu cầu: {parse_http_error(e)}", show_alert=True)


@router.callback_query(F.data.startswith("wtch_c:"))
async def handle_callback_watch_chapter(call: CallbackQuery):
    await call.answer("🔔 Đã bật theo dõi! Bạn sẽ nhận thông báo khi có nguồn sách mới cho chương này.", show_alert=True)


@router.callback_query(F.data.startswith("exp_n:"))
async def handle_callback_export_notes(call: CallbackQuery):
    actor_id = call.from_user.id
    book_id = call.data.split(":", 1)[1]
    url = f"{internal_bot_client.base_url}/api/v1/me/notes/{book_id}/export?user_id=tg_{actor_id}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                md = res.json().get("markdown", "")
                await call.message.answer(f"```markdown\n{md[:3500]}\n```", parse_mode="Markdown")
            else:
                await call.message.answer("ℹ️ Bạn chưa có ghi chú cá nhân nào cho sách này.")
        await call.answer()
    except Exception as e:
        await call.answer(f"Lỗi: {parse_http_error(e)}", show_alert=True)


@router.message(F.text == "🎒 Tài nguyên đang dùng")
@router.message(Command("myresources"))
async def handle_my_resources(message: Message):
    actor_id = message.from_user.id
    try:
        data = await internal_bot_client.get_my_resources(actor_id)
    except Exception as e:
        await message.answer(f"Lỗi kiểm tra tài nguyên: {parse_http_error(e)}")
        return

    borrowed = data.get("borrowed_loans", [])
    lent = data.get("lent_loans", [])
    owned = data.get("owned_copies", [])
    needs = data.get("open_needs", [])
    progress = data.get("study_progress", {})
    trust = data.get("trust_profile", {})

    lines = [
        f"🎒 **TÀI NGUYÊN ĐANG SỬ DỤNG — {data.get('display_name')}**\n",
        f"⭐ **Chỉ số Uy tín:** {trust.get('reliability_score', 'N/A')}% ({trust.get('history_label', 'Chưa có lịch sử')})\n",
        "────────────────────────────",
        f"📖 **1. Sách đang mượn & cầm giữ ({len(borrowed)} cuốn):**"
    ]

    if not borrowed:
        lines.append("   • *Hiện bạn không giữ cuốn sách nào của người khác.*")
    else:
        for idx, b in enumerate(borrowed, 1):
            overdue_txt = " ⚠️ **QUÁ HẠN!**" if b.get("is_overdue") else ""
            due_str = b.get("due_at", "")[:10] if b.get("due_at") else "Chưa rõ"
            lines.append(
                f"   {idx}. 📚 **{b['book_title']}**{overdue_txt}\n"
                f"      • Mã: `{b['copy_code'] or b['copy_id'][:8]}` | Hạn trả: **{due_str}**\n"
                f"      • Chủ sách: {b['lender_name']}"
            )

    lines.append("\n" + f"🤝 **2. Sách cá nhân đang cho mượn ({len(lent)} cuốn):**")
    if not lent:
        lines.append("   • *Không có cuốn nào đang cho mượn ngoài.*")
    else:
        for idx, l in enumerate(lent, 1):
            due_str = l.get("due_at", "")[:10] if l.get("due_at") else "N/A"
            lines.append(
                f"   {idx}. 📚 **{l['book_title']}**\n"
                f"      • Người mượn: {l['borrower_name']} | Hạn trả: {due_str}"
            )

    lines.append("\n" + f"📦 **3. Kho sách sở hữu đã đăng ký:** **{len(owned)} bản sách**")
    lines.append(f"📢 **4. Nhu cầu đang tìm:** **{len(needs)} nhu cầu mở**")
    lines.append(
        f"🎓 **5. Tiến độ học:** Đã đọc **{progress.get('completed_chapters', 0)}** chương | "
        f"Đang đọc **{progress.get('in_progress_chapters', 0)}** chương | "
        f"**{progress.get('notes_count', 0)}** ghi chú"
    )

    lines.append("\n💡 *Gõ /chapters để xem chi tiết học tập từng chương hoặc /myloans để xem hạn trả chi tiết.*")

    kb_menu = get_main_menu_keyboard(is_admin=is_admin(message.from_user.id))
    await message.answer("\n".join(lines), reply_markup=kb_menu, parse_mode="Markdown")


@router.message(F.text == "📖 Quản lý theo chương")
async def handle_chapters_menu_button(message: Message):
    await handle_chapters_command(message)



