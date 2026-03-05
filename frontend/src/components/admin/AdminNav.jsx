import { NavLink, useNavigate } from 'react-router-dom';
import useAdminStore from '../../stores/adminStore';
import { LayoutDashboard, Users, UserCheck, MessageSquare, Activity, Settings, LogOut, Vote, History, FileText, Globe } from 'lucide-react';

const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/voters', icon: Users, label: 'Data Pemilih' },
    { to: '/admin/candidates', icon: UserCheck, label: 'Kandidat' },
    { to: '/admin/broadcast', icon: MessageSquare, label: 'Broadcast WA' },
    { to: '/admin/wa-history', icon: History, label: 'History WA' },
    { to: '/admin/monitoring', icon: Activity, label: 'Monitoring' },
    { to: '/admin/traffic-logs', icon: Globe, label: 'Traffic Logs' },
    { to: '/admin/reports', icon: FileText, label: 'Laporan' },
    { to: '/admin/settings', icon: Settings, label: 'Pengaturan' },
];

export default function AdminNav() {
    const { admin, logout } = useAdminStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/admin');
    };

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900 text-white z-40 flex flex-col">
            {/* Logo */}
            <div className="p-5 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
                        <Vote className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-bold text-sm">E-Pooling RT</h1>
                        <p className="text-[10px] text-gray-400">Admin Panel</p>
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 py-4 overflow-y-auto">
                <div className="space-y-1 px-3">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`
                            }
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* User Info */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {admin?.nama?.charAt(0) || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{admin?.nama || 'Admin'}</p>
                        <p className="text-xs text-gray-500">{admin?.role || 'admin'}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Keluar
                </button>
            </div>
        </aside>
    );
}
