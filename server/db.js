// server/db.js
// In-memory data store with comprehensive seed dataset for Boconic prototype.
// Provides transactional helpers and reset capabilities for automated testing.

export const schools = [
  {
    id: "sch_chuvanan",
    name: "THCS Chu Văn An",
    address: "Quận Tây Hồ, Hà Nội",
    pickupPoints: [
      { id: "pp_cva_1", name: "Bàn tiếp nhận Thư viện (Tầng 2 - Nhà A)", openHours: "07:30 - 17:00", coordinator: "Cô Thư viện Lan" },
      { id: "pp_cva_2", name: "Tủ sách chia sẻ - Phòng Giám thị (Tầng 1)", openHours: "07:00 - 17:30", coordinator: "Thầy Hùng Giám thị" },
      { id: "pp_cva_3", name: "Văn phòng Đoàn Đội (Khu thể chất)", openHours: "08:00 - 16:30", coordinator: "Thầy Tổng phụ trách" }
    ]
  },
  {
    id: "sch_leloi",
    name: "THCS Lê Lợi",
    address: "Quận Hoàn Kiếm, Hà Nội",
    pickupPoints: [
      { id: "pp_ll_1", name: "Tủ sách dùng chung - Thư viện Xanh (Tầng 1)", openHours: "07:30 - 16:30", coordinator: "Cô Thảo Thư viện" },
      { id: "pp_ll_2", name: "Văn phòng Hội đồng Sư phạm", openHours: "08:00 - 17:00", coordinator: "Thầy Phó Hiệu trưởng" }
    ]
  }
];

export const initialBooks = [
  {
    id: "bk_001",
    schoolId: "sch_chuvanan",
    pickupPointId: "pp_cva_1",
    pickupPointName: "Bàn tiếp nhận Thư viện (Tầng 2 - Nhà A)",
    title: "Toán 6 - Tập 1",
    grade: "Lớp 6",
    subject: "Toán",
    series: "Kết nối tri thức với cuộc sống",
    edition: "Tái bản 2024 (Chuẩn 2026-2027)",
    condition: "Còn mới 90%, có bọc nylon bảo vệ, không gạch xóa",
    lenderAlias: "Phụ huynh Khang (Cựu HS 6A1)",
    availableRanges: [
      { startDate: "2026-10-01", endDate: "2026-10-25" }
    ],
    status: "SẴN CÓ", // "SẴN CÓ" | "ĐÃ ĐẶT" | "ĐANG MƯỢN" | "ĐÃ TRẢ"
    currentLoanId: null,
    totalLoansCompleted: 3,
    createdAt: "2026-09-27T08:00:00Z"
  },
  {
    id: "bk_002",
    schoolId: "sch_chuvanan",
    pickupPointId: "pp_cva_2",
    pickupPointName: "Tủ sách chia sẻ - Phòng Giám thị (Tầng 1)",
    title: "Ngữ văn 6 - Tập 1",
    grade: "Lớp 6",
    subject: "Ngữ văn",
    series: "Kết nối tri thức với cuộc sống",
    edition: "Tái bản 2024",
    condition: "Tốt, gáy sách chắc chắn, đủ trang",
    lenderAlias: "Bạn Phương Thảo (Lớp 7B)",
    availableRanges: [
      { startDate: "2026-10-01", endDate: "2026-10-15" }
    ],
    status: "ĐANG MƯỢN",
    currentLoanId: "loan_demo_01",
    totalLoansCompleted: 2,
    createdAt: "2026-09-25T09:30:00Z"
  },
  {
    id: "bk_003",
    schoolId: "sch_chuvanan",
    pickupPointId: "pp_cva_1",
    pickupPointName: "Bàn tiếp nhận Thư viện (Tầng 2 - Nhà A)",
    title: "Khoa học tự nhiên 7",
    grade: "Lớp 7",
    subject: "Khoa học tự nhiên",
    series: "Cánh Diều",
    edition: "Tái bản 2024",
    condition: "Rất tốt, nguyên vẹn",
    lenderAlias: "Hội Phụ huynh Khối 8 tặng lại",
    availableRanges: [
      { startDate: "2026-10-01", endDate: "2026-10-30" }
    ],
    status: "SẴN CÓ",
    currentLoanId: null,
    totalLoansCompleted: 1,
    createdAt: "2026-09-28T14:15:00Z"
  },
  {
    id: "bk_004",
    schoolId: "sch_chuvanan",
    pickupPointId: "pp_cva_1",
    pickupPointName: "Bàn tiếp nhận Thư viện (Tầng 2 - Nhà A)",
    title: "Lịch sử và Địa lí 8",
    grade: "Lớp 8",
    subject: "Lịch sử và Địa lí",
    series: "Chân trời sáng tạo",
    edition: "Năm học 2024-2025",
    condition: "Tốt, mép bìa hơi sờn nhẹ nhưng trang nguyên vẹn",
    lenderAlias: "Học sinh Minh Trí (8A4)",
    availableRanges: [
      { startDate: "2026-10-02", endDate: "2026-10-20" }
    ],
    status: "SẴN CÓ",
    currentLoanId: null,
    totalLoansCompleted: 0,
    createdAt: "2026-09-29T10:00:00Z"
  },
  {
    id: "bk_005",
    schoolId: "sch_leloi",
    pickupPointId: "pp_ll_1",
    pickupPointName: "Tủ sách dùng chung - Thư viện Xanh (Tầng 1)",
    title: "Toán 6 - Tập 1",
    grade: "Lớp 6",
    subject: "Toán",
    series: "Chân trời sáng tạo",
    edition: "Tái bản 2024",
    condition: "Đã bọc decal trong suốt, sạch sẽ",
    lenderAlias: "Cô giáo Thu Hà (Tổ Toán)",
    availableRanges: [
      { startDate: "2026-10-01", endDate: "2026-10-18" }
    ],
    status: "SẴN CÓ",
    currentLoanId: null,
    totalLoansCompleted: 4,
    createdAt: "2026-09-26T11:00:00Z"
  },
  {
    id: "bk_006",
    schoolId: "sch_leloi",
    pickupPointId: "pp_ll_1",
    pickupPointName: "Tủ sách dùng chung - Thư viện Xanh (Tầng 1)",
    title: "Tiếng Anh 7 (Global Success)",
    grade: "Lớp 7",
    subject: "Tiếng Anh",
    series: "Kết nối tri thức với cuộc sống",
    edition: "Bản chuẩn 2024",
    condition: "Tốt, không ghi lời giải vào sách",
    lenderAlias: "CLB Sách Khăn Quàng Đỏ",
    availableRanges: [
      { startDate: "2026-10-01", endDate: "2026-10-22" }
    ],
    status: "SẴN CÓ",
    currentLoanId: null,
    totalLoansCompleted: 2,
    createdAt: "2026-09-28T09:00:00Z"
  }
];

