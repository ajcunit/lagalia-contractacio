import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, ContratoMenor, Departamento, Empleado } from '../api/client';
import { Search, Filter, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { useSortableData, SortableTh } from '../components/SortableTable';

interface ContratosMenoresProps {
    hideHeader?: boolean;
}

export default function ContratosMenores({ hideHeader = false }: ContratosMenoresProps) {
    const navigate = useNavigate();
    const [contratosRaw, setContratosRaw] = useState<ContratoMenor[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [user, setUser] = useState<Empleado | null>(null);
    const [selectedContracts, setSelectedContracts] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    
    const [urlParams, setUrlParams] = useSearchParams();

    // LOCAL TEXT STATES (for smooth typing)
    const [localSearch, setLocalSearch] = useState(urlParams.get('search') || '');
    const [localAdjudicatari, setLocalAdjudicatari] = useState(urlParams.get('adjudicatari') || '');

    // DERIVED STATE FROM URL
    const searchState = {
        search: urlParams.get('search') || '',
        adjudicatari: urlParams.get('adjudicatari') || '',
        exercici: urlParams.get('exercici') || '',
        departamento_id: urlParams.get('departamento_id') || '',
        estado_interno: urlParams.get('estado_interno') || '',
        sense_departament: urlParams.get('sense_departament') === 'true',
    };

    const page = Number(urlParams.get('page')) || 0;
    const limit = 50;

    const { sortedItems: contratos, sortConfig, requestSort } = useSortableData(contratosRaw);

    useEffect(() => {
        loadDepartamentos();
        api.getMe().then(setUser).catch(console.error);
    }, []);

    // Main data fetching effect: depends only on URL
    useEffect(() => {
        // Sync local text states with URL (crucial for back button)
        setLocalSearch(urlParams.get('search') || '');
        setLocalAdjudicatari(urlParams.get('adjudicatari') || '');
        
        loadContratos();
        setSelectedContracts(new Set());
    }, [urlParams]); 

    const updateURL = (newFilters: any) => {
        const nextParams = Object.fromEntries(urlParams.entries());
        const resetPage = !('page' in newFilters);
        
        const merged = { ...nextParams, ...newFilters, tab: 'menores' };
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
            const params: any = {
                skip: page * limit,
                limit: limit,
                search: searchState.search,
                adjudicatari: searchState.adjudicatari,
                estado_interno: searchState.estado_interno,
            };

            if (searchState.exercici) params.exercici = parseInt(searchState.exercici);
            if (searchState.departamento_id) params.departamento_id = parseInt(searchState.departamento_id);
            if (searchState.sense_departament) params.sense_departament = true;

            const data = await api.getContratosMenores(params);
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
            await api.asignarMasivoMenores(Array.from(selectedContracts), targetDept ? [targetDept] : []);
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
        setLocalSearch('');
        setLocalAdjudicatari('');
        setUrlParams({ tab: 'menores' });
    };

    return (
        <div className="space-y-4 w-full h-full flex flex-col overflow-hidden relative">
            {!hideHeader && (
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Contractes Menors</h1>
                        <p className="text-xs text-slate-500">Gestió i consulta de contractació menor</p>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm shrink-0 mb-2">
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                    <button className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-700" onClick={() => navigate('/contratacion')}>Majors</button>
                    <button className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all bg-white text-slate-800 shadow-sm" onClick={() => navigate('/contratos-menores')}>Menors</button>
                </div>

                <div className="flex-1 flex items-center gap-3 px-4 h-11 bg-slate-50/50 rounded-xl border border-slate-100 focus-within:bg-white focus-within:border-primary-200 focus-within:ring-4 focus-within:ring-primary-500/5 transition-all duration-200">
                    <Search className="text-slate-400 shrink-0" size={18} />
                    <input 
                        type="text" 
                        placeholder="Cerca per expedient, projecte o paraula clau..." 
                        className="bg-transparent border-none focus:ring-0 w-full text-sm text-slate-700 placeholder:text-slate-400 font-medium outline-none"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && updateURL({ search: localSearch })}
                        onBlur={() => updateURL({ search: localSearch })}
                    />
                </div>

                <div className="flex items-center gap-2 px-1">
                    <select className="h-10 px-4 bg-slate-50 border-transparent rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus:ring-0 min-w-[140px] outline-none" value={searchState.departamento_id} onChange={(e) => updateURL({ departamento_id: e.target.value })}>
                        <option value="">Departaments</option>
                        {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>

                    <select className="h-10 px-4 bg-slate-50 border-transparent rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus:ring-0 min-w-[100px] outline-none" value={searchState.exercici} onChange={(e) => updateURL({ exercici: e.target.value })}>
                        <option value="">Exercicis</option>
                        {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - i).map(year => <option key={year} value={year}>{year}</option>)}
                    </select>

                    <button onClick={() => setShowAdvanced(!showAdvanced)} className={`h-11 px-5 rounded-xl border-2 flex items-center gap-2 font-bold text-sm transition-all duration-200 outline-none ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-inner' : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 active:scale-95'}`}>
                        <Filter size={18} />
                        Filtres
                    </button>
                </div>
            </div>

            {showAdvanced && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-200 z-20 shrink-0 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Adjudicatari</label>
                            <input 
                                type="text" 
                                className="h-10 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-primary-200 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none w-full placeholder:text-slate-400" 
                                placeholder="NIF o nom..." 
                                value={localAdjudicatari} 
                                onChange={(e) => setLocalAdjudicatari(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && updateURL({ adjudicatari: localAdjudicatari })}
                                onBlur={() => updateURL({ adjudicatari: localAdjudicatari })}
                            />
                        </div>

                        <div className="lg:col-span-3 space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alertes i estats</label>
                            <div className="flex flex-wrap items-center gap-6 pt-1">
                                <select 
                                    className="h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-primary-200 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none min-w-[150px] cursor-pointer" 
                                    value={searchState.estado_interno} 
                                    onChange={(e) => updateURL({ estado_interno: e.target.value })}
                                >
                                    <option value="">Tots els estats</option>
                                    <option value="pendiente_aprobacion">Pendent</option>
                                    <option value="aprobado">Aprovat</option>
                                    <option value="rechazado">Rebutjat</option>
                                </select>

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
                             <ScrollText size={48} className="text-slate-200 mb-2" />
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
                                    <SortableTh label="Objecte" sortKey="descripcio_expedient" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Adjudicatari" sortKey="adjudicatari" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Import" sortKey="import_adjudicacio" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Exercici" sortKey="exercici" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Departaments" sortKey="departamentos" sortConfig={sortConfig} onSort={requestSort} />
                                    <th className="px-4 py-3 bg-slate-50 border-b border-slate-100"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {contratos.map((contrato) => (
                                    <tr 
                                        key={contrato.id} 
                                        className={`cursor-pointer transition-colors group hover:bg-slate-50/80 ${selectedContracts.has(contrato.id) ? 'bg-primary-50/70' : ''}`}
                                        onClick={() => navigate(`/contratos-menores/${contrato.id}`)}
                                    >
                                        {canAssign && (
                                            <td className="text-center px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600 cursor-pointer" checked={selectedContracts.has(contrato.id)} onChange={() => toggleContractSelect(contrato.id)} />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-slate-800 font-semibold">{contrato.codi_expedient}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-600 line-clamp-1 text-[13px]" title={contrato.descripcio_expedient}>{contrato.descripcio_expedient}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 text-[13px]">{contrato.adjudicatari}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800 text-right tabular-nums whitespace-nowrap">{formatCurrency(contrato.import_adjudicacio)}</td>
                                        <td className="px-4 py-3 text-center tabular-nums">
                                            <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">{contrato.exercici}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {contrato.departamentos && contrato.departamentos.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {contrato.departamentos.map(d => (
                                                        <span key={d.id} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                                                            {d.nombre}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums"><ChevronRight size={16} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {contratos.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50 shrink-0">
                        <div className="text-[11px] text-slate-500 font-medium">
                            Mostrant {page * limit + 1}-{page * limit + contratos.length} expedients
                        </div>
                        <div className="flex items-center gap-1">
                            <button className="p-1 px-3 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-600 outline-none" onClick={() => updateURL({ page: Math.max(0, page - 1) })} disabled={page === 0}><ChevronLeft size={16} /></button>
                            <span className="text-[11px] font-bold px-2 text-slate-700 font-mono">PÀGINA {page + 1}</span>
                            <button className="p-1 px-3 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-600 outline-none" onClick={() => updateURL({ page: page + 1 })} disabled={contratos.length < limit}><ChevronRight size={16} /></button>
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
                                <select className="bg-slate-800 border-slate-700 text-white text-xs rounded-lg py-1.5 focus:ring-primary-500 outline-none" id="floating-assign-select-menores" defaultValue="">
                                    <option value="" disabled>Assignar a...</option><option value="none">-- Sense Departament --</option>
                                    {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                </select>
                                <button className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-2 outline-none" onClick={() => { const select = document.getElementById('floating-assign-select-menores') as HTMLSelectElement; if (select.value) { handleMassAssign(select.value === 'none' ? '' : select.value); select.value = ''; } }}>Assignar</button>
                            </div>
                        )}
                        <button className="text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-colors outline-none" onClick={() => setSelectedContracts(new Set())}>Cancel·lar</button>
                    </div>
                </div>
            )}
        </div>
    );
}
