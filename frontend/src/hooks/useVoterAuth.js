import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useVoterStore from '../stores/voterStore';
import { authService } from '../services/authService';

/**
 * Hook untuk mengelola voter auth
 * Auto-fetch profile jika token ada
 */
export default function useVoterAuth() {
    const { voter, token, isAuthenticated, setVoter, logout } = useVoterStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (token && !voter) {
            authService.getVoterProfile()
                .then((res) => setVoter(res.data))
                .catch(() => {
                    logout();
                    navigate('/');
                });
        }
    }, [token]);

    return { voter, isAuthenticated, logout };
}
