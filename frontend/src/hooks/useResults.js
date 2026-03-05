import { useState, useEffect, useCallback } from 'react';
import { voteService } from '../services/voteService';

/**
 * Hook untuk polling hasil pooling
 * @param {number} interval - Interval polling dalam ms (default 10000)
 */
export default function useResults(interval = 10000) {
    const [results, setResults] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchResults = useCallback(async () => {
        try {
            const [resResult, resStats] = await Promise.all([
                voteService.getResults(),
                voteService.getPublicStats(),
            ]);
            setResults(resResult.data);
            setStats(resStats.data);
            setError(null);
        } catch (err) {
            setError(err.message || 'Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchResults();
        const timer = setInterval(fetchResults, interval);
        return () => clearInterval(timer);
    }, [fetchResults, interval]);

    return { results, stats, loading, error, refresh: fetchResults };
}
