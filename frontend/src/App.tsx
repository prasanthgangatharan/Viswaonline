import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { AgentLayout } from './components/AgentLayout';
import { useAuth } from './hooks/useAuth';

function RootRedirect() {
  const { user, token } = useAuth();
  if (token && user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'agent') return <Navigate to="/agent/home" replace />;
  }
  return <Navigate to="/admin/login" replace />;
}

import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { LotteriesPage } from './pages/admin/LotteriesPage';
import { AgentsPage } from './pages/admin/AgentsPage';
import { AgentDetailPage } from './pages/admin/AgentDetailPage';
import { AllBetsPage } from './pages/admin/AllBetsPage';
import { ResultsPage } from './pages/admin/ResultsPage';
import { RiskViewPage } from './pages/admin/RiskViewPage';
import { MonitorPage } from './pages/admin/MonitorPage';
import { OverflowBetsPage } from './pages/admin/OverflowBetsPage';

import { AgentLoginPage } from './pages/agent/AgentLoginPage';
import { HomePage } from './pages/agent/HomePage';
import { DataEntryPage } from './pages/agent/DataEntryPage';
import { SalesReportPage } from './pages/agent/SalesReportPage';
import { AccountPage } from './pages/agent/AccountPage';
import { NetPayPage } from './pages/agent/NetPayPage';
import { ProfitPage } from './pages/agent/ProfitPage';
import { ShopResultPage } from './pages/agent/ShopResultPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: '#243058', color: '#e2e8f0', border: '1px solid #2e3d6e' } }} />
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/agent/login" element={<AgentLoginPage />} />

        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="lotteries" element={<LotteriesPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="agents/:id" element={<AgentDetailPage />} />
          <Route path="bets" element={<AllBetsPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="risk" element={<RiskViewPage />} />
          <Route path="overflow" element={<OverflowBetsPage />} />
          <Route path="monitor" element={<MonitorPage />} />
        </Route>

        <Route path="/agent" element={<ProtectedRoute role="agent"><AgentLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/agent/home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="data-entry/:lotteryId" element={<DataEntryPage />} />
          <Route path="sales" element={<SalesReportPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="net-pay" element={<NetPayPage />} />
          <Route path="profit" element={<ProfitPage />} />
          <Route path="result" element={<ShopResultPage />} />
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
