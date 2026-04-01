import { useState, useEffect } from 'react';
import { api, AdjudicatarioDetalleResponse, ContratoAdjudicatario } from '../api/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Calendar, FileText, Loader2, ScrollText, CreditCard, ArrowUpDown } from 'lucide-react';

export default function AdjudicatarioDetalle() {
    const { nombre } = useParams<{ nombre: string }>();
    const navigate = useNavigate();
    const [adjudicatario, setAdjudicatario] = useState<AdjudicatarioDetalleResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<keyof ContratoAdjudicatario | ''>('');
    const [sortDesc, setSortDesc] = useState(true);

    useEffect(() => {
        if (nombre) {
            loadData(nombre);
        }
    }, [nombre]);

    const loadData = async (encodedName: string) => {
        setLoading(true);
        try {
            // decode just to be safe if needed, but we pass the raw param to API because client.ts handles encoding if we just pass the target. 
            // wait, in client.ts `getAdjudicatarioDetalle(nombre)` does the encoding. 
            // So here `nombre` from useParams is already encoded because we pushed encoded in Adjudicatarios.tsx?
            // Actually, in Adjudicatarios.tsx we did navigate `/adjudicatarios/${base64url}`
            // So `nombre` here is the base64url. But `client.ts`'s `getAdjudicatarioDetalle(nombre)` expects the REAL name and encodes it.
            // Oh, we should change `client.ts` or change how we call it.
            // Let's decode it here and pass the real name to client.ts, or just change client.ts to accept the param directly.
            // Since client.ts does: `const encodedName = btoa(encodeURIComponent(nombre))...` and we already encoded it in the URL, this will double encode!
            // Let's decode it here first. 
            const realName = decodeURIComponent(atob((encodedName + '===').slice(0, encodedName.length + (encodedName.length % 4 === 0 ? 0 : 4 - encodedName.length % 4)).replace(/-/g, '+').replace(/_/g, '/')));
            const data = await api.getAdjudicatarioDetalle(realName);
            setAdjudicatario(data);
        } catch (error) {
            console.error('Error fetching adjudicatario detalle:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined) return '---';
        return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '---';
        return new Date(dateStr).toLocaleDateString('ca-ES');
    };

    const handleContractClick = (c: ContratoAdjudicatario) => {
        if (c.tipo_registro === 'major') {
            navigate(`/contratos/${c.id}`);
        } else {
            navigate(`/contratos-menores/${c.id}`);
        }
    };

    const handleSort = (column: keyof ContratoAdjudicatario) => {
        if (sortBy === column) {
            setSortDesc(!sortDesc);
        } else {
            setSortBy(column);
            setSortDesc(column === 'importe' || column === 'fecha');
        }
    };

    const sortedContracts = adjudicatario ? [...adjudicatario.contratos].sort((a, b) => {
        if (!sortBy) return 0;
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (aVal === bVal) return 0;
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
        }
        
        return sortDesc ? -comparison : comparison;
    }) : [];

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-primary-500" size={32} />
            </div>
        );
    }

    if (!adjudicatario) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-slate-500">
                <Building2 size={48} className="mb-4 text-slate-300" />
                <h2 className="text-xl font-bold text-slate-700">Adjudicatari no trobat</h2>
                <Link to="/adjudicatarios" className="mt-4 text-primary-600 hover:text-primary-700 font-medium">Torna al directori</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/adjudicatarios" className="btn btn-circle btn-ghost bg-white shadow-sm border border-slate-200">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {adjudicatario.nombre}
                    </h1>
                    {adjudicatario.nif && (
                        <p className="text-sm font-medium text-slate-500 font-mono mt-1">NIF: {adjudicatario.nif}</p>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                <div className="glass-card p-6 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5 text-primary-500">
                        <FileText size={100} />
                    </div>
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Contractes</span>
                    <span className="text-4xl font-black text-primary-700">{adjudicatario.total_contratos}</span>
                </div>
                <div className="glass-card p-6 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5 text-green-500">
                        <CreditCard size={100} />
                    </div>
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Volum Total Adjudicat</span>
                    <span className="text-4xl font-black text-green-600">{formatCurrency(adjudicatario.total_importe)}</span>
                </div>
            </div>

            {/* Contracts List */}
            <div className="glass-card flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-bold text-slate-700 flex items-center gap-2">
                        <ScrollText className="text-primary-500" /> Històric de Contractacions
                    </h2>
                </div>
                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="bg-white sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                            <tr>
                                <th 
                                    className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[20%] cursor-pointer hover:bg-slate-50"
                                    onClick={() => handleSort('tipo_registro')}
                                >
                                    <div className="flex items-center gap-1">Tipus / Exp. {sortBy === 'tipo_registro' && <ArrowUpDown size={12} className={sortDesc ? 'text-primary-500 rotate-180' : 'text-primary-500'} />}</div>
                                </th>
                                <th 
                                    className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[40%] cursor-pointer hover:bg-slate-50"
                                    onClick={() => handleSort('descripcion')}
                                >
                                    <div className="flex items-center gap-1">Objecte {sortBy === 'descripcion' && <ArrowUpDown size={12} className={sortDesc ? 'text-primary-500 rotate-180' : 'text-primary-500'} />}</div>
                                </th>
                                <th 
                                    className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[15%] text-right cursor-pointer hover:bg-slate-50"
                                    onClick={() => handleSort('importe')}
                                >
                                    <div className="flex items-center justify-end gap-1">Import {sortBy === 'importe' && <ArrowUpDown size={12} className={sortDesc ? 'text-primary-500 rotate-180' : 'text-primary-500'} />}</div>
                                </th>
                                <th 
                                    className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[15%] cursor-pointer hover:bg-slate-50"
                                    onClick={() => handleSort('fecha')}
                                >
                                    <div className="flex items-center gap-1">Data {sortBy === 'fecha' && <ArrowUpDown size={12} className={sortDesc ? 'text-primary-500 rotate-180' : 'text-primary-500'} />}</div>
                                </th>
                                <th 
                                    className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[10%] text-center cursor-pointer hover:bg-slate-50"
                                    onClick={() => handleSort('estado')}
                                >
                                    <div className="flex items-center justify-center gap-1">Estat {sortBy === 'estado' && <ArrowUpDown size={12} className={sortDesc ? 'text-primary-500 rotate-180' : 'text-primary-500'} />}</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedContracts.map((c, i) => (
                                <tr 
                                    key={i} 
                                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    onClick={() => handleContractClick(c)}
                                >
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-col gap-1 overflow-hidden">
                                            <span className="font-mono text-xs font-bold text-slate-700 truncate" title={c.codi_expedient || 'Sense codi'}>{c.codi_expedient || 'Sense codi'}</span>
                                            <span className={`text-[10px] uppercase tracking-wider font-bold w-fit px-1.5 py-0.5 rounded ${
                                                c.tipo_registro === 'major' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                                            }`}>
                                                {c.tipo_registro === 'major' ? 'CT. Major' : 'CT. Menor'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <p className="text-sm text-slate-700 line-clamp-3" title={c.descripcion || '-'}>
                                            {c.descripcion || '-'}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right align-top">
                                        <span className="font-bold text-sm text-slate-800 bg-slate-100 px-2 py-1 rounded inline-block">
                                            {formatCurrency(c.importe)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar size={12} className="shrink-0" /> {formatDate(c.fecha)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center align-top">
                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full border border-slate-200 uppercase tracking-wider inline-block text-center w-full truncate" title={c.estado || '-'}>
                                            {c.estado || '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
