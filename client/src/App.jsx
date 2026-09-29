// client/src/App.jsx
import React, { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import SearchBooksPage from "./pages/SearchBooksPage";
import LendBookPage from "./pages/LendBookPage";
import RequestBookPage from "./pages/RequestBookPage";
import LoansHistoryPage from "./pages/LoansHistoryPage";
import LearningMaterialsPage from "./pages/LearningMaterialsPage";
import CoordinatorDashboardPage from "./pages/CoordinatorDashboardPage";
import CopyrightPrivacyPage from "./pages/CopyrightPrivacyPage";
import ExperimentSandboxPage from "./pages/ExperimentSandboxPage";
import { api } from "./api";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await api.resetDemoData();
      alert("🥑 Dữ liệu mẫu demo đã được đặt lại thành công về trạng thái ban đầu!");
      // reload current view
      window.location.reload();
    } catch (err) {
      alert("Lỗi khi đặt lại dữ liệu: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case "home":
        return <HomePage setActiveTab={setActiveTab} />;
      case "search":
        return <SearchBooksPage setActiveTab={setActiveTab} />;
      case "lend":
        return <LendBookPage setActiveTab={setActiveTab} />;
      case "request":
        return <RequestBookPage setActiveTab={setActiveTab} />;
      case "loans":
        return <LoansHistoryPage setActiveTab={setActiveTab} />;
      case "materials":
        return <LearningMaterialsPage setActiveTab={setActiveTab} />;
      case "coordinator":
        return <CoordinatorDashboardPage setActiveTab={setActiveTab} />;
      case "rules":
        return <CopyrightPrivacyPage setActiveTab={setActiveTab} />;
      case "sandbox":
        return <ExperimentSandboxPage setActiveTab={setActiveTab} />;
      default:
        return <HomePage setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />
      <main className="main-content">
        {renderActivePage()}
      </main>
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
