import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AnalyticsPage } from "./pages/Analytics";
import { BillDetailPage } from "./pages/BillDetail";
import { HistoryPage } from "./pages/History";
import { HomePage } from "./pages/Home";
import { ReviewPage } from "./pages/Review";
import { ScanPage } from "./pages/Scan";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<BillDetailPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
