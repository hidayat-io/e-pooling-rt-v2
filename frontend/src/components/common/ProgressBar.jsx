export default function ProgressBar({ value = 0, max = 100, color = 'primary', height = 'h-3', showLabel = false, className = '' }) {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

    const colors = {
        primary: 'bg-primary-600',
        success: 'bg-emerald-500',
        danger: 'bg-red-500',
        warning: 'bg-amber-500',
    };

    return (
        <div className={`w-full ${className}`}>
            <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${height}`}>
                <div
                    className={`${colors[color]} ${height} rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <p className="text-xs text-gray-500 mt-1 text-right">{percentage.toFixed(1)}%</p>
            )}
        </div>
    );
}
