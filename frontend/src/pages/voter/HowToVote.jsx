import Card from '../../components/common/Card';
import { Smartphone, CheckSquare, Send, Shield, HelpCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { CONTACT_WA } from '../../utils/constants';

const steps = [
    { icon: Smartphone, title: 'Buka Link dari WhatsApp', desc: 'Klik link jajak pendapat yang dikirim panitia melalui WhatsApp. Link bersifat pribadi dan hanya untuk Anda.' },
    { icon: Shield, title: 'Konfirmasi Identitas', desc: 'Pastikan nama dan data yang tampil adalah data Anda. Jika bukan, hubungi panitia.' },
    { icon: CheckSquare, title: 'Beri Persetujuan', desc: 'Lihat profil dan visi misi kandidat tunggal. Pilih "Setuju" atau "Tidak Setuju" sesuai pendapat Anda.' },
    { icon: Send, title: 'Konfirmasi & Kirim', desc: 'Centang konfirmasi dan kirim tanggapan Anda. Tanggapan bersifat rahasia dan tidak dapat diubah.' },
    { icon: CheckSquare, title: 'Selesai!', desc: 'Tanggapan Anda tercatat. Anda bisa melihat hasil sementara secara real-time.' },
];

const faqs = [
    { q: 'Apakah tanggapan saya bisa dilihat orang lain?', a: 'Tidak. Pilihan Anda sepenuhnya rahasia. Bahkan panitia tidak bisa melihat siapa yang memberikan persetujuan atau tidak.' },
    { q: 'Bisa memberi tanggapan lebih dari sekali?', a: 'Tidak bisa. Sistem hanya mengizinkan 1 tanggapan per partisipan. Setelah itu, link akan otomatis nonaktif.' },
    { q: 'Link saya kadaluarsa, bagaimana?', a: 'Hubungi panitia untuk mendapatkan link baru.' },
    { q: 'Apakah harus install aplikasi?', a: 'Tidak perlu. Cukup buka link dari browser HP Anda.' },
];

export default function HowToVote() {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="page-container">
            <div className="bg-white border-b border-gray-100 px-4 py-4">
                <h1 className="text-lg font-bold text-gray-900">Cara Berpartisipasi</h1>
                <p className="text-sm text-gray-500">Panduan jajak pendapat</p>
            </div>

            <div className="px-4 py-4 space-y-6">
                {/* Steps */}
                <div>
                    <h3 className="section-title">Langkah-Langkah</h3>
                    <div className="space-y-0">
                        {steps.map((step, i) => (
                            <div key={i} className="flex gap-4 animate-fadeIn" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <step.icon className="w-5 h-5 text-primary-600" />
                                    </div>
                                    {i < steps.length - 1 && <div className="w-0.5 h-full bg-primary-100 my-1" />}
                                </div>
                                <div className="pb-6">
                                    <h4 className="font-semibold text-gray-900 text-sm">{step.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ */}
                <div>
                    <h3 className="section-title">Pertanyaan Umum</h3>
                    <div className="space-y-2">
                        {faqs.map((faq, i) => (
                            <div key={i} className="card">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between text-left"
                                >
                                    <span className="font-medium text-sm text-gray-900 pr-2">{faq.q}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100 animate-fadeIn">
                                        {faq.a}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact */}
                <Card className="text-center">
                    <HelpCircle className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-gray-900">Butuh Bantuan?</p>
                    <p className="text-xs text-gray-500 mt-1">Hubungi panitia pemilihan:</p>
                    <a
                        href={`https://wa.me/${CONTACT_WA}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline text-sm inline-flex mt-3"
                    >
                        Hubungi via WhatsApp
                    </a>
                </Card>
            </div>
        </div>
    );
}
