// server/ai/shortageForecaster.js
// Textbook Shortage Forecasting Module for Boconic
// Analyzes demand backlog, book availability velocity, and upcoming class schedules to forecast shortage risks.

/**
 * Predicts shortage risk for the upcoming 7-14 days
 * @param {Array} books 
 * @param {Array} requests 
 * @param {Array} loans 
 * @param {Array} schools 
 */
export function forecastTextbookShortages(books, requests, loans, schools) {
  // Aggregate key combinations: (schoolId, grade, subject, series)
  const groupMap = new Map();

  // Helper to make key
  const makeKey = (schoolId, grade, subject, series) => `${schoolId}::${grade}::${subject}::${series}`;

  // 1. Map existing book supplies
  for (const b of books) {
    const key = makeKey(b.schoolId, b.grade, b.subject, b.series);
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        schoolId: b.schoolId,
        grade: b.grade,
        subject: b.subject,
        series: b.series,
        totalSupply: 0,
        availableSupply: 0,
        currentlyBorrowed: 0,
        pendingDemand: 0,
        urgentClassCount: 0
      });
    }
    const item = groupMap.get(key);
    item.totalSupply++;
    if (b.status === "SẴN CÓ") item.availableSupply++;
    if (b.status === "ĐANG MƯỢN" || b.status === "ĐÃ ĐẶT") item.currentlyBorrowed++;
  }

  // 2. Map waiting requests
  for (const r of requests) {
    if (r.status !== "CHỜ GHÉP") continue;
    const key = makeKey(r.schoolId, r.grade, r.subject, r.series);
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        schoolId: r.schoolId,
        grade: r.grade,
        subject: r.subject,
        series: r.series,
        totalSupply: 0,
        availableSupply: 0,
        currentlyBorrowed: 0,
        pendingDemand: 0,
        urgentClassCount: 0
      });
    }
    const item = groupMap.get(key);
    item.pendingDemand++;
    if (r.hasClassOn && r.hasClassOn.length > 0) {
      item.urgentClassCount += r.hasClassOn.length;
    }
  }

  const forecasts = [];

  for (const [key, data] of groupMap.entries()) {
    const school = schools.find(s => s.id === data.schoolId) || { name: data.schoolId };

    // Calculate Projected Deficit / Gap
    // Supply capability over next 7 days = available now + expected returns (assumed 50% turnaround in 7 days)
    const expectedReturnsNext7Days = Math.round(data.currentlyBorrowed * 0.5);
    const effectiveSupplyCapacity = data.availableSupply + expectedReturnsNext7Days;

    // Projected new demand incoming = pendingDemand * 1.3 (estimated organic word-of-mouth growth)
    const projectedDemandNext7Days = Math.ceil(data.pendingDemand * 1.3);

    const projectedDeficit = Math.max(0, projectedDemandNext7Days - effectiveSupplyCapacity);

    // Calculate Risk Index (0.0 to 1.0)
    let riskIndex = 0.0;
    if (projectedDemandNext7Days > 0) {
      const deficitRatio = projectedDeficit / projectedDemandNext7Days;
      const urgencyFactor = Math.min(1.0, data.urgentClassCount / Math.max(1, data.pendingDemand));
      riskIndex = Math.min(1.0, deficitRatio * 0.7 + urgencyFactor * 0.3);
    }

    let riskLevel = "THẤP";
    let badgeColor = "green";
    if (riskIndex >= 0.65 || projectedDeficit >= 2) {
      riskLevel = "CAO";
      badgeColor = "red";
    } else if (riskIndex >= 0.35 || projectedDeficit >= 1) {
      riskLevel = "TRUNG BÌNH";
      badgeColor = "orange";
    }

    // Generate actionable recommendations
    const recommendations = [];
    if (riskLevel === "CAO") {
      recommendations.push(`Cần bổ sung gấp tối thiểu ${projectedDeficit + 1} cuốn từ tủ sách dùng chung hoặc cựu học sinh.`);
      recommendations.push(`Hướng dẫn ${data.pendingDemand} học sinh chờ sử dụng tạm học liệu đọc mở tại taphuan.nxbgd.vn.`);
      recommendations.push("Thư viện liên hệ giáo viên bộ môn điều phối lịch mượn ngắn hạn theo từng buổi học thay vì mượn tuần.");
    } else if (riskLevel === "TRUNG BÌNH") {
      recommendations.push(`Theo dõi tiến độ trả sách để luân chuyển ngay cho lượt tiếp theo.`);
      recommendations.push("Khuyến khích học sinh dùng chung theo nhóm bàn tại lớp.");
    } else {
      recommendations.push("Nguồn cung tạm thời đáp ứng đủ nhu cầu dự kiến.");
    }

    forecasts.push({
      id: "fc_" + key.replace(/[^a-zA-Z0-9]/g, "_"),
      schoolName: school.name,
      schoolId: data.schoolId,
      grade: data.grade,
      subject: data.subject,
      series: data.series,
      totalSupply: data.totalSupply,
      availableSupply: data.availableSupply,
      currentlyBorrowed: data.currentlyBorrowed,
      pendingDemand: data.pendingDemand,
      projectedDeficit,
      riskIndex: Math.round(riskIndex * 100) / 100,
      riskLevel,
      badgeColor,
      recommendations,
      modelMetadata: {
        algorithm: "Dynamic Demand-Supply Velocity Gap Model (7-day projection window)",
        limitations: "Ước tính dựa trên quy mô mẫu demo thực tế và tỷ lệ đăng ký. Cần thêm dữ liệu đăng ký sỉ từ nhà trường để huấn luyện mô hình học máy chuỗi thời gian (ARIMA/LSTM) khi quy mô trường tăng cao."
      }
    });
  }

  // Sort by risk descending
  forecasts.sort((a, b) => b.riskIndex - a.riskIndex);

  return {
    forecasts,
    highRiskCount: forecasts.filter(f => f.riskLevel === "CAO").length,
    mediumRiskCount: forecasts.filter(f => f.riskLevel === "TRUNG BÌNH").length,
    timestamp: new Date().toISOString()
  };
}
