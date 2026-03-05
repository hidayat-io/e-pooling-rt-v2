import useCountdown from '../../hooks/useCountdown';

export default function CountdownTimer({ targetDate, label = 'Sisa Waktu Pooling' }) {
    const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate);

    if (isExpired) {
        return (
            <div className="text-center py-3">
                <span className="badge-danger text-sm px-4 py-1.5">Waktu Pooling Telah Berakhir</span>
            </div>
        );
    }

    return (
        <div>
            {label && <p className="text-sm text-gray-500 mb-3 text-center">{label}</p>}
            <div className="flex items-center justify-center gap-3">
                <TimeUnit value={days} label="Hari" />
                <span className="text-xl font-bold text-gray-300 -mt-4">:</span>
                <TimeUnit value={hours} label="Jam" />
                <span className="text-xl font-bold text-gray-300 -mt-4">:</span>
                <TimeUnit value={minutes} label="Menit" />
                <span className="text-xl font-bold text-gray-300 -mt-4">:</span>
                <TimeUnit value={seconds} label="Detik" />
            </div>
        </div>
    );
}

function TimeUnit({ value, label }) {
    return (
        <div className="countdown-unit">
            <div className="countdown-value">
                {String(value).padStart(2, '0')}
            </div>
            <span className="countdown-label">{label}</span>
        </div>
    );
}
