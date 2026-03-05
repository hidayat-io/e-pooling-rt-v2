import { Info, Calendar, AlertTriangle } from 'lucide-react';

const typeConfig = {
    info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-600' },
    kegiatan: { icon: Calendar, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-600' },
    penting: { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-600' },
};

export default function AnnouncementItem({ announcement }) {
    const config = typeConfig[announcement.type] || typeConfig.info;
    const Icon = config.icon;

    return (
        <div className={`${config.bg} border ${config.border} rounded-xl p-3.5 animate-fadeIn`}>
            <div className="flex gap-3">
                <div className={`${config.badge} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm ${config.text}`}>{announcement.title}</h4>
                    {announcement.content && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{announcement.content}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