// High-demand scenario: Multiple students waiting for the SAME book (bk_001: Toán 6 Tập 1 KNTT)
export const initialRequests = [
  {
    id: "req_001",
    schoolId: "sch_chuvanan",
    studentAlias: "Học sinh Nam (6A3)",
    grade: "Lớp 6",
    subject: "Toán",
    series: "Kết nối tri thức với cuộc sống",
    editionNeeded: "Bản 2024 hoặc mới hơn",
    startDate: "2026-10-02",
    endDate: "2026-10-06",
    hasClassOn: ["2026-10-03", "2026-10-05"], // Urgent: class tomorrow!
    hasDigitalAccess: false, // Critical equity: No computer/smartphone at home
    reason: "Gia đình chưa kịp mua sách, nhà không có máy tính tra cứu học liệu số",
    status: "CHỜ GHÉP", // "CHỜ GHÉP" | "ĐÃ GHÉP" | "ĐÃ HOÀN TẤT" | "ĐÃ HỦY"
    createdAt: "2026-09-29T08:00:00Z",
    allocatedBookId: null
  },
  {
    id: "req_002",
    schoolId: "sch_chuvanan",
    studentAlias: "Học sinh Hoàng (6A2)",
    grade: "Lớp 6",
    subject: "Toán",
    series: "Kết nối tri thức với cuộc sống",
    editionNeeded: "Bản 2024",
    startDate: "2026-10-02",
    endDate: "2026-10-07",
    hasClassOn: ["2026-10-06"], // Class in 4 days
    hasDigitalAccess: true, // Has tablet/PC to read taphuan.nxbgd.vn
    reason: "Hiệu sách gần nhà hết hàng, đang đặt giao về",
    status: "CHỜ GHÉP",
    createdAt: "2026-09-29T06:00:00Z", // Registered 2 hours earlier (in FIFO, this would take precedence)
    allocatedBookId: null
  },
  {
    id: "req_003",
    schoolId: "sch_chuvanan",
    studentAlias: "Học sinh Linh (6A1)",
    grade: "Lớp 6",
    subject: "Toán",
    series: "Kết nối tri thức với cuộc sống",
    editionNeeded: "Bản 2024",
    startDate: "2026-10-07",
    endDate: "2026-10-12",
    hasClassOn: ["2026-10-08", "2026-10-10"],
    hasDigitalAccess: false,
    reason: "Chờ nhà trường phát trợ cấp sách giáo khoa đợt 2",
    status: "CHỜ GHÉP",
    createdAt: "2026-09-28T15:00:00Z",
    allocatedBookId: null
  },
  {
    id: "req_004",
    schoolId: "sch_chuvanan",
    studentAlias: "Học sinh Tuấn (7A4)",
    grade: "Lớp 7",
    subject: "Khoa học tự nhiên",
    series: "Cánh Diều",
    editionNeeded: "Bất kỳ",
    startDate: "2026-10-03",
    endDate: "2026-10-08",
    hasClassOn: ["2026-10-04", "2026-10-07"],
    hasDigitalAccess: true,
    reason: "Quên sách ở quê khi về thăm ông bà",
    status: "CHỜ GHÉP",
    createdAt: "2026-09-29T09:00:00Z",
    allocatedBookId: null
  },
  {
    id: "req_005",
    schoolId: "sch_leloi",
    studentAlias: "Học sinh Mai (7B2)",
    grade: "Lớp 7",
    subject: "Tiếng Anh",
    series: "Kết nối tri thức với cuộc sống",
    editionNeeded: "Global Success 2024",
    startDate: "2026-10-02",
    endDate: "2026-10-06",
    hasClassOn: ["2026-10-03"],
    hasDigitalAccess: false,
    reason: "Đang chờ gửi sách từ tỉnh lên",
    status: "CHỜ GHÉP",
    createdAt: "2026-09-29T10:30:00Z",
    allocatedBookId: null
  }
];

