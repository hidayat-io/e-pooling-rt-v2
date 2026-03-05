import { Loader2 } from 'lucide-react';

export default function Loader({ text = 'Memuat...', fullScreen = false }) {
    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary-100 rounded-full" />
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary-600 rounded-full animate-spin" />
                </div>
                <p className="mt-4 text-gray-500 font-medium animate-pulse">{text}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            <p className="mt-3 text-sm text-gray-500">{text}</p>
        </div>
    );
}
