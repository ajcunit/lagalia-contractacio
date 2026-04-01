import { useState, useEffect } from 'react';
import { api, Adjudicatario } from '../api/client';
import { Search, ArrowUpDown, Building2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Adjudicatarios() {
    const navigate = useNavigate();
    const [adjudicatarios, setAdjudicatarios] = useState<Adjudicatario[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const limit = 50;

    const [sortBy, setSortBy] = useState('total_importe');
    const [sortDesc, setSortDesc] = useState(true);

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

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, page, sortBy, sortDesc]);

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortDesc(!sortDesc);
        } else {
            setSortBy(column);
            setSortDesc(true);
        }
        setPage(0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    return (
        <div className="space-y-6 w-full h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-primary-500" />
                        Adjudicataris
                    </h1>
                    <p className="text-slate-500 mt-1">Directori d'empreses amb contractes adjudicats</p>
                </div>
            </div>

            <div className="glass-card p-4">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cercar empresa per nom..."
                            className="input input-search"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} gap-2`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={18} />
                        Filtres
                    </button>
                </div>
                
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 mt-4">
                         <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 italic">
                            Aviat podràs filtrar per municipi o activitat econòmica.
                         </div>
                    </div>
                )}
            </div>

            <div className="glass-card flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="loading-spinner w-10 h-10"></div>
                        </div>
                    ) : adjudicatarios.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">No s'han trobat empreses</p>
                        </div>
                    ) : (
                        <table className="table border-collapse w-full">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left">
                                        <div className="flex items-center gap-2 uppercase text-[11px] font-bold tracking-wider text-slate-500">
                                            CIF/NIF
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('nombre')} className="cursor-pointer hover:bg-slate-100 transition-colors px-6 py-4 text-left">
                                        <div className="flex items-center gap-2 uppercase text-[11px] font-bold tracking-wider text-slate-500">
                                            Nom de l'Empresa
                                            {sortBy === 'nombre' && <ArrowUpDown size={14} className={sortDesc ? 'text-primary-500 rotate-180' : 'text-primary-500'} />}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('total_contratos')} className="cursor-pointer hover:bg-slate-100 transition-colors px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2 uppercase text-[11px] font-bold tracking-wider text-slate-500">
                                            Nº Contractes
                                            {sortBy === 'total_contratos' && <ArrowUpDown size={14} className={sortDesc ? 'text-primary-500 rotate-180' : 'text-primary-500'} />}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('total_importe')} className="cursor-pointer hover:bg-slate-100 transition-colors px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 uppercase text-[11px] font-bold tracking-wider text-slate-500">
                                            Volum Adjudicat
                                            {sortBy === 'total_importe' && <ArrowUpDown size={14} className={sortDesc ? 'text-primary-500 rotate-180' : 'text-primary-500'} />}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {adjudicatarios.map((emp) => (
                                    <tr 
                                        key={emp.nombre} 
                                        onClick={() => navigate(`/adjudicatarios/${btoa(encodeURIComponent(emp.nombre)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`)}
                                        className="hover:bg-slate-50/80 cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-600">
                                                {emp.nif || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-slate-800 group-hover:text-primary-700 transition-colors">
                                                {emp.nombre}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary-50 text-primary-700 font-bold text-xs">
                                                {emp.total_contratos}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-slate-800 number-display">
                                                {formatCurrency(emp.total_importe)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {total > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                        <p className="text-sm text-slate-500 font-medium">
                            Mostrant <span className="text-slate-800">{page * limit + 1}</span> - <span className="text-slate-800">{Math.min((page + 1) * limit, total)}</span> de <span className="text-slate-800">{total}</span> adjudicataris
                        </p>
                        <div className="flex gap-2">
                            <button 
                                className="btn btn-secondary btn-sm" 
                                disabled={page === 0}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                className="btn btn-secondary btn-sm" 
                                disabled={(page + 1) * limit >= total}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
