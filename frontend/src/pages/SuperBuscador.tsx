import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    Euro,
    Clock,
    Hash,
    Maximize2
} from 'lucide-react';
import FavoriteButton from '../components/FavoriteButton';

export default function SuperBuscador() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [q, setQ] = useState(searchParams.get('q') || '');
    const [organisme, setOrganisme] = useState(searchParams.get('organisme') || '');
    const [objecte, setObjecte] = useState(searchParams.get('objecte') || '');
    const [minImporte, setMinImporte] = useState<string>(searchParams.get('minImporte') || '');
    const [maxImporte, setMaxImporte] = useState<string>(searchParams.get('maxImporte') || '');
    const [fechaDesde, setFechaDesde] = useState(searchParams.get('fechaDesde') || '');
    const [fechaHasta, setFechaHasta] = useState(searchParams.get('fechaHasta') || '');
    
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(Number(searchParams.get('offset')) || 0);
    const [showFilters, setShowFilters] = useState(!!(searchParams.get('organisme') || searchParams.get('objecte') || searchParams.get('minImporte') || searchParams.get('maxImporte') || searchParams.get('fechaDesde') || searchParams.get('fechaHasta')));
    
    const limit = 24; // 3 columns * 8 rows

    // This function only updates the URL. The useEffect below will handle the actual fetching.
    const handleSearch = (e?: React.FormEvent, newOffset = 0) => {
        if (e) e.preventDefault();
        
        const params: any = { 
            q, 
            organisme, 
            objecte, 
            minImporte, 
            maxImporte, 
            fechaDesde, 
            fechaHasta, 
            offset: newOffset 
        };
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== '' && v !== 0 && v !== undefined && v !== null)
        );
        
        setSearchParams(cleanParams as any);
        setOffset(newOffset);
    };

    const performActualSearch = async (searchValues: any) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await api.searchGlobalContracts({
                q: searchValues.q || undefined,
                organisme: searchValues.organisme || undefined,
                objecte: searchValues.objecte || undefined,
                min_importe: searchValues.minImporte ? Number(searchValues.minImporte) : undefined,
                max_importe: searchValues.maxImporte ? Number(searchValues.maxImporte) : undefined,
                fecha_desde: searchValues.fechaDesde || undefined,
                fecha_hasta: searchValues.fechaHasta || undefined,
                limit,
                offset: Number(searchValues.offset) || 0
            });
            setResults(response.results);
            if (response.results.length === 0 && (!searchValues.offset || searchValues.offset == 0)) {
                setError("No s'han trobat contractes amb aquests criteris.");
            }
        } catch (err: any) {
            setError(err.message || "Error en cercar a l'API");
        } finally {
            setLoading(false);
        }
    };

    // Auto-search and sync state when URL params change
    useEffect(() => {
        const urlParams = Object.fromEntries(searchParams.entries());
        
        // Sync internal state with URL (crucial for back button)
        setQ(urlParams.q || '');
        setOrganisme(urlParams.organisme || '');
        setObjecte(urlParams.objecte || '');
        setMinImporte(urlParams.minImporte || '');
        setMaxImporte(urlParams.maxImporte || '');
        setFechaDesde(urlParams.fechaDesde || '');
        setFechaHasta(urlParams.fechaHasta || '');
        setOffset(Number(urlParams.offset) || 0);

        // Only perform search if we have any search criteria in the URL
        if (searchParams.toString()) {
            performActualSearch(urlParams);
        } else {
            // Clear results if URL is totally empty (first time visiting)
            setResults([]);
        }
        
    }, [searchParams]); // This will trigger on mount AND whenever URL changes (like back button)

    const formatCurrency = (amount: any) => {
        if (amount === undefined || amount === null) return '---';
        return new Intl.NumberFormat('ca-ES', { 
            style: 'currency', 
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(Number(amount));
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '---';
        return new Date(dateStr).toLocaleDateString('ca-ES');
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* Header section with Stats? No, just Title for now */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-200">
                            <Globe className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">SuperBuscador</h1>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="text-slate-500 text-sm font-medium">Connectat al Registre Públic de Contractació de Catalunya</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Controls Card */}
            <div className="glass-card overflow-visible p-1">
                <div className="p-6 space-y-6">
                    <form onSubmit={(e) => handleSearch(e)} className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Cerca global de conceptes..."
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 h-14 text-lg font-medium focus:bg-white focus:border-primary-500 transition-all outline-none"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`btn h-14 px-6 rounded-2xl flex items-center gap-2 transition-all ${
                                    showFilters ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-inner' : 'bg-white border-slate-200 text-slate-600'
                                }`}
                            >
                                <Filter size={20} />
                                <span className="font-bold">Filtres</span>
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary h-14 px-10 rounded-2xl shadow-lg shadow-primary-100 flex items-center gap-3"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" size={22} /> : <Search size={22} />}
                                <span className="text-lg">Cercar</span>
                            </button>
                        </div>
                    </form>

                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                            {/* Filter: Organisme */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 size={14} /> Organisme Public
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 h-11 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                    placeholder="ex: AJUNTAMENT DE BARCELONA"
                                    value={organisme}
                                    onChange={(e) => setOrganisme(e.target.value)}
                                />
                            </div>
                            
                            {/* Filter: Objecte */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14} /> Paraules Claus Objecte
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 h-11 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                    placeholder="ex: ASCENSORS, NETEJA..."
                                    value={objecte}
                                    onChange={(e) => setObjecte(e.target.value)}
                                />
                            </div>

                            {/* Filter: Import Range */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Euro size={14} /> Import Mínim (€)
                                </label>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 h-11 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                    placeholder="0"
                                    value={minImporte}
                                    onChange={(e) => setMinImporte(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Euro size={14} /> Import Màxim (€)
                                </label>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 h-11 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                    placeholder="ex: 100000"
                                    value={maxImporte}
                                    onChange={(e) => setMaxImporte(e.target.value)}
                                />
                            </div>

                            {/* Filter: Date Range */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} /> Públicat Des de
                                </label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 h-11 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} /> Públicat Fins
                                </label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 h-11 text-sm focus:bg-white focus:border-primary-500 transition-all outline-none"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-10 glass-card border-red-100 bg-red-50/20 text-center flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="text-red-600" size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-red-900">Cap resultat</h3>
                        <p className="text-red-700 mt-1 max-w-xs mx-auto">{error}</p>
                    </div>
                    <button 
                        onClick={() => { setQ(''); setOrganisme(''); setObjecte(''); setMinImporte(''); setMaxImporte(''); setFechaDesde(''); setFechaHasta(''); }}
                        className="btn btn-sm btn-ghost text-red-600 hover:bg-red-100 rounded-lg px-6"
                    >
                        Netejar filtres
                    </button>
                </div>
            )}

            {/* Results Grid - Using CARDS instead of Table */}
            {results.length > 0 && (
                <div className="space-y-8 pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {results.map((c, idx) => (
                            <div 
                                key={idx} 
                                className="glass-card group hover:scale-[1.02] hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer border-slate-100 border-2"
                                onClick={() => navigate(`/superbuscador/${encodeURIComponent(c.codi_expedient)}`)}
                            >
                                {/* Card Header: Flags/Badges */}
                                <div className="p-4 flex items-start justify-between bg-slate-50/50 group-hover:bg-primary-50/30 transition-colors border-b border-slate-100">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-white border border-slate-200 text-slate-500 text-[10px] uppercase font-black px-2 py-0.5 rounded shadow-sm">
                                                {c.tipus_contracte || 'CONTRACTE'}
                                            </span>
                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded shadow-sm ${
                                                c.estat_actual === 'Adjudicat' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                c.estat_actual === 'Formalitzat' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                'bg-amber-100 text-amber-700 border border-amber-200'
                                            }`}>
                                                {c.estat_actual}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                                            <Hash size={12} />
                                            <span className="text-[10px] font-mono tracking-tight font-bold">{c.codi_expedient}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <FavoriteButton codi_expedient={c.codi_expedient} />
                                    </div>
                                </div>

                                {/* Card Body: Object and Org */}
                                <div className="p-5 flex-1 flex flex-col gap-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-primary-600">
                                            <Building2 size={14} className="shrink-0" />
                                            <span className="text-xs font-black uppercase tracking-tight truncate" title={c.nom_organ}>
                                                {c.nom_organ}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 line-clamp-3 leading-snug group-hover:text-primary-800 transition-colors">
                                            {c.objecte_contracte}
                                        </h3>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pressupost</span>
                                            <span className="text-lg font-black text-slate-900 leading-none">
                                                {formatCurrency(c.import_adjudicacio_amb_iva || c.pressupost_licitacio_amb_iva)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Publicat</span>
                                            <div className="flex items-center gap-1 text-slate-600 font-bold text-xs uppercase">
                                                <Calendar size={12} />
                                                {formatDate(c.data_publicacio_contracte)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer: Actions */}
                                <div className="px-5 py-3 bg-slate-50/30 flex items-center gap-2 justify-end border-t border-slate-50">
                                    <button 
                                        className="btn btn-xs btn-ghost text-slate-400 hover:text-primary-600 gap-1.5 hover:bg-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/superbuscador/${encodeURIComponent(c.codi_expedient)}`);
                                        }}
                                    >
                                        <Maximize2 size={12} /> Detall
                                    </button>
                                    <a 
                                        href={c.enllac_publicacio?.url || c.url_plataforma_contractacio} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn btn-xs btn-ghost text-slate-400 hover:text-primary-600 gap-1.5 hover:bg-white"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink size={12} /> Plataforma
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 pt-8 border-t border-slate-200">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                            Resultats <span className="text-primary-600 px-1">{offset + 1}</span> - <span className="text-primary-600 px-1">{offset + results.length}</span>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => handleSearch(undefined, Math.max(0, offset - limit))}
                                disabled={offset === 0 || loading}
                                className="btn rounded-xl bg-white border-slate-200 text-slate-700 px-8 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all"
                            >
                                <ChevronLeft size={20} className="mr-1" /> Anterior
                            </button>
                            <button 
                                onClick={() => handleSearch(undefined, offset + limit)}
                                disabled={results.length < limit || loading}
                                className="btn rounded-xl bg-white border-slate-200 text-slate-700 px-8 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all"
                            >
                                Següent <ChevronRight size={20} className="ml-1" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && results.length === 0 && !error && (
                <div className="py-32 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-8">
                        <div className="absolute -inset-4 bg-primary-100 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                        <Globe size={100} className="text-slate-200 relative" />
                        <Search className="absolute bottom-0 right-0 text-primary-400" size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Benvingut al SuperBuscador</h3>
                    <p className="text-slate-400 max-w-md font-medium">Troba referències de contractació de qualsevol administració de Catalunya per comparar preus i procediments.</p>
                </div>
            )}
        </div>
    );
}
