import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, ContratoListItem, Departamento, Empleado } from '../api/client';
import { Search, Filter, ChevronLeft, ChevronRight, ExternalLink, Clock, AlertCircle, FileText } from 'lucide-react';
import { useSortableData, SortableTh } from '../components/SortableTable';

interface ContratosProps {
    hideHeader?: boolean;
}

export default function Contratos({ hideHeader = false }: ContratosProps) {
    const navigate = useNavigate();
    const [contratosRaw, setContratosRaw] = useState<ContratoListItem[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [user, setUser] = useState<Empleado | null>(null);
    const [selectedContracts, setSelectedContracts] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    
    const [urlParams, setUrlParams] = useSearchParams();

    // LOCAL TEXT STATES (for smooth typing)
    const [localBusqueda, setLocalBusqueda] = useState(urlParams.get('busqueda') || '');
    const [localAdjudicatari, setLocalAdjudicatari] = useState(urlParams.get('adjudicatari_nom') || '');

    // DERIVED STATE FROM URL
    const searchState = {
        busqueda: urlParams.get('busqueda') || '',
        estat_actual: urlParams.get('estat_actual') || '',
        tipus_contracte: urlParams.get('tipus_contracte') || '',
        estado_interno: urlParams.get('estado_interno') || '',
        adjudicatari_nom: urlParams.get('adjudicatari_nom') || '',
        any_adjudicacio: urlParams.get('any_adjudicacio') || '',
        te_prorroga: urlParams.get('te_prorroga') || '',
        alerta_finalitzacio: urlParams.get('alerta_finalitzacio') || '',
        possiblement_finalitzat: urlParams.get('possiblement_finalitzat') || '',
        departamento_id: urlParams.get('departamento_id') || '',
        sense_departament: urlParams.get('sense_departament') === 'true',
    };

    const page = Number(urlParams.get('page')) || 0;
    const limit = Number(urlParams.get('limit')) || 50;

    const { sortedItems: contratos, sortConfig, requestSort } = useSortableData(contratosRaw);

    useEffect(() => {
        loadDepartamentos();
        api.getMe().then(setUser).catch(console.error);
    }, []);

    // Main data fetching effect: depends only on URL
    useEffect(() => {
        // Sync local text states with URL (crucial for back button)
        setLocalBusqueda(urlParams.get('busqueda') || '');
        setLocalAdjudicatari(urlParams.get('adjudicatari_nom') || '');
        
        loadContratos();
        setSelectedContracts(new Set());
    }, [urlParams]); 

    const updateURL = (newFilters: any) => {
        const nextParams = Object.fromEntries(urlParams.entries());
        const resetPage = !('page' in newFilters) && !('limit' in newFilters);
        
        const merged = { ...nextParams, ...newFilters, tab: 'ordinarios' };
        if (resetPage) merged.page = '0';
        
        const cleanParams = Object.fromEntries(
            Object.entries(merged).filter(([_, v]) => v !== '' && v !== false && v !== undefined && v !== null && v !== '0')
        );
        setUrlParams(cleanParams as any);
    };

    const loadDepartamentos = async () => {
        try {
            const depts = await api.getDepartamentos();
            setDepartamentos(depts);
        } catch (err) {
            console.error('Error loading departamentos:', err);
        }
    };

    const loadContratos = async () => {
        try {
            setLoading(true);
            const params: Record<string, string | number | boolean> = {
                skip: page * limit,
                limit: limit,
                busqueda: searchState.busqueda,
                estat_actual: searchState.estat_actual,
                tipus_contracte: searchState.tipus_contracte,
                estado_interno: searchState.estado_interno,
                adjudicatari_nom: searchState.adjudicatari_nom,
            };

            if (searchState.departamento_id) params.departamento_id = parseInt(searchState.departamento_id);
            if (searchState.te_prorroga === 'true') params.te_prorroga = true;
            if (searchState.te_prorroga === 'false') params.te_prorroga = false;
            if (searchState.alerta_finalitzacio === 'true') params.alerta_finalitzacio = true;
            if (searchState.possiblement_finalitzat === 'true') params.possiblement_finalitzat = true;
            if (searchState.sense_departament) params.sense_departament = true;

            if (searchState.any_adjudicacio) {
                const year = parseInt(searchState.any_adjudicacio);
                params.fecha_inicio_desde = `${year}-01-01`;
                params.fecha_inicio_hasta = `${year}-12-31`;
            }

            const data = await api.getContratos(params);
            setContratosRaw(data);
        } catch (err) {
            console.error('Error loading contratos:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('ca-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const getEstadoInternoBadge = (estado: string) => {
        switch (estado) {
            case 'pendiente_aprobacion': return <span className="badge badge-pending">Pendent</span>;
            case 'aprobado': return <span className="badge badge-success">Aprovat</span>;
            case 'rechazado': return <span className="badge badge-error">Rebutjat</span>;
            default: return null;
        }
    };

    const getExpirationBadge = (contrato: ContratoListItem) => {
        if (contrato.possiblement_finalitzat) {
            return <span className="badge bg-red-100 text-red-800 flex items-center gap-1"><AlertCircle size={12} />Finalitzat?</span>;
        }
        if (contrato.alerta_finalitzacio) {
            return <span className="badge bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock size={12} />Pròxim</span>;
        }
        return null;
    };

    const toggleContractSelect = (id: number) => {
        const newSet = new Set(selectedContracts);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedContracts(newSet);
    };

    const toggleAllContracts = () => {
        if (selectedContracts.size === contratos.length && contratos.length > 0) setSelectedContracts(new Set());
        else setSelectedContracts(new Set(contratos.map(c => c.id)));
    };

    const handleMassAssign = async (deptId: string) => {
        const targetDept = deptId ? parseInt(deptId) : null;
        if (selectedContracts.size === 0) return;
        try {
            await api.asignarMasivoDepartamentos(Array.from(selectedContracts), targetDept);
            await loadContratos();
            setSelectedContracts(new Set());
        } catch (err) {
            console.error("Error doing mass assign:", err);
            alert("Error a l'assignar massivament els contractes.");
        }
    };

    const canAssign = user?.rol === 'admin' || user?.rol === 'responsable_contratacion';
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleResetFilters = () => {
        setLocalBusqueda('');
        setLocalAdjudicatari('');
        setUrlParams({ tab: 'ordinarios' });
    };

    const handleExportCSV = async () => {
        const params = new URLSearchParams();
        params.append('busqueda', searchState.busqueda);
        if (searchState.estat_actual) params.append('estat_actual', searchState.estat_actual);
        if (searchState.tipus_contracte) params.append('tipus_contracte', searchState.tipus_contracte);
        if (searchState.estado_interno) params.append('estado_interno', searchState.estado_interno);
        if (searchState.adjudicatari_nom) params.append('adjudicatari_nom', searchState.adjudicatari_nom);
        if (searchState.departamento_id) params.append('departamento_id', searchState.departamento_id);
        if (searchState.te_prorroga !== '') params.append('te_prorroga', searchState.te_prorroga);
        if (searchState.alerta_finalitzacio !== '') params.append('alerta_finalitzacio', searchState.alerta_finalitzacio);
        if (searchState.possiblement_finalitzat !== '') params.append('possiblement_finalitzat', searchState.possiblement_finalitzat);
        if (searchState.sense_departament) params.append('sense_departament', 'true');
        if (searchState.any_adjudicacio) {
            const year = parseInt(searchState.any_adjudicacio);
            params.append('fecha_inicio_desde', `${year}-01-01`);
            params.append('fecha_inicio_hasta', `${year}-12-31`);
        }
        const { access } = (await import('../api/client')).getTokens();
        if (access) params.append('token', access);
        window.open(`/api/contratos/export/csv?${params.toString()}`, '_blank');
    };

    return (
        <div className="space-y-4 w-full h-full flex flex-col overflow-hidden relative">
            {!hideHeader && (
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Contractes</h1>
                        <p className="text-xs text-slate-500">Gestió i consulta de contractació</p>
                    </div>
                </div>
            )}

            {/* High-End Professional Toolbar */}
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm shrink-0 mb-2">
                {/* Segmented Control (Toggle) */}
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                    <button className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all bg-white text-slate-800 shadow-sm" onClick={() => navigate('/contratacion')}>Majors</button>
                    <button className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-700" onClick={() => navigate('/contratos-menores')}>Menors</button>
                </div>

                {/* Search Section */}
                <div className="flex-1 flex items-center gap-3 px-4 h-11 bg-slate-50/50 rounded-xl border border-slate-100 focus-within:bg-white focus-within:border-primary-200 focus-within:ring-4 focus-within:ring-primary-500/5 transition-all duration-200">
                    <Search className="text-slate-400 shrink-0" size={18} />
                    <input 
                        type="text" 
                        placeholder="Cerca per expedient, projecte o paraula clau..." 
                        className="bg-transparent border-none focus:ring-0 w-full text-sm text-slate-700 placeholder:text-slate-400 font-medium"
                        value={localBusqueda}
                        onChange={(e) => setLocalBusqueda(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && updateURL({ busqueda: localBusqueda })}
                        onBlur={() => updateURL({ busqueda: localBusqueda })}
                    />
                </div>

                <div className="flex items-center gap-2 px-1">
                    <select className="h-10 px-4 bg-slate-50 border-transparent rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus:ring-0 min-w-[140px]" value={searchState.departamento_id} onChange={(e) => updateURL({ departamento_id: e.target.value })}>
                        <option value="">Departaments</option>
                        {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>

                    <select className="h-10 px-4 bg-slate-50 border-transparent rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus:ring-0 min-w-[100px]" value={searchState.any_adjudicacio} onChange={(e) => updateURL({ any_adjudicacio: e.target.value })}>
                        <option value="">Exercicis</option>
                        {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - i).map(year => <option key={year} value={year}>{year}</option>)}
                    </select>

                    <button onClick={() => setShowAdvanced(!showAdvanced)} className={`h-11 px-5 rounded-xl border-2 flex items-center gap-2 font-bold text-sm transition-all duration-200 ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-inner' : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 active:scale-95'}`}>
                        <Filter size={18} />
                        Filtres
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-1"></div>

                    <button onClick={handleExportCSV} className="h-11 w-11 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:bg-slate-50 hover:text-primary-600 border border-slate-100 hover:border-primary-100 shadow-sm transition-all active:scale-95" title="Exportar CSV">
                        <ExternalLink size={20} />
                    </button>
                </div>
            </div>

            {showAdvanced && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-200 z-20 shrink-0 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Configuració</label>
                            <div className="grid grid-cols-2 gap-3">
                                <select 
                                    className="h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-primary-200 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none w-full cursor-pointer" 
                                    value={searchState.tipus_contracte} 
                                    onChange={(e) => updateURL({ tipus_contracte: e.target.value })}
                                >
                                    <option value="">Tipus</option>
                                    <option value="Subministraments">Subministraments</option>
                                    <option value="Serveis">Serveis</option>
                                    <option value="Obres">Obres</option>
                                </select>
                                <select 
                                    className="h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-primary-200 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none w-full cursor-pointer" 
                                    value={searchState.estat_actual} 
                                    onChange={(e) => updateURL({ estat_actual: e.target.value })}
                                >
                                    <option value="">Estat</option>
                                    <option value="En execució">En execució</option>
                                    <option value="Finalitzat">Finalitzat</option>
                                    <option value="Rescrit">Rescrit</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Adjudicatari</label>
                            <input 
                                type="text" 
                                className="h-10 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-primary-200 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none w-full placeholder:text-slate-400" 
                                placeholder="NIF o nom..." 
                                value={localAdjudicatari} 
                                onChange={(e) => setLocalAdjudicatari(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && updateURL({ adjudicatari_nom: localAdjudicatari })}
                                onBlur={() => updateURL({ adjudicatari_nom: localAdjudicatari })}
                            />
                        </div>

                        <div className="lg:col-span-2 space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alertes i estats</label>
                            <div className="flex flex-wrap items-center gap-6 pt-1">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-500 transition-all cursor-pointer" checked={searchState.te_prorroga === 'true'} onChange={(e) => updateURL({ te_prorroga: e.target.checked ? 'true' : '' })} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-primary-600 transition-colors">Prorrogables</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-red-600 focus:ring-red-500 transition-all cursor-pointer" checked={searchState.alerta_finalitzacio === 'true'} onChange={(e) => updateURL({ alerta_finalitzacio: e.target.checked ? 'true' : '' })} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-red-600 transition-colors">Alerta Finalització</span>
                                </label>
                                {canAssign && (
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-orange-600 focus:ring-orange-500 transition-all cursor-pointer" checked={searchState.sense_departament} onChange={(e) => updateURL({ sense_departament: e.target.checked })} />
                                        </div>
                                        <span className="text-xs font-bold text-orange-600 group-hover:text-orange-500 transition-colors">Sense assignar</span>
                                    </label>
                                )}
                                <button onClick={handleResetFilters} className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] rounded-xl transition-all font-bold uppercase ml-auto active:scale-95 shadow-sm border border-slate-200">Netejar filtres</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-card flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64"><div className="loading-spinner"></div></div>
                    ) : contratos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center opacity-60">
                             <FileText size={48} className="text-slate-200 mb-2" />
                             <p className="text-sm font-medium text-slate-400 tracking-tight uppercase tracking-widest">Cap contracte trobat</p>
                        </div>
                    ) : (
                        <table className="table border-collapse w-full text-sm">
                            <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    {canAssign && (
                                        <th className="w-10 text-center px-4 py-3 bg-slate-50 border-b border-slate-100">
                                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600 cursor-pointer" checked={contratos.length > 0 && selectedContracts.size === contratos.length} onChange={toggleAllContracts} />
                                        </th>
                                    )}
                                    <SortableTh label="Expedient" sortKey="codi_expedient" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Objecte" sortKey="objecte_contracte" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Adjudicatari" sortKey="adjudicatari_nom" sortConfig={sortConfig} onSort={requestSort} />
                                    <th className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500 tracking-wider text-center">Atributs</th>
                                    <SortableTh label="Import" sortKey="import_adjudicacio_amb_iva" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Fase" sortKey="estat_actual" sortConfig={sortConfig} onSort={requestSort} />
                                    <th className="px-4 py-3 bg-slate-50 border-b border-slate-100"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {contratos.map((contrato) => (
                                    <tr 
                                        key={contrato.id} 
                                        className={`cursor-pointer transition-colors group ${contrato.possiblement_finalitzat ? 'bg-red-50/30 hover:bg-red-100/30' : contrato.alerta_finalitzacio ? 'bg-yellow-50/30 hover:bg-yellow-100/30' : 'hover:bg-slate-50/80'} ${selectedContracts.has(contrato.id) ? 'bg-primary-50/70' : ''}`}
                                        onClick={() => navigate(`/contratos/${contrato.id}`)}
                                    >
                                        {canAssign && (
                                            <td className="text-center px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600 cursor-pointer" checked={selectedContracts.has(contrato.id)} onChange={() => toggleContractSelect(contrato.id)} />
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="font-semibold text-slate-800 text-[13px]">{contrato.codi_expedient}</span>
                                                    {getEstadoInternoBadge(contrato.estado_interno)}
                                                    {getExpirationBadge(contrato)}
                                                </div>
                                                {contrato.departamento_id && <div className="text-[10px] text-primary-600 font-bold uppercase tracking-tight">{departamentos.find(d => d.id === contrato.departamento_id)?.nombre || "Dep."}</div>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span 
                                                className="text-slate-600 line-clamp-1 text-[13px] hover:text-slate-900 transition-colors" 
                                                title={contrato.objecte_contracte || ''}
                                            >
                                                {contrato.objecte_contracte || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 text-[13px] truncate max-w-[200px]">{contrato.adjudicatari_nom || '-'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                {(contrato.num_lots ?? 0) > 0 && (
                                                    <div className="relative w-6 h-6 flex items-center justify-center" title={`${contrato.num_lots} Lots`}>
                                                        <span className="text-[12px] font-bold text-blue-300">L</span>
                                                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm border border-white">
                                                            {contrato.num_lots}
                                                        </span>
                                                    </div>
                                                )}
                                                {(contrato.num_prorrogues ?? 0) > 0 && (
                                                    <div className="relative w-6 h-6 flex items-center justify-center" title={`${contrato.num_prorrogues} Pròrrogues`}>
                                                        <span className="text-[12px] font-bold text-purple-300">P</span>
                                                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-purple-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm border border-white">
                                                            {contrato.num_prorrogues}
                                                        </span>
                                                    </div>
                                                )}
                                                {((contrato as any).num_modificacions ?? 0) > 0 && (
                                                    <div className="relative w-6 h-6 flex items-center justify-center" title={`${(contrato as any).num_modificacions} Modificacions`}>
                                                        <span className="text-[12px] font-bold text-orange-300">M</span>
                                                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-orange-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm border border-white">
                                                            {(contrato as any).num_modificacions}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-800 text-[13px] text-right tabular-nums whitespace-nowrap">{formatCurrency(contrato.import_adjudicacio_amb_iva)}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold whitespace-nowrap block text-center">
                                                {contrato.estat_actual || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right"><ChevronRight size={16} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {contratos.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50 shrink-0">
                        <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                            <span>Mostrant {page * limit + 1}-{page * limit + contratos.length}</span>
                            <select className="bg-transparent border-none py-0 pl-1 pr-6 focus:ring-0 cursor-pointer hover:text-slate-800 outline-none" value={limit} onChange={(e) => { const newLimit = parseInt(e.target.value); updateURL({ limit: newLimit, page: 0 }); localStorage.setItem('contratos_limit', newLimit.toString()); }}>
                                <option value="50">Veure 50</option><option value="100">Veure 100</option><option value="200">Veure 200</option><option value="500">Veure 500</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-1">
                            <button className="p-1 px-3 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-600" onClick={() => updateURL({ page: Math.max(0, page - 1) })} disabled={page === 0}><ChevronLeft size={16} /></button>
                            <span className="text-[11px] font-bold px-2 text-slate-700 font-mono">PÀGINA {page + 1}</span>
                            <button className="p-1 px-3 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-600" onClick={() => updateURL({ page: page + 1 })} disabled={contratos.length < limit}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {selectedContracts.size > 0 && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-300 z-50 border border-slate-700">
                    <div className="flex items-center gap-3 border-r border-slate-700 pr-6 mr-1">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center font-bold text-sm">{selectedContracts.size}</div>
                        <span className="text-sm font-bold tracking-tight uppercase tracking-wider text-[10px]">Expedients seleccionats</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {canAssign && (
                            <div className="flex items-center gap-2">
                                <select className="bg-slate-800 border-slate-700 text-white text-xs rounded-lg py-1.5 focus:ring-primary-500" id="floating-assign-select" defaultValue="">
                                    <option value="" disabled>Assignar a...</option><option value="none">-- Sense Departament --</option>
                                    {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                </select>
                                <button className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-2" onClick={() => { const select = document.getElementById('floating-assign-select') as HTMLSelectElement; if (select.value) { handleMassAssign(select.value === 'none' ? '' : select.value); select.value = ''; } }}>Assignar</button>
                            </div>
                        )}
                        <button onClick={handleExportCSV} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors flex items-center gap-2"><ExternalLink size={14} />Exportar CSV</button>
                        <button className="text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-colors ml-2" onClick={() => setSelectedContracts(new Set())}>Cancel·lar</button>
                    </div>
                </div>
            )}
        </div>
    );
}
