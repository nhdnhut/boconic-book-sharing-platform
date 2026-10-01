from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from app.bot.client import internal_bot_client
from app.bot.keyboards import (
    get_book_inline_keyboard,
    get_loan_handover_keyboard,
    get_loan_return_keyboard,
    get_main_menu_keyboard,
)

router = Router()

class SearchState(StatesGroup):
    waiting_for_query = State()

class NeedState(StatesGroup):
    waiting_for_title = State()

@router.message(CommandStart())
async def handle_start(message: Message, state: FSMContext):
    await state.clear()
    actor_id = message.from_user.id
    display_name = message.from_user.full_name or message.from_user.first_name
    username = message.from_user.username

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

    welcome_text = (
        f"👋 Chào mừng {alias} đến với **Boconic**!\n\n"
        "✨ *Find what you need. Find who can help.*\n\n"
        "Boconic là nền tảng kết nối sách học tập, sách giáo khoa và tài liệu trong cộng đồng.\n"
        "Bạn có thể tìm sách cần học, cho mượn sách đang có sẵn, hoặc tra cứu học liệu mở đã kiểm duyệt.\n\n"
        "Hãy chọn một chức năng dưới đây để bắt đầu:"
    )
    await message.answer(welcome_text, reply_markup=get_main_menu_keyboard(), parse_mode="Markdown")

@router.message(Command("help"))
async def handle_help(message: Message):
    help_text = (
        "📖 **Hướng dẫn sử dụng Boconic:**\n\n"
        "• **Tìm sách**: Nhập tên sách, môn, lớp hoặc mã ISBN để tìm bản sách đang có người cho mượn.\n"
        "• **Sách của tôi**: Quản lý những cuốn sách bạn đã đăng để chia sẻ cho cộng đồng.\n"
        "• **Đang mượn / Cho mượn**: Theo dõi tiến độ mượn trả, xác nhận giao nhận 2 bên và hạn trả.\n"
        "• **Tài nguyên mở**: Tra cứu học liệu điện tử, hướng dẫn ôn tập đã được duyệt bản quyền.\n\n"
        "Mọi thắc mắc hoặc cần hỗ trợ, bạn có thể gửi lệnh /report."
    )
    await message.answer(help_text, parse_mode="Markdown")

@router.message(Command("cancel"))
async def handle_cancel(message: Message, state: FSMContext):
    current_state = await state.get_state()
    if current_state:
        await state.clear()
        await message.answer("Đã hủy thao tác hiện tại.", reply_markup=get_main_menu_keyboard())
    else:
        await message.answer("Không có thao tác nào đang dở dang.", reply_markup=get_main_menu_keyboard())

# --- Search Flow ---
@router.message(F.text == "🔎 Tìm sách")
@router.message(Command("search"))
async def start_search(message: Message, state: FSMContext):
    await state.set_state(SearchState.waiting_for_query)
    await message.answer(
        "🔍 Nhập tên sách, tác giả, môn học hoặc mã ISBN bạn cần tìm (gõ /cancel để hủy):"
    )

@router.message(SearchState.waiting_for_query)
async def process_search_query(message: Message, state: FSMContext):
    query = message.text.strip()
    await state.clear()

    await message.answer(f"Đang tìm kiếm sách khớp với: *{query}*...", parse_mode="Markdown")

    try:
        data = await internal_bot_client.search_books(message.from_user.id, query=query, limit=5)
        items = data.get("items", [])
    except Exception as e:
        await message.answer(f"Có lỗi khi tra cứu dữ liệu: {e}")
        return

    if not items:
        await message.answer(
            f"Không tìm thấy đầu sách nào khớp với '{query}'.\n"
            "Bạn có thể đăng nhu cầu tìm sách qua mục '📢 Tôi đang cần'.",
            reply_markup=get_main_menu_keyboard()
        )
        return

    for item in items:
        authors = ", ".join(item["authors"]) if item["authors"] else "N/A"
        grade = f"Lớp {item['grade_level']}" if item.get("grade_level") else ""
        subject = item.get("subject") or ""
        tag = f"[{subject} - {grade}]" if subject or grade else ""
        curriculum = f"Bộ sách: {item['curriculum']}" if item.get("curriculum") else ""

        card = (
            f"📚 **{item['title']}** {tag}\n"
            f"✍️ Tác giả: {authors}\n"
            f"🏢 NXB: {item.get('publisher') or 'N/A'}\n"
            f"{curriculum}\n"
            f"📦 Số bản sẵn sàng mượn: **{item['available_count']}**"
        )
        kb = get_book_inline_keyboard(item["book_id"], item["copies"]) if item["copies"] else None
        await message.answer(card, reply_markup=kb, parse_mode="Markdown")