export const initialLoans = [
  {
    id: "loan_demo_01",
    bookId: "bk_002",
    requestId: "req_demo_prev",
    schoolId: "sch_chuvanan",
    pickupPointName: "Tủ sách chia sẻ - Phòng Giám thị (Tầng 1)",
    borrowerAlias: "Học sinh Đức (6B1)",
    bookTitle: "Ngữ văn 6 - Tập 1",
    startDate: "2026-09-26",
    endDate: "2026-09-30",
    status: "ĐANG MƯỢN", // "ĐÃ ĐẶT" -> "ĐANG MƯỢN" -> "ĐÃ TRẢ" | "QUÁ HẠN" | "ĐÃ HỦY"
    checkinCode: "BC-9421",
    actualPickupAt: "2026-09-26T08:15:00Z",
    actualReturnAt: null,
    notes: "Đã nhận sách đúng hẹn tại phòng Giám thị."
  },
  {
    id: "loan_demo_02",
    bookId: "bk_001",
    requestId: "req_demo_past",
    schoolId: "sch_chuvanan",
    pickupPointName: "Bàn tiếp nhận Thư viện (Tầng 2 - Nhà A)",
    borrowerAlias: "Học sinh Quỳnh (6A5)",
    bookTitle: "Toán 6 - Tập 1",
    startDate: "2026-09-20",
    endDate: "2026-09-24",
    status: "ĐÃ TRẢ",
    checkinCode: "BC-1108",
    actualPickupAt: "2026-09-20T09:00:00Z",
    actualReturnAt: "2026-09-24T15:30:00Z",
    notes: "Sách được hoàn trả sạch đẹp, nguyên vẹn."
  }
];

