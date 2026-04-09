import { useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';

interface Props {
    children: ReactNode;
}

export default function SetupGuard({ children }: Props) {
    const [checking, setChecking] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Skip check if already on setup page
        if (location.pathname === '/setup') {
            setChecking(false);
            return;
        }

        api.getSetupStatus()
            .then(({ needs_setup }) => {
                if (needs_setup) {
                    navigate('/setup', { replace: true });
                } else {
                    setChecking(false);
                }
            })
            .catch(() => {
                // If we can't reach the API, let through (will fail at auth)
                setChecking(false);
            });
    }, [navigate, location.pathname]);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
                    <p className="text-sm text-slate-500 font-medium">Carregant...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
