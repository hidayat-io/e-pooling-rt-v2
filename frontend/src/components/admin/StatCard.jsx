export default function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', trend }) {
    const colors = {
        primary: 'bg-primary-50 text-primary-600',
        success: 'bg-emerald-50 text-emerald-600',
        danger: 'bg-red-50 text-red-600',
        warning: 'bg-amber-50 text-amber-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="card animate-fadeIn">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                    {trend && (
                        <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>
                {Icon && (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                )}
            </div>
        </div>
    );
}