// Official external learning materials - ONLY links & metadata, strictly NO stored PDFs or scanned pages!
export const initialLearningMaterials = [
  {
    id: "mat_001",
    title: "Sách giáo khoa Toán 6 (Tập 1 & 2) - NXB Giáo dục Việt Nam (Tập huấn giáo viên & học liệu mở)",
    grade: "Lớp 6",
    subject: "Toán",
    series: "Kết nối tri thức với cuộc sống",
    provider: "Nhà xuất bản Giáo dục Việt Nam (NXB GDVN)",
    officialUrl: "https://taphuan.nxbgd.vn/",
    accessType: "Đọc trực tuyến chính thức từ NXB",
    verifiedDate: "2026-09-25",
    isActive: true,
    topics: ["số tự nhiên", "phân số", "số thập phân", "hình học trực quan", "toán 6"],
    description: "Kênh đọc trực tuyến các bộ SGK và học liệu bổ trợ phục vụ tập huấn và học tập do NXB GDVN vận hành chính thức.",
    copyrightNotice: "Bản quyền thuộc NXB Giáo dục Việt Nam. Boconic chỉ dẫn liên kết, mở trực tiếp tại taphuan.nxbgd.vn."
  },
  {
    id: "mat_002",
    title: "Thông báo về việc sử dụng SGK năm học 2026–2027 & Phiên bản chỉnh lý",
    grade: "Toàn cấp",
    subject: "Tất cả",
    series: "Kết nối tri thức với cuộc sống",
    provider: "Nhà xuất bản Giáo dục Việt Nam",
    officialUrl: "https://nxbgd.vn/bai-viet/nha-xuat-ban-giao-duc-viet-nam-thong-bao-ve-viec-su-dung-sach-giao-khoa-nam-hoc-2026-2027",
    accessType: "Văn bản hướng dẫn & Tra cứu phiên bản",
    verifiedDate: "2026-09-26",
    isActive: true,
    topics: ["phiên bản 2026-2027", "danh mục sách", "chỉnh lý", "quy định"],
    description: "Thông báo chính thức của NXB GDVN làm rõ tính kế thừa và quy định sử dụng SGK cho năm học 2026-2027.",
    copyrightNotice: "Văn bản công khai từ Cổng thông tin điện tử nxbgd.vn."
  },
  {
    id: "mat_003",
    title: "Cổng học liệu số Cánh Diều - Sách điện tử và Video bài giảng bổ trợ",
    grade: "Lớp 6, Lớp 7, Lớp 8",
    subject: "Toán, Khoa học tự nhiên, Ngữ văn",
    series: "Cánh Diều",
    provider: "Công ty Cổ phần Đầu tư Xuất bản - Thiết bị giáo dục Việt Nam (VEPIC)",
    officialUrl: "https://hoc10.vn/",
    accessType: "Học liệu số trực tuyến được ủy quyền",
    verifiedDate: "2026-09-24",
    isActive: true,
    topics: ["cánh diều", "khoa học tự nhiên 7", "toán 6", "video bài giảng"],
    description: "Hệ sinh thái học liệu số chính thức cho bộ sách Cánh Diều, xem trước bài học và phiếu bài tập trực tuyến.",
    copyrightNotice: "Bản quyền thuộc đơn vị xuất bản VEPIC."
  },
  {
    id: "mat_004",
    title: "Chuyên đề: Ôn tập và Thực hành Phân số - Toán 6 (Tổ chuyên môn Toán THCS biên soạn)",
    grade: "Lớp 6",
    subject: "Toán",
    series: "Dùng chung cho các bộ sách",
    provider: "Tổ chuyên môn Toán cụm trường Quận Tây Hồ",
    officialUrl: "https://violet.vn/",
    accessType: "Tài liệu mở của giáo viên (Creative Commons)",
    verifiedDate: "2026-09-27",
    isActive: true,
    topics: ["phân số", "quy đồng", "rút gọn", "toán 6", "phiếu ôn tập"],
    description: "Tóm tắt lý thuyết cốt lõi và bài tập rèn luyện dạng phiếu mở, giúp học sinh chưa có SGK vẫn theo kịp tiết học.",
    copyrightNotice: "Tài liệu giáo viên tự nguyện chia sẻ theo giấy phép học tập mở."
  },
  {
    id: "mat_005",
    title: "Cổng thông tin Điện tử Bộ Giáo dục và Đào tạo - Chương trình GDPT 2018",
    grade: "Toàn cấp",
    subject: "Khung chương trình",
    series: "Khung chuẩn",
    provider: "Bộ Giáo dục và Đào tạo",
    officialUrl: "https://moet.gov.vn/",
    accessType: "Cổng thông tin cơ quan quản lý",
    verifiedDate: "2026-09-20",
    isActive: true,
    topics: ["chương trình 2018", "chuẩn kiến thức", "kế hoạch dạy học"],
    description: "Quy định chuẩn đầu ra và yêu cầu cần đạt từng môn học của Bộ GD&ĐT.",
    copyrightNotice: "Thông tin chỉ đạo chính thức của Bộ GD&ĐT."
  }
];

