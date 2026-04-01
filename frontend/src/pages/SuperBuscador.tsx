import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { 
    Search, 
    Globe, 
    Building2, 
    FileText, 
    Calendar, 
    ExternalLink, 
    Loader2, 
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Filter,
    Eye
} from 'lucide-react';
import FavoriteButton from '../components/FavoriteButton';

export default function SuperBuscador() {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [organisme, setOrganisme] = useState('');
    const [objecte, setObjecte] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    
    const limit = 20;

    const handleSearch = async (e?: React.FormEvent, newOffset = 0) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        setOffset(newOffset);
        
        try {
            const response = await api.searchGlobalContracts({
                q,
                organisme,
                objecte,
                limit,
                offset: newOffset
            });
            setResults(response.results);
            if (response.results.length === 0 && newOffset === 0) {
                setError("No s'han trobat contractes amb aquests criteris.");
            }
        } catch (err: any) {
            setError(err.message || "Error en cercar a la plataforma");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: any) => {
        if (amount === undefined || amount === null) return '---';
        return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(Number(amount));
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '---';
        return new Date(dateStr).toLocaleDateString('ca-ES');
    };

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Globe className="text-primary-500" />
                        SuperBuscador de la Generalitat
                    </h1>
                    <p className="text-slate-500 mt-1">Cerca en temps real a tots els expedients de Catalunya</p>
                </div>
            </div>

            {/* Search Controls */}
            <div className="glass-card p-6 space-y-4">
                <form onSubmit={(e) => handleSearch(e)} className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cerca global (ex: 'ambulància', 'software', 'manteniment')..."
                            className="input input-bordered w-full pl-10 h-12 text-lg"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                    <button 
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn btn-square h-12 ${showFilters ? 'btn-primary' : 'btn-ghost border-slate-200'}`}
                    >
                        <Filter size={20} />
                    </button>
                    <button type="submit" className="btn btn-primary px-8 h-12" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Cercar'}
                    </button>
                </form>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-slate-100">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Building2 size={14} /> Nom de l'Organisme
                            </label>
                            <input 
                                type="text" 
                                className="input input-bordered w-full"
                                placeholder="ex: AJUNTAMENT DE BARCELONA"
                                value={organisme}
                                onChange={(e) => setOrganisme(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <FileText size={14} /> Paraules a l'objecte
                            </label>
                            <input 
                                type="text" 
                                className="input input-bordered w-full"
                                placeholder="ex: ASCENSORS"
                                value={objecte}
                                onChange={(e) => setObjecte(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-8 glass-card border-red-100 bg-red-50/20 text-center flex flex-col items-center gap-3">
                    <AlertCircle className="text-red-500" size={40} />
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            )}

            {results.length > 0 && (
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Data</th>
                                        <th className="px-6 py-4 font-semibold">Organisme / Expedient</th>
                                        <th className="px-6 py-4 font-semibold">Objecte del Contracte</th>
                                        <th className="px-6 py-4 font-semibold text-right">Import (IVA inc.)</th>
                                        <th className="px-6 py-4 font-semibold w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {results.map((c, idx) => (
                                        <tr 
                                            key={idx} 
                                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                            onClick={() => navigate(`/superbuscador/${encodeURIComponent(c.codi_expedient)}`)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <Calendar size={14} />
                                                    {formatDate(c.data_publicacio_contracte)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-primary-600 truncate max-w-[200px]" title={c.nom_organ}>
                                                        {c.nom_organ}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{c.codi_expedient}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed" title={c.objecte_contracte}>
                                                    {c.objecte_contracte}
                                                </p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c.tipus_contracte}</span>
                                                    <span className="text-[10px] bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded">{c.estat_actual}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-slate-800">
                                                    {formatCurrency(c.import_adjudicacio_amb_iva || c.pressupost_licitacio_amb_iva)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <FavoriteButton codi_expedient={c.codi_expedient} />
                                                    <button 
                                                        className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
                                                        title="Veure Fitxa Detallada"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/superbuscador/${encodeURIComponent(c.codi_expedient)}`);
                                                        }}
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <a 
                                                        href={c.enllac_publicacio?.url || c.url_plataforma_contractacio} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-slate-400 hover:text-primary-600 transition-colors inline-block"
                                                        title="Obrir a la Plataforma"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink size={18} />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-2">
                        <span className="text-sm text-slate-500">
                            Mostrant resultats {offset + 1} - {offset + results.length}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleSearch(undefined, Math.max(0, offset - limit))}
                                disabled={offset === 0 || loading}
                                className="btn btn-sm btn-ghost gap-1 px-4 border-slate-200"
                            >
                                <ChevronLeft size={16} /> Anterior
                            </button>
                            <button 
                                onClick={() => handleSearch(undefined, offset + limit)}
                                disabled={results.length < limit || loading}
                                className="btn btn-sm btn-ghost gap-1 px-4 border-slate-200"
                            >
                                Següent <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!loading && results.length === 0 && !error && (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                    <Globe size={64} className="text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Cerca qualsevol cosa a la plataforma oficial</p>
                    <p className="text-slate-400 text-sm">Els resultats no es guarden a la base de dades local</p>
                </div>
            )}
        </div>
    );
}
