import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, Adjudicatario } from '../api/client';
import { Search, Building2, TrendingUp, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function Adjudicatarios() {
    const [urlParams, setUrlParams] = useSearchParams();
    const navigate = useNavigate();
    const [adjudicatarios, setAdjudicatarios] = useState<Adjudicatario[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [showFilters, setShowFilters] = useState(!!(urlParams.get('search') || urlParams.get('sort_by')));

    // LOCAL TEXT STATE (for smooth typing)
    const [localSearch, setLocalSearch] = useState(urlParams.get('search') || '');

    // DERIVED STATE FROM URL
    const search = urlParams.get('search') || '';
    const page = Number(urlParams.get('page')) || 0;
    const sortBy = urlParams.get('sort_by') || 'total_importe';
    const sortDesc = urlParams.get('sort_desc') !== 'false';
    const limit = 50;

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.getAdjudicatarios({
                limit,
                offset: page * limit,
                search: search || undefined,
                sort_by: sortBy,
                sort_desc: sortDesc
            });
            setAdjudicatarios(data.items);
            setTotal(data.total);
        } catch (error) {
            console.error('Error fetching adjudicatarios:', error);
        } finally {
            setLoading(false);
        }
    };

    // Main data fetching effect: depends only on URL
    useEffect(() => {
        setLocalSearch(urlParams.get('search') || '');
        const timeout = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timeout);
    }, [urlParams]); 

    const updateURL = (newFilters: any) => {
        const nextParams = Object.fromEntries(urlParams.entries());
        const resetPage = !('page' in newFilters);
        
        const merged = { ...nextParams, ...newFilters };
        if (resetPage) merged.page = '0';
        
        const cleanParams = Object.fromEntries(
            Object.entries(merged).filter(([_, v]) => v !== '' && v !== false && v !== undefined && v !== null && v !== 'total_importe')
        );
        setUrlParams(cleanParams as any);
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            updateURL({ sort_desc: !sortDesc });
        } else {
            updateURL({ sort_by: column, sort_desc: true });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ca-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-6 w-full h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-primary-600" />
                        Directori d'Adjudicataris
                    </h1>
                    <p className="text-sm text-slate-500">Anàlisi d'empreses i volum de contractació</p>
                </div>
                <div className="flex items-center gap-3">
                     <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary h-10 px-4 flex items-center gap-2 font-bold outline-none ${showFilters ? 'bg-slate-100 text-slate-900 border-slate-300' : ''}`}
                    >
                        <Filter size={18} />
                        Filtres
                    </button>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <div className="glass-card p-4 border-l-4 border-l-primary-500 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Empreses</div>
                        <div className="text-xl font-bold text-slate-800 tabular-nums">{total}</div>
                    </div>
                </div>
                <div className="glass-card p-4 border-l-4 border-l-emerald-500 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Major Contractista</div>
                        <div className="text-sm font-bold text-slate-800 line-clamp-1">{adjudicatarios[0]?.nombre || '-'}</div>
                    </div>
                </div>
            </div>

            {showFilters && (
                <div className="glass-card p-4 bg-slate-50/50 border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200 shrink-0">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[300px] flex items-center gap-3 px-4 h-11 bg-white rounded-xl border border-slate-200 focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/5 transition-all">
                            <Search className="text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Cerca per CIF o Nom de l'empresa..."
                                className="bg-transparent border-none focus:ring-0 w-full text-sm font-medium outline-none"
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && updateURL({ search: localSearch })}
                                onBlur={() => updateURL({ search: localSearch })}
                            />
                        </div>
                        <button 
                            onClick={() => { setLocalSearch(''); updateURL({ search: '', page: 0 }); }}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider outline-none"
                        >
                            Netejar
                        </button>
                    </div>
                </div>
            )}

            <div className="glass-card flex-1 flex flex-col overflow-hidden min-h-0 bg-white">
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64"><div className="loading-spinner"></div></div>
                    ) : (
                        <table className="table border-collapse w-full">
                            <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Adjudicatari</th>
                                    <th 
                                        className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-primary-600 transition-colors"
                                        onClick={() => handleSort('total_contratos')}
                                    >
                                        Num. Contractes {sortBy === 'total_contratos' && (sortDesc ? '↓' : '↑')}
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-primary-600 transition-colors"
                                        onClick={() => handleSort('total_importe')}
                                    >
                                        Import Total {sortBy === 'total_importe' && (sortDesc ? '↓' : '↑')}
                                    </th>
                                    <th className="w-16 px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {adjudicatarios.map((adj, idx) => (
                                    <tr 
                                        key={idx} 
                                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                        onClick={() => {
                                            const encodedName = btoa(encodeURIComponent(adj.nombre)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                                            navigate(`/adjudicatarios/${encodedName}`);
                                        }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 text-sm">{adj.nombre}</span>
                                                <span className="text-[10px] font-mono text-slate-400">{adj.nif}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right tabular-nums">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs ring-4 ring-slate-50">
                                                {adj.total_contratos}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right tabular-nums">
                                            <span className="font-bold text-slate-800">{formatCurrency(adj.total_importe)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight size={18} className="text-primary-400 inline-block" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="text-xs text-slate-400 font-medium tracking-tight">
                        Pàgina {page + 1} de {Math.ceil(total / limit)}
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            className="p-1 px-3 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-600 outline-none"
                            onClick={() => updateURL({ page: Math.max(0, page - 1) })}
                            disabled={page === 0}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-[11px] font-bold px-2 text-slate-700 font-mono text-xs">PÀGINA {page + 1}</span>
                        <button 
                            className="p-1 px-3 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-600 outline-none"
                            onClick={() => updateURL({ page: page + 1 })}
                            disabled={(page + 1) * limit >= total}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
