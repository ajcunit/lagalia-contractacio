import { Navigate, Outlet } from 'react-router-dom';
import { getTokens } from '../api/client';

export default function ProtectedRoute() {
    const { access } = getTokens();

    if (!access) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
