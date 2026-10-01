from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)

def get_main_menu_keyboard() -> ReplyKeyboardMarkup:
    """Main persistent reply keyboard grid."""
    keyboard = [
        [KeyboardButton(text="🔎 Tìm sách"), KeyboardButton(text="📖 Sách của tôi")],
        [KeyboardButton(text="🤝 Đang mượn"), KeyboardButton(text="📤 Đang cho mượn")],
        [KeyboardButton(text="📢 Tôi đang cần"), KeyboardButton(text="📍 Gần tôi")],
        [KeyboardButton(text="🏛 Thư viện & Trường học"), KeyboardButton(text="🔗 Tài nguyên mở")],
        [KeyboardButton(text="👤 Hồ sơ & Cài đặt")],
    ]
    return ReplyKeyboardMarkup(keyboard=keyboard, resize_keyboard=True)

def get_book_inline_keyboard(book_id: str, available_copies: list) -> InlineKeyboardMarkup:
    """Inline keyboard for a book: buttons to borrow available copies (callback < 64 bytes)."""
    buttons = []
    for c in available_copies[:3]:
        # Prefix: b_req:<copy_id[:16]> (fits safely in 64 bytes)
        cid_short = c["copy_id"].replace("-", "")[:16]
        code = c["public_code"]
        btn_text = f"Mượn bản {code} ({c['condition']})"
        buttons.append([InlineKeyboardButton(text=btn_text, callback_data=f"brq:{cid_short}")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_loan_handover_keyboard(loan_id: str, role: str) -> InlineKeyboardMarkup:
    """Action button to confirm physical handover."""
    lid_short = loan_id.replace("-", "")[:16]
    btn_text = "🤝 Xác nhận đã giao sách" if role == "lender" else "📦 Xác nhận đã nhận được sách"
    cb = f"hdo:{lid_short}"
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=btn_text, callback_data=cb)]])

def get_loan_return_keyboard(loan_id: str, is_pending: bool = False) -> InlineKeyboardMarkup:
    """Action buttons to request or confirm return."""
    lid_short = loan_id.replace("-", "")[:16]
    if not is_pending:
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔄 Đề nghị xác nhận trả sách", callback_data=f"rt_req:{lid_short}")]
        ])
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Xác nhận đã hoàn trả sách", callback_data=f"rt_cfm:{lid_short}")]
    ])
