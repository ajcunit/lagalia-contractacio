import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { api, Sincronizacion } from '../api/client';
import { RefreshCw } from 'lucide-react';

export default function Layout() {
    const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Sincronizacion | null>(null);

    useEffect(() => {
        api.getUltimaSincronizacion().then(data => {
            if (data) setUltimaSincronizacion(data);
        }).catch(err => console.error("Could not fetch last sync", err));
    }, []);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Mai';
        return new Date(dateStr).toLocaleString('ca-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                <main className="flex-1 p-8 flex flex-col overflow-y-auto">
                    <Outlet />
                </main>
                <footer className="py-3 px-6 text-sm border-t border-slate-200 bg-white flex justify-between items-center">
                    <div className="flex items-center text-slate-400 text-xs gap-1.5">
                        <RefreshCw size={12} className={ultimaSincronizacion?.estado === 'en_proceso' ? 'animate-spin text-blue-500' : ''} />
                        Darrera sincronització: <span className="font-medium text-slate-600">{formatDate(ultimaSincronizacion?.fecha_hora_inicio)}</span>
                    </div>
                    <Link to="/credits" className="text-slate-500 hover:text-primary-600 transition-colors inline-flex items-center gap-1 font-medium">
                        Fet amb ❤️ per l'Ajuntament de Cunit
                    </Link>
                </footer>
            </div>
        </div>
    );
}
