import { NavLink, useLocation } from 'react-router-dom';
import { Home, User } from 'lucide-react';

const navItems = [
    { to: '/dashboard', icon: Home, label: 'Beranda' },
    { to: '/profile', icon: User, label: 'Profil' },
];

export default function BottomNav() {
    const location = useLocation();

    // Sembunyikan di halaman confirm & success
    const hiddenPaths = ['/confirm', '/success', '/vote/', '/verify'];
    const shouldHide = hiddenPaths.some((p) => location.pathname.startsWith(p));
    if (shouldHide) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
            <div className="max-w-lg mx-auto flex items-center justify-around py-2">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-[60px]
              ${isActive
                                ? 'text-primary-600'
                                : 'text-gray-400 hover:text-gray-600'
                            }`
                        }
                    >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