// Moderation Log / Risk Queue for flagged uploads and suspicious links
export const initialRiskQueue = [
  {
    id: "risk_001",
    type: "BLOCKED_FILE_UPLOAD",
    target: "Sach_Toan_6_Tap_1_Scan_Full.pdf",
    submittedBy: "Tài khoản khách (IP nội bộ trường)",
    flagReason: "Phát hiện tệp định dạng PDF chứa từ khóa 'Scan Full'. Boconic nghiêm cấm tải lên và lưu trữ bản quét sách giáo khoa.",
    aiConfidence: 0.99,
    status: "CHẶN TỰ ĐỘNG",
    timestamp: "2026-09-28T16:20:00Z"
  },
  {
    id: "risk_002",
    type: "SUSPICIOUS_URL",
    target: "https://mega.nz/folder/book-leak-toan6-kntt",
    submittedBy: "Quản trị viên cộng tác",
    flagReason: "Tên miền lưu trữ chia sẻ tệp cá nhân không rõ nguồn gốc pháp lý, có nguy cơ vi phạm bản quyền.",
    aiConfidence: 0.94,
    status: "ĐANG CHỜ DUYỆT",
    timestamp: "2026-09-29T07:45:00Z"
  }
];

// In-memory Database state
export class Database {
  constructor() {
    this.reset();
  }

  reset() {
    this.schools = JSON.parse(JSON.stringify(schools));
    this.books = JSON.parse(JSON.stringify(initialBooks));
    this.requests = JSON.parse(JSON.stringify(initialRequests));
    this.loans = JSON.parse(JSON.stringify(initialLoans));
    this.materials = JSON.parse(JSON.stringify(initialLearningMaterials));
    this.riskQueue = JSON.parse(JSON.stringify(initialRiskQueue));
  }

  // --- Books ---
  getBooks(filter = {}) {
    return this.books.filter(b => {
      if (filter.schoolId && b.schoolId !== filter.schoolId) return false;
      if (filter.grade && b.grade !== filter.grade) return false;
      if (filter.subject && b.subject !== filter.subject) return false;
      if (filter.series && b.series !== filter.series) return false;
      if (filter.status && b.status !== filter.status) return false;
      return true;
    });
  }

  getBookById(id) {
    return this.books.find(b => b.id === id);
  }

  addBook(bookData) {
    const newBook = {
      id: "bk_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      ...bookData,
      status: "SẴN CÓ",
      currentLoanId: null,
      totalLoansCompleted: 0,
      createdAt: new Date().toISOString()
    };
    this.books.unshift(newBook);
    return newBook;
  }

  updateBook(id, updateData) {
    const book = this.getBookById(id);
    if (!book) return null;
    Object.assign(book, updateData);
    return book;
  }

  // --- Requests ---
  getRequests(filter = {}) {
    return this.requests.filter(r => {
      if (filter.schoolId && r.schoolId !== filter.schoolId) return false;
      if (filter.grade && r.grade !== filter.grade) return false;
      if (filter.subject && r.subject !== filter.subject) return false;
      if (filter.status && r.status !== filter.status) return false;
      return true;
    });
  }

  getRequestById(id) {
    return this.requests.find(r => r.id === id);
  }

  addRequest(reqData) {
    const newReq = {
      id: "req_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      ...reqData,
      status: "CHỜ GHÉP",
      createdAt: new Date().toISOString(),
      allocatedBookId: null
    };
    this.requests.unshift(newReq);
    return newReq;
  }

  updateRequest(id, updateData) {
    const req = this.getRequestById(id);
    if (!req) return null;
    Object.assign(req, updateData);
    return req;
  }

  // --- Loans ---
  getLoans(filter = {}) {
    return this.loans.filter(l => {
      if (filter.schoolId && l.schoolId !== filter.schoolId) return false;
      if (filter.bookId && l.bookId !== filter.bookId) return false;
      if (filter.status && l.status !== filter.status) return false;
      return true;
    });
  }

  getLoanById(id) {
    return this.loans.find(l => l.id === id);
  }