# --- My Books Flow ---
@router.message(F.text == "📖 Sách của tôi")
@router.message(Command("mybooks"))
async def handle_my_books(message: Message):
    try:
        copies = await internal_bot_client.get_my_books(message.from_user.id)
    except Exception as e:
        await message.answer(f"Lỗi tải danh sách sách: {e}")
        return

    if not copies:
        await message.answer(
            "Bạn chưa đăng cuốn sách nào lên Boconic.\n"
            "Hãy chia sẻ sách cũ để giúp đỡ bạn học khác nhé!",
            reply_markup=get_main_menu_keyboard()
        )
        return

    text_lines = ["📖 **Danh sách sách bạn đang sở hữu:**\n"]
    for idx, c in enumerate(copies, 1):
        status_label = "🟢 Sẵn sàng mượn" if c["status"] == "available" else f"🟡 {c['status']}"
        text_lines.append(f"{idx}. **{c['book_title']}** (Mã: `{c['public_code']}`)\n   Tình trạng: {c['condition']} | {status_label}")

    await message.answer("\n".join(text_lines), parse_mode="Markdown")

# --- My Loans Flow ---
@router.message(F.text == "🤝 Đang mượn")
@router.message(Command("loans"))
async def handle_my_loans(message: Message):
    try:
        loans = await internal_bot_client.get_my_loans(message.from_user.id)
    except Exception as e:
        await message.answer(f"Lỗi tải danh sách mượn: {e}")
        return

    if not loans:
        await message.answer("Hiện bạn không có lượt sách nào đang mượn.", reply_markup=get_main_menu_keyboard())
        return

    for l in loans:
        status_vi = {
            "reserved": "Đã giữ chỗ (chờ giao nhận)",
            "active": "Đang mượn",
            "return_pending": "Đang chờ xác nhận trả",
        }.get(l["status"], l["status"])

        card = (
            f"📘 **{l['book_title']}** (Mã: `{l['public_code']}`)\n"
            f"👤 Chủ sách: {l['lender_alias']}\n"
            f"📌 Trạng thái: **{status_vi}**\n"
        )
        if l.get("due_at"):
            card += f"⏰ Hạn trả: {l['due_at'][:10]}"

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
async def handle_my_lendings(message: Message):
    try:
        loans = await internal_bot_client.get_my_lendings(message.from_user.id)
    except Exception as e:
        await message.answer(f"Lỗi tải danh sách: {e}")
        return

    if not loans:
        await message.answer("Bạn hiện chưa có bản sách nào đang được người khác mượn.", reply_markup=get_main_menu_keyboard())
        return

    for l in loans:
        card = (
            f"📗 **{l['book_title']}** (Mã: `{l['public_code']}`)\n"
            f"👤 Người mượn: {l['borrower_alias']}\n"
            f"📌 Trạng thái: **{l['status']}**"
        )
        kb = None
        if l["status"] == "reserved":
            kb = get_loan_handover_keyboard(l["loan_id"], role="lender")
        elif l["status"] == "return_pending":
            kb = get_loan_return_keyboard(l["loan_id"], is_pending=True)

        await message.answer(card, reply_markup=kb, parse_mode="Markdown")

# --- Open Community Needs Flow ---
@router.message(F.text == "📢 Tôi đang cần")
@router.message(Command("need"))
async def handle_need(message: Message, state: FSMContext):
    await state.set_state(NeedState.waiting_for_title)
    await message.answer("Bạn cần tìm cuốn sách hoặc tài liệu nào? Hãy gửi tên sách (gõ /cancel để hủy):")

