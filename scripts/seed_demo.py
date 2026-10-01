import asyncio
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from sqlalchemy import select
from app.db.models.catalog import Author, Book, BookAuthor, BookCopy, Chapter
from app.db.models.community import CommunityRequest, Resource
from app.db.models.identity import User, UserLocation
from app.db.models.lending import BorrowRequest, Loan
from app.db.models.organization import Organization
from app.db.session import async_session_factory
from app.services.catalog import CatalogService
from app.services.lending import LendingService

async def seed_demo():
    print("==================================================")
    print("        BOCONIC DEMO DATA SEED GENERATOR          ")
    print("==================================================")

    async with async_session_factory() as db:
        # 1. Create Demo Users
        print("[1/5] Đang tạo người dùng demo (Actor A & Actor B)...")
        res_a = await db.execute(select(User).where(User.telegram_user_id == 100001))
        user_a = res_a.scalar_one_or_none()
        if not user_a:
            user_a = User(
                telegram_user_id=100001,
                display_name="Nguyễn Văn A (Demo)",
                public_alias="User #A81F",
                language_code="vi",
                status="active",
            )
            db.add(user_a)
            await db.flush()
            loc_a = UserLocation(
                user_id=user_a.id,
                city="TP. Hồ Chí Minh",
                district="Quận 10",
                neighborhood="Phường 14",
                precision_level="coarse",
            )
            db.add(loc_a)

        res_b = await db.execute(select(User).where(User.telegram_user_id == 100002))
        user_b = res_b.scalar_one_or_none()
        if not user_b:
            user_b = User(
                telegram_user_id=100002,
                display_name="Trần Thị B (Demo)",
                public_alias="User #B92C",
                language_code="vi",
                status="active",
            )
            db.add(user_b)
            await db.flush()
            loc_b = UserLocation(
                user_id=user_b.id,
                city="TP. Hồ Chí Minh",
                district="Quận 5",
                neighborhood="Phường 4",
                precision_level="coarse",
            )
            db.add(loc_b)

        await db.commit()

        # 2. Create Demo Organizations
        print("[2/5] Đang tạo các tổ chức thư viện & trường học demo...")
        res_org = await db.execute(select(Organization).where(Organization.name.like("%THPT Lê Hồng Phong%")))
        org = res_org.scalar_one_or_none()
        if not org:
            org = Organization(
                name="Thư viện Trường THPT Chuyên Lê Hồng Phong [DỮ LIỆU DEMO]",
                kind="school",
                city="TP. Hồ Chí Minh",
                district="Quận 5",
                public_address="235 Nguyễn Văn Cừ, Phường 4, Quận 5",
                verification_status="verified",
                verification_source="Sở Giáo dục & Đào tạo TP.HCM",
                inventory_policy="Ưu tiên phục vụ học sinh và giáo viên liên trường.",
            )
            db.add(org)
            await db.commit()

        # 3. Create Demo Books (Vietnam New Curriculum 2024)
        print("[3/5] Đang tạo danh mục sách giáo khoa lớp 12 chuẩn...")
        books_data = [
            {
                "title": "Toán 12 - Tập 1",
                "authors": ["Hà Huy Khoái", "Cung Thế Anh", "Trần Văn Tấn"],
                "publisher": "NXB Giáo dục Việt Nam",
                "publication_year": 2024,
                "edition_label": "Tái bản lần 1 (2024)",
                "subject": "Toán học",
                "grade_level": 12,
                "curriculum": "Kết nối tri thức",
                "isbn": "9786040388278",
                "description": "Sách giáo khoa Toán 12 theo chương trình GDPT 2018 bộ Kết nối tri thức với cuộc sống.",
                "chapters": [
                    (1, "Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số", 5, 42, ["dao_ham", "khao_sat_ham_so"]),
                    (2, "Toạ độ của vectơ trong không gian", 43, 76, ["vecto", "khong_gian"]),
                ],
            },
            {
                "title": "Vật lí 12",
                "authors": ["Trần Ngọc Hợi", "Nguyễn Văn Đạt"],
                "publisher": "NXB Giáo dục Việt Nam",
                "publication_year": 2024,
                "edition_label": "Xuất bản 2024",
                "subject": "Vật lý",
                "grade_level": 12,
                "curriculum": "Chân trời sáng tạo",
                "isbn": "9786040388285",
                "description": "Sách giáo khoa Vật lí 12 bộ Chân trời sáng tạo.",
                "chapters": [
                    (1, "Vật lí nhiệt", 6, 38, ["nhiet_hoc", "nhiet_do"]),
                    (2, "Khí lí tưởng", 39, 68, ["khi_li_tuong", "ap_suat"]),
                ],
            },
            {
                "title": "Hóa học 12",
                "authors": ["Lê Kim Long", "Đặng Xuân Thư"],
                "publisher": "NXB Đại học Sư phạm",
                "publication_year": 2024,
                "edition_label": "Xuất bản 2024",
                "subject": "Hóa học",
                "grade_level": 12,
                "curriculum": "Cánh Diều",
                "isbn": "9786040388292",
                "description": "Sách giáo khoa Hóa học 12 bộ Cánh Diều.",
                "chapters": [
                    (1, "Ester - Lipid. Xà phòng và chất giặt rửa", 5, 24, ["ester", "lipid"]),
                    (2, "Carbohydrate", 25, 48, ["glucose", "tinh_bot"]),
                ],
            },
        ]

        created_books = []
        for bd in books_data:
            b_check = await db.execute(select(Book).where(Book.isbn13 == bd["isbn"]))
            book = b_check.scalar_one_or_none()
            if not book:
                book = await CatalogService.create_book(
                    db=db,
                    title=bd["title"],
                    authors=bd["authors"],
                    publisher=bd["publisher"],
                    publication_year=bd["publication_year"],
                    edition_label=bd["edition_label"],
                    subject=bd["subject"],
                    grade_level=bd["grade_level"],
                    curriculum=bd["curriculum"],
                    isbn_raw=bd["isbn"],
                    description=bd["description"],
                )
                # Add chapters
                for ch_num, ch_title, p_start, p_end, ch_topics in bd["chapters"]:
                    chapter = Chapter(
                        book_id=book.id,
                        chapter_number=ch_num,
                        title=ch_title,
                        page_start=p_start,
                        page_end=p_end,
                        topics=ch_topics,
                        source="NXB",
                        verification_status="verified",
                    )
                    db.add(chapter)
                await db.commit()
            created_books.append(book)

        # 4. Create Physical Copies
        print("[4/5] Đang tạo các bản sách vật lý cho User A và User B...")
        for book in created_books:
            c_check = await db.execute(select(BookCopy).where(BookCopy.book_id == book.id))
            if not c_check.scalars().first():
                # Add copy for user A
                await CatalogService.add_book_copy(
                    db=db,
                    book_id=book.id,
                    owner_id=user_a.id,
                    condition="like_new",
                    maximum_loan_days=21,
                    lending_policy="free_return",
                    notes="Sách giữ cẩn thận, đã bọc bìa kiếng nylon.",
                )
                # Add copy for user B
                await CatalogService.add_book_copy(
                    db=db,
                    book_id=book.id,
                    owner_id=user_b.id,
                    condition="good",
                    maximum_loan_days=14,
                    lending_policy="free_return",
                    notes="Có ghi chú bút chì ở một số trang bài tập.",
                )
                await db.commit()

        # 5. Create Verified Digital Resources
        print("[5/5] Đang tạo tài nguyên số mở đã kiểm duyệt bản quyền...")
        res_check = await db.execute(select(Resource).where(Resource.title.like("%Đề tham khảo Tốt nghiệp THPT 2025%")))
        if not res_check.scalar_one_or_none():
            resource1 = Resource(
                title="Đề tham khảo Tốt nghiệp THPT 2025 - Môn Toán học [DỮ LIỆU DEMO]",
                resource_type="exam_sample",
                source_name="Bộ Giáo dục và Đào tạo",
                source_url="https://moet.gov.vn",
                license_name="Tài liệu Hành chính Công",
                rights_basis="Văn bản quy phạm và tài liệu chính thức công bố công khai của Nhà nước.",
                allowed_actions=["metadata", "link"],
                verification_status="verified",
                takedown_status="none",
            )
            db.add(resource1)

            resource2 = Resource(
                title="Sổ tay Kiến thức Trọng tâm Vật lí 12 [DỮ LIỆU DEMO]",
                resource_type="study_guide",
                source_name="Học Liệu Mở Cộng Đồng",
                source_url="https://hoclieu.vn/vat-li-12",
                license_name="Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)",
                license_url="https://creativecommons.org/licenses/by-nc/4.0/",
                rights_basis="Tác giả cấp phép tự do phi thương mại cho cộng đồng học sinh.",
                allowed_actions=["metadata", "link"],
                verification_status="verified",
                takedown_status="none",
            )
            db.add(resource2)
            await db.commit()

    print("\n==================================================")
    print("     DỮ LIỆU MẪU ĐÃ ĐƯỢC KHỞI TẠO THÀNH CÔNG!     ")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(seed_demo())
