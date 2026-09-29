// client/src/api.js
// Client API service for Boconic

const BASE_URL = "/api";

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Lỗi yêu cầu: ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${url}:`, err);
    throw err;
  }
}

export const api = {
  // System & Metrics
  getMetrics: () => request("/metrics"),
  resetDemoData: () => request("/reset-demo", { method: "POST" }),

  // Schools
  getSchools: () => request("/schools"),

  // Books
  getBooks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/books${query ? `?${query}` : ""}`);
  },
  getBookById: (id) => request(`/books/${id}`),
  lendBook: (formDataOrJson) => {
    if (formDataOrJson instanceof FormData) {
      return request("/books", {
        method: "POST",
        body: formDataOrJson
      });
    }
    return request("/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formDataOrJson)
    });
  },

  // Requests (Demand)
  getRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/requests${query ? `?${query}` : ""}`);
  },
  createRequest: (data) => request("/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }),

  // Loans
  getLoans: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/loans${query ? `?${query}` : ""}`);
  },
  createLoan: (data) => request("/loans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }),
  transitionLoan: (id, action, notes = "") => request(`/loans/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, notes })
  }),

  // Learning Materials
  getMaterials: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/materials${query ? `?${query}` : ""}`);
  },
  addMaterial: (data) => request("/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }),

  // AI & Coordinator
  getFairSchedules: () => request("/coordinator/fair-schedule"),
  executeMatch: (data) => request("/coordinator/execute-match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }),
  getShortageForecast: () => request("/coordinator/forecast"),
  getSimulationComparison: () => request("/ai/simulation"),
  getRiskQueue: () => request("/coordinator/risk-queue"),
  resolveRiskItem: (id, action, resolutionNotes = "") => request(`/coordinator/risk-queue/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, resolutionNotes })
  })
};