  // Check if dates overlap: [startA, endA] and [startB, endB]
  static isDateOverlap(startA, endA, startB, endB) {
    const sA = new Date(startA).getTime();
    const eA = new Date(endA).getTime();
    const sB = new Date(startB).getTime();
    const eB = new Date(endB).getTime();
    return !(eA < sB || sA > eB);
  }

  // Create a loan with strict concurrency protection
  createLoan({ bookId, requestId, schoolId, pickupPointName, borrowerAlias, startDate, endDate, notes = "" }) {
    const book = this.getBookById(bookId);
    if (!book) throw new Error("Không tìm thấy sách chỉ định.");

    // Check active / scheduled loans on this book for overlap
    const existingLoans = this.loans.filter(l => 
      l.bookId === bookId && 
      (l.status === "ĐÃ ĐẶT" || l.status === "ĐANG MƯỢN")
    );

    const hasOverlap = existingLoans.some(l => 
      Database.isDateOverlap(startDate, endDate, l.startDate, l.endDate)
    );

    if (hasOverlap) {
      throw new Error(`Khoảng thời gian mượn (${startDate} đến ${endDate}) bị trùng lặp với lượt mượn đã được đặt trước trên cuốn sách này.`);
    }

    // Verify requested range fits into at least one of the book's availableRanges
    if (book.availableRanges && book.availableRanges.length > 0) {
      const fitsAny = book.availableRanges.some(rng => {
        const rStart = new Date(rng.startDate).getTime();
        const rEnd = new Date(rng.endDate).getTime();
        const qStart = new Date(startDate).getTime();
        const qEnd = new Date(endDate).getTime();
        return qStart >= rStart && qEnd <= rEnd;
      });
      if (!fitsAny) {
        throw new Error(`Khoảng thời gian yêu cầu nằm ngoài các khoảng ngày người cho mượn có thể chia sẻ.`);
      }
    }

    const newLoan = {
      id: "loan_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      bookId,
      requestId: requestId || null,
      schoolId: schoolId || book.schoolId,
      pickupPointName: pickupPointName || book.pickupPointName,
      borrowerAlias: borrowerAlias || "Học sinh ẩn danh",
      bookTitle: book.title,
      startDate,
      endDate,
      status: "ĐÃ ĐẶT",
      checkinCode: "BC-" + Math.floor(1000 + Math.random() * 9000),
      actualPickupAt: null,
      actualReturnAt: null,
      notes: notes || "Đặt lịch thành công qua Boconic",
      createdAt: new Date().toISOString()
    };

    this.loans.unshift(newLoan);

    // Update book status
    book.status = "ĐÃ ĐẶT";
    book.currentLoanId = newLoan.id;

    // Update demand request if provided
    if (requestId) {
      const req = this.getRequestById(requestId);
      if (req) {
        req.status = "ĐÃ GHÉP";
        req.allocatedBookId = bookId;
      }
    }

    return newLoan;
  }

