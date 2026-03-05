import { AlertTriangle } from 'lucide-react';
import { CONTACT_WA } from '../../utils/constants';

export default function TokenInvalid() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full text-center animate-fadeIn">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Link Tidak Valid</h2>
                <p className="text-gray-500 mb-6">Link pooling yang Anda gunakan tidak valid atau sudah kadaluarsa.</p>
                <a href={`https://wa.me/${CONTACT_WA}`} target="_blank" rel="noreferrer" className="btn-outline text-sm inline-flex">
                    Hubungi Panitia
                </a>
            </div>
        </div>
    );
}
