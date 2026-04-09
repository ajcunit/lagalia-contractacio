import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getTokens, clearTokens, Empleado } from '../api/client';

export function useAuth() {
    const [user, setUser] = useState<Empleado | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUser = useCallback(async () => {
        const { access } = getTokens();
        if (!access) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            const me = await api.getMe();
            setUser(me);
        } catch {
            setUser(null);
            clearTokens();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
        const handler = () => {
            setUser(null);
            navigate('/login');
        };
        window.addEventListener('unauthorized', handler);
        return () => window.removeEventListener('unauthorized', handler);
    }, [fetchUser, navigate]);

    const logout = useCallback(async () => {
        await api.logout();
        setUser(null);
        navigate('/login');
    }, [navigate]);

    const isAdmin = user?.rol === 'admin' || user?.rol === 'responsable_contratacion';

    return { user, loading, logout, isAdmin, refetch: fetchUser };
}
