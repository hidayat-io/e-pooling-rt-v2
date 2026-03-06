import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import useVoterStore from './stores/voterStore';
import useAdminStore from './stores/adminStore';
import BottomNav from './components/common/BottomNav';
import AdminNav from './components/admin/AdminNav';

// Voter Pages
import AutoLogin from './pages/voter/AutoLogin';
import CodeLogin from './pages/voter/CodeLogin';
import Verify from './pages/voter/Verify';
import Dashboard from './pages/voter/Dashboard';
import CandidateList from './pages/voter/CandidateList';
import CandidateDetail from './pages/voter/CandidateDetail';
import VoteConfirm from './pages/voter/VoteConfirm';
import VoteSuccess from './pages/voter/VoteSuccess';
import Results from './pages/voter/Results';
import VoterCard from './pages/voter/VoterCard';

// Admin Pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminVoters from './pages/admin/Voters';
import AdminCandidates from './pages/admin/Candidates';
import AdminBroadcast from './pages/admin/Broadcast';
import AdminWaHistory from './pages/admin/WaHistory';
import AdminMonitoring from './pages/admin/Monitoring';
import AdminSettings from './pages/admin/Settings';
import AdminReports from './pages/admin/Reports';
import AdminTrafficLogs from './pages/admin/TrafficLogs';

// Error Pages
import AlreadyVoted from './pages/errors/AlreadyVoted';
import TokenInvalid from './pages/errors/TokenInvalid';
import NotFound from './pages/errors/NotFound';

// Layout wrapper untuk voter (dengan bottom nav)
function VoterLayout() {
  return (
    <div className="max-w-lg mx-auto">
      <Outlet />
      <BottomNav />
    </div>
  );
}

// Layout wrapper untuk admin (dengan sidebar)
function AdminLayout() {
  const { isAuthenticated } = useAdminStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  if (!isAuthenticated) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />

      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-700"
            aria-label="Buka menu admin"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-gray-900">Admin Panel</p>
          <div className="w-9" />
        </div>
      </header>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Tutup menu admin"
          />
          <div className="relative h-full w-[82%] max-w-xs">
            <AdminNav mobile onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="md:ml-64 p-3 sm:p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

function AdminEntry() {
  const { isAuthenticated } = useAdminStore();
  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;
  return <AdminLogin />;
}

// Protected route untuk voter
function VoterProtected() {
  const { isAuthenticated } = useVoterStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Magic Link Entry */}
        <Route path="/vote/:token" element={<AutoLogin />} />

        {/* Voter Protected Routes */}
        <Route element={<VoterProtected />}>
          <Route path="/verify" element={<Verify />} />
          <Route path="/confirm" element={<VoteConfirm />} />
          <Route path="/success" element={<VoteSuccess />} />

          {/* Routes with Bottom Nav */}
          <Route element={<VoterLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/candidates" element={<CandidateList />} />
            <Route path="/candidates/:id" element={<CandidateDetail />} />
            <Route path="/results" element={<Results />} />
            <Route path="/profile" element={<VoterCard />} />
          </Route>
        </Route>

        {/* Public Results (no auth needed) */}
        <Route path="/public/results" element={<div className="max-w-lg mx-auto"><Results /></div>} />

        {/* Error Pages */}
        <Route path="/already-voted" element={<AlreadyVoted />} />
        <Route path="/token-invalid" element={<TokenInvalid />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminEntry />} />
        <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="voters" element={<AdminVoters />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="broadcast" element={<AdminBroadcast />} />
          <Route path="wa-history" element={<AdminWaHistory />} />
          <Route path="monitoring" element={<AdminMonitoring />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="traffic-logs" element={<AdminTrafficLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="/" element={<CodeLogin />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