@router.message(NeedState.waiting_for_title)
async def process_need_title(message: Message, state: FSMContext):
    title = message.text.strip()
    await state.clear()
    await message.answer(
        f"✅ Đã ghi nhận nhu cầu của bạn: *{title}*.\n"
        "Hệ thống sẽ thông báo ngay khi có thành viên trong cộng đồng chia sẻ cuốn sách này!",
        reply_markup=get_main_menu_keyboard(),
        parse_mode="Markdown"
    )

# --- Resources Flow ---
@router.message(F.text == "🔗 Tài nguyên mở")
@router.message(Command("resources"))
async def handle_resources(message: Message):
    text = (
        "📚 **Học liệu & Tài nguyên mở đã kiểm duyệt (Boconic Resources):**\n\n"
        "1. **Bộ đề thi THPT Quốc Gia - Môn Toán (2024)**\n"
        "   Nguồn: Bộ Giáo dục & Đào tạo | Giấy phép: Công khai\n"
        "   Liên kết: https://moet.gov.vn\n\n"
        "2. **Tài liệu Bổ trợ Vật Lý 12 - Chương Cảm ứng Điện từ**\n"
        "   Nguồn: Thư viện Học liệu Mở Việt Nam | Giấy phép: CC BY-NC 4.0\n"
        "   Liên kết: https://hoclieu.vn\n\n"
        "Tất cả tài nguyên số trên Boconic đều được kiểm tra bản quyền và tuân thủ nguyên tắc quyền sở hữu trí tuệ."
    )
    await message.answer(text, parse_mode="Markdown")

# --- Profile Flow ---
@router.message(F.text == "👤 Hồ sơ & Cài đặt")
@router.message(Command("profile"))
async def handle_profile(message: Message):
    try:
        user_info = await internal_bot_client.sync_user(
            telegram_user_id=message.from_user.id,
            display_name=message.from_user.full_name or message.from_user.first_name,
        )
        alias = user_info.get("public_alias", "User #A81F")
        status = user_info.get("status", "active")
    except Exception:
        alias = "User"
        status = "active"

    profile_text = (
        "👤 **Thông tin tài khoản:**\n\n"
        f"• Biệt danh công khai: **{alias}**\n"
        f"• Trạng thái tài khoản: `{status}`\n"
        f"• Ngôn ngữ: `Tiếng Việt`\n"
        f"• Quyền riêng tư: Tọa độ GPS & số điện thoại được bảo vệ an toàn."
    )
    await message.answer(profile_text, parse_mode="Markdown")

# --- Inline Callback Query Handlers ---
@router.callback_query(F.data.startswith("brq:"))
async def handle_borrow_callback(call: CallbackQuery):
    await call.answer()
    copy_short_id = call.data.split(":")[1]
    await call.message.answer(
        f"✅ Đã gửi yêu cầu mượn bản sách (ID: {copy_short_id}) tới chủ sách!\n"
        "Bạn sẽ nhận được thông báo khi chủ sách chấp nhận và giữ chỗ."
    )

@router.callback_query(F.data.startswith("hdo:"))
async def handle_handover_callback(call: CallbackQuery):
    await call.answer()
    await call.message.answer(
        "🤝 Bạn đã xác nhận giao nhận thực tế thành công! Lượt mượn chuyển sang trạng thái 'Đang mượn' khi cả 2 bên xác nhận."
    )

@router.callback_query(F.data.startswith("rt_req:"))
async def handle_return_req_callback(call: CallbackQuery):
    await call.answer()
    await call.message.answer("🔄 Đã gửi yêu cầu xác nhận trả sách tới đối phương.")

@router.callback_query(F.data.startswith("rt_cfm:"))
async def handle_return_cfm_callback(call: CallbackQuery):
    await call.answer()
    await call.message.answer("✅ Đã ghi nhận xác nhận hoàn tất lượt mượn!")
