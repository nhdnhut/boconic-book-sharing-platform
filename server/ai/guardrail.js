// server/ai/guardrail.js
// Copyright Boundary & Content Risk Guardrail for Boconic
// Strictly blocks book file uploads (PDF, scan images, EPUBs) and flags suspicious / unofficial links.

import { normalizeVietnamese } from "./semanticSearch.js";

// Blacklisted file extensions for user uploads
export const BLOCKED_EXTENSIONS = [
  ".pdf", ".djvu", ".epub", ".mobi", ".azw", ".cbr", ".cbz", ".zip", ".rar", ".7z"
];

// Suspicious URL patterns often associated with pirated distribution or file dump lockers
export const SUSPICIOUS_DOMAINS = [
  "mega.nz", "fshare.vn", "mediafire.com", "4share.vn", "rapidgator.net",
  "zippyshare.com", "anonfiles.com", "drive.google.com/drive/folders",
  "t.me/joinchat", "telegram.me"
];

// Whitelist of trusted educational publishers and official authorities in Vietnam
export const TRUSTED_OFFICIAL_DOMAINS = [
  "taphuan.nxbgd.vn",
  "nxbgd.vn",
  "hoc10.vn",
  "moet.gov.vn",
  "violet.vn",
  "edu.vn",
  "gov.vn"
];

// Piracy-related keywords in Vietnamese
export const PIRACY_KEYWORDS = [
  "scan full", "ban scan", "sach scan", "photo lau", "sach lau",
  "pdf sach giao khoa", "tai tron bo", "crack", "full trang",
  "sao chep 10%", "ghep sach"
];

/**
 * Checks an uploaded file for copyright violations
 */
export function inspectUploadedFile(file) {
  if (!file) {
    return { isAllowed: true };
  }

  const filename = (file.originalname || file.name || "").toLowerCase();
  const mimeType = (file.mimetype || "").toLowerCase();

  // Check extension
  const hasBlockedExt = BLOCKED_EXTENSIONS.some(ext => filename.endsWith(ext));
  if (hasBlockedExt) {
    return {
      isAllowed: false,
      flagType: "BLOCKED_FILE_UPLOAD",
      reason: `Hệ thống từ chối tệp '${filename}'. Boconic KHÔNG lưu trữ, không nhận tải lên tệp sách PDF/EPUB hoặc tài liệu số hóa toàn văn theo quy định bản quyền.`,
      confidence: 0.99,
      recommendation: "Chỉ chia sẻ sách in vật lý hoặc dẫn liên kết đến trang chính thức của NXB."
    };
  }

  // Check MIME type
  if (mimeType.includes("pdf") || mimeType.includes("epub") || mimeType.includes("zip")) {
    return {
      isAllowed: false,
      flagType: "BLOCKED_FILE_UPLOAD",
      reason: `MIME type '${mimeType}' bị chặn. Không chấp nhận tệp định dạng tài liệu số nguyên cuốn.`,
      confidence: 0.99
    };
  }

  // Check filename keywords (e.g. image named "scan_trang_1_50.jpg", "chup_trang_10.jpg")
  const normName = normalizeVietnamese(filename);
  const scanPatterns = ["scan", "trang_", "trang-", "trang ", "page", "toan_van", "chup_trang"];
  if (scanPatterns.some(p => normName.includes(p))) {
    return {
      isAllowed: false,
      flagType: "SUSPICIOUS_IMAGE_SCAN",
      reason: `Tệp ảnh mang tên '${filename}' có dấu hiệu ảnh chụp quét trang sách. Người cho mượn chỉ cần đăng thông tin bìa/tình trạng sách, không tải ảnh các trang nội dung.`,
      confidence: 0.90
    };
  }

  return { isAllowed: true };
}

/**
 * Inspects learning material submission metadata & URL
 */
export function inspectLearningMaterialSubmission({ title = "", officialUrl = "", provider = "", description = "" }) {
  const combinedText = `${title} ${description} ${provider}`;
  const norm = normalizeVietnamese(combinedText);

  // 1. Check for illegal sharing keywords
  for (const kw of PIRACY_KEYWORDS) {
    if (norm.includes(kw)) {
      return {
        action: "BLOCK",
        flagType: "COPYRIGHT_RISK_KEYWORD",
        reason: `Phát hiện dấu hiệu chia sẻ không phép: cụm từ '${kw}'. Giới hạn học tập cá nhân không phải giấy phép để nền tảng tái tạo hay gom ghép sách.`,
        confidence: 0.95
      };
    }
  }

  // 2. Check URL domain
  try {
    const urlObj = new URL(officialUrl);
    const host = urlObj.hostname.toLowerCase();

    // Check suspicious domain
    const isSuspicious = SUSPICIOUS_DOMAINS.some(sd => officialUrl.toLowerCase().includes(sd));
    if (isSuspicious) {
      return {
        action: "FLAG_REVIEW",
        flagType: "SUSPICIOUS_STORAGE_HOST",
        reason: `Liên kết dẫn tới kho lưu trữ tệp cá nhân (${host}). Cần quản trị viên kiểm duyệt giấy phép trước khi hiển thị công khai.`,
        confidence: 0.92
      };
    }

    // Check trusted domain
    const isTrusted = TRUSTED_OFFICIAL_DOMAINS.some(td => host.endsWith(td));
    if (isTrusted) {
      return {
        action: "ALLOW",
        isTrusted: true,
        reason: "Nguồn xuất bản chính thức hoặc cơ quan quản lý giáo dục được xác thực."
      };
    }

    // Other unverified domain
    return {
      action: "FLAG_REVIEW",
      flagType: "UNVERIFIED_SOURCE",
      reason: `Tên miền '${host}' chưa có trong danh bạ đối tác chính thức. Đã đưa vào hàng đợi kiểm duyệt để xác minh tư cách nhà cung cấp.`,
      confidence: 0.70
    };

  } catch (err) {
    return {
      action: "BLOCK",
      flagType: "INVALID_URL",
      reason: "Đường dẫn URL không hợp lệ hoặc sai định dạng giao thức web.",
      confidence: 1.0
    };
  }
}