  // Transition Loan States: "ĐÃ ĐẶT" -> "ĐANG MƯỢN" -> "ĐÃ TRẢ" | "QUÁ HẠN" | "ĐÃ HỦY"
  transitionLoan(loanId, action, notes = "") {
    const loan = this.getLoanById(loanId);
    if (!loan) throw new Error("Không tìm thấy thông tin lượt mượn.");

    const book = this.getBookById(loan.bookId);

    switch (action) {
      case "PICKUP": // Xác nhận đã nhận sách tại trường
        if (loan.status !== "ĐÃ ĐẶT") {
          throw new Error(`Không thể chuyển sang ĐANG MƯỢN từ trạng thái '${loan.status}'`);
        }
        loan.status = "ĐANG MƯỢN";
        loan.actualPickupAt = new Date().toISOString();
        if (notes) loan.notes += ` | Giao nhận: ${notes}`;
        if (book) {
          book.status = "ĐANG MƯỢN";
        }
        break;

      case "RETURN": // Xác nhận đã trả sách
        if (loan.status !== "ĐANG MƯỢN" && loan.status !== "QUÁ HẠN") {
          throw new Error(`Không thể hoàn tất trả sách từ trạng thái '${loan.status}'`);
        }
        loan.status = "ĐÃ TRẢ";
        loan.actualReturnAt = new Date().toISOString();
        if (notes) loan.notes += ` | Hoàn trả: ${notes}`;
        if (book) {
          book.status = "SẴN CÓ";
          book.currentLoanId = null;
          book.totalLoansCompleted = (book.totalLoansCompleted || 0) + 1;
        }
        if (loan.requestId) {
          const req = this.getRequestById(loan.requestId);
          if (req) req.status = "ĐÃ HOÀN TẤT";
        }
        break;

      case "OVERDUE": // Đánh dấu quá hạn
        if (loan.status !== "ĐANG MƯỢN") {
          throw new Error(`Chỉ có thể đánh dấu quá hạn khi sách đang được mượn`);
        }
        loan.status = "QUÁ HẠN";
        if (notes) loan.notes += ` | Cảnh báo: ${notes}`;
        break;

      case "CANCEL": // Hủy đặt sách
        if (loan.status !== "ĐÃ ĐẶT") {
          throw new Error(`Chỉ có thể hủy khi sách còn ở trạng thái ĐÃ ĐẶT`);
        }
        loan.status = "ĐÃ HỦY";
        if (notes) loan.notes += ` | Hủy: ${notes}`;
        if (book && book.currentLoanId === loan.id) {
          book.status = "SẴN CÓ";
          book.currentLoanId = null;
        }
        if (loan.requestId) {
          const req = this.getRequestById(loan.requestId);
          if (req) {
            req.status = "CHỜ GHÉP";
            req.allocatedBookId = null;
          }
        }
        break;

      default:
        throw new Error(`Hành động '${action}' không hợp lệ.`);
    }

    return loan;
  }

  // --- Materials ---
  getMaterials(filter = {}) {
    return this.materials.filter(m => {
      if (filter.grade && filter.grade !== "Toàn cấp" && m.grade !== "Toàn cấp" && m.grade !== filter.grade) return false;
      if (filter.subject && filter.subject !== "Tất cả" && m.subject !== "Tất cả" && !m.subject.includes(filter.subject)) return false;
      if (filter.series && m.series !== "Dùng chung cho các bộ sách" && m.series !== "Khung chuẩn" && m.series !== filter.series) return false;
      return true;
    });
  }

  getMaterialById(id) {
    return this.materials.find(m => m.id === id);
  }

  addMaterial(materialData) {
    const newMaterial = {
      id: "mat_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      ...materialData,
      isActive: true,
      verifiedDate: new Date().toISOString().split("T")[0]
    };
    this.materials.unshift(newMaterial);
    return newMaterial;
  }

  // --- Risk Queue ---
  getRiskQueue() {
    return this.riskQueue;
  }

  addRiskItem(item) {
    const record = {
      id: "risk_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      ...item,
      timestamp: new Date().toISOString()
    };
    this.riskQueue.unshift(record);
    return record;
  }

  updateRiskStatus(id, newStatus, resolutionNotes = "") {
    const item = this.riskQueue.find(r => r.id === id);
    if (!item) return null;
    item.status = newStatus;
    if (resolutionNotes) item.resolutionNotes = resolutionNotes;
    return item;
  }

  // --- Summary Metrics ---
  getMetrics() {
    const totalBooks = this.books.length;
    const availableBooks = this.books.filter(b => b.status === "SẴN CÓ").length;
    const borrowedBooks = this.books.filter(b => b.status === "ĐANG MƯỢN" || b.status === "ĐÃ ĐẶT").length;
    const waitingRequests = this.requests.filter(r => r.status === "CHỜ GHÉP").length;
    const completedLoans = this.loans.filter(l => l.status === "ĐÃ TRẢ").length;
    const overdueLoans = this.loans.filter(l => l.status === "QUÁ HẠN").length;
    const verifiedMaterials = this.materials.filter(m => m.isActive).length;
    const flaggedRisks = this.riskQueue.filter(r => r.status === "ĐANG CHỜ DUYỆT" || r.status === "CHẶN TỰ ĐỘNG").length;

    return {
      totalBooks,
      availableBooks,
      borrowedBooks,
      waitingRequests,
      completedLoans,
      overdueLoans,
      verifiedMaterials,
      flaggedRisks,
      serviceRatePercent: totalBooks > 0 ? Math.round(((completedLoans + borrowedBooks) / (totalBooks + waitingRequests)) * 100) : 0
    };
  }
}

export const db = new Database();
