import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ContratoListItem, FiltroOpciones, Departamento, Empleado } from '../api/client';
import { Search, Filter, ChevronLeft, ChevronRight, ExternalLink, Clock, AlertCircle, Calendar, Layers, CheckSquare } from 'lucide-react';
import { useSortableData, SortableTh } from '../components/SortableTable';

export default function Contratos() {
    const [contratosRaw, setContratosRaw] = useState<ContratoListItem[]>([]);
    const [filtros, setFiltros] = useState<FiltroOpciones | null>(null);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [user, setUser] = useState<Empleado | null>(null);
    const [selectedContracts, setSelectedContracts] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const { sortedItems: contratos, sortConfig, requestSort } = useSortableData(contratosRaw);
    const [showFilters, setShowFilters] = useState(false);

    const [urlParams] = useSearchParams();

    const [searchParams, setSearchParams] = useState({
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
    });

    // Generate year options (current year to 10 years back)
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i);

    const LIMIT = 50;

    useEffect(() => {
        loadFiltros();
        loadDepartamentos();
        api.getMe().then(setUser).catch(console.error);
    }, []);

    useEffect(() => {
        loadContratos();
        // Reset selections when search/page changes to avoid accidental mass assigns across filters
        setSelectedContracts(new Set());
    }, [page, searchParams]);
    
    const loadDepartamentos = async () => {
        try {
            const depts = await api.getDepartamentos();
            setDepartamentos(depts);
        } catch (err) {
            console.error('Error loading departamentos:', err);
        }
    };

    const loadFiltros = async () => {
        try {
            const data = await api.getFiltroOpciones();
            setFiltros(data);
        } catch (err) {
            console.error('Error loading filtros:', err);
        }
    };

    const loadContratos = async () => {
        try {
            setLoading(true);

            // Build params, converting year to date range
            const params: Record<string, string | number | boolean> = {
                skip: page * LIMIT,
                limit: LIMIT,
                busqueda: searchParams.busqueda,
                estat_actual: searchParams.estat_actual,
                tipus_contracte: searchParams.tipus_contracte,
                estado_interno: searchParams.estado_interno,
                adjudicatari_nom: searchParams.adjudicatari_nom,
            };

            if (searchParams.departamento_id) {
                params.departamento_id = parseInt(searchParams.departamento_id);
            }

            if (searchParams.te_prorroga !== '') {
                params.te_prorroga = searchParams.te_prorroga === 'true';
            }
            if (searchParams.alerta_finalitzacio !== '') {
                params.alerta_finalitzacio = searchParams.alerta_finalitzacio === 'true';
            }
            if (searchParams.possiblement_finalitzat !== '') {
                params.possiblement_finalitzat = searchParams.possiblement_finalitzat === 'true';
            }

            // Convert year to date range
            if (searchParams.any_adjudicacio) {
                const year = parseInt(searchParams.any_adjudicacio);
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);
        loadContratos();
    };

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('ca-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ca-ES');
    };

    const getEstadoInternoBadge = (estado: string) => {
        switch (estado) {
            case 'pendiente_aprobacion':
                return <span className="badge badge-pending">Pendent</span>;
            case 'aprobado':
                return <span className="badge badge-success">Aprovat</span>;
            case 'rechazado':
                return <span className="badge badge-error">Rebutjat</span>;
            default:
                return null;
        }
    };

    const getExpirationBadge = (contrato: ContratoListItem) => {
        if (contrato.possiblement_finalitzat) {
            return (
                <span className="badge bg-red-100 text-red-800 flex items-center gap-1" title="Possiblement finalitzat">
                    <AlertCircle size={12} />
                    Finalitzat?
                </span>
            );
        }
        if (contrato.alerta_finalitzacio) {
            return (
                <span className="badge bg-yellow-100 text-yellow-800 flex items-center gap-1" title="Finalitza en 6 mesos">
                    <Clock size={12} />
                    Pròxim
                </span>
            );
        }
        return null;
    };

    const getProrroguesBadge = (contrato: ContratoListItem) => {
        if (contrato.num_prorrogues && contrato.num_prorrogues > 0) {
            return (
                <span className="badge bg-blue-100 text-blue-800 flex items-center gap-1" title={`${contrato.num_prorrogues} pròrrogues`}>
                    <Calendar size={12} />
                    {contrato.num_prorrogues}
                </span>
            );
        }
        return null;
    };

    const toggleContractSelect = (id: number) => {
        const newSet = new Set(selectedContracts);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedContracts(newSet);
    };

    const toggleAllContracts = () => {
        if (selectedContracts.size === contratos.length && contratos.length > 0) {
            setSelectedContracts(new Set());
        } else {
            setSelectedContracts(new Set(contratos.map(c => c.id)));
        }
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

    return (
        <div className="space-y-6 w-full h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Contractes</h1>
                    <p className="text-slate-500">Gestió i consulta de contractes públics</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="glass-card p-4">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Cercar per expedient, objecte o adjudicatari..."
                                className="input input-search"
                                value={searchParams.busqueda}
                                onChange={(e) => setSearchParams({ ...searchParams, busqueda: e.target.value })}
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
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Estat Actual</label>
                                <select
                                    className="input"
                                    value={searchParams.estat_actual}
                                    onChange={(e) => setSearchParams({ ...searchParams, estat_actual: e.target.value })}
                                >
                                    <option value="">Tots els estats</option>
                                    {filtros?.estados.map((estado) => (
                                        <option key={estado} value={estado}>
                                            {estado}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Any Adjudicació</label>
                                <select
                                    className="input"
                                    value={searchParams.any_adjudicacio}
                                    onChange={(e) => setSearchParams({ ...searchParams, any_adjudicacio: e.target.value })}
                                >
                                    <option value="">Tots els anys</option>
                                    {yearOptions.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Adjudicatari</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Cercar adjudicatari..."
                                    value={searchParams.adjudicatari_nom}
                                    onChange={(e) => setSearchParams({ ...searchParams, adjudicatari_nom: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipus de Contracte</label>
                                <select
                                    className="input"
                                    value={searchParams.tipus_contracte}
                                    onChange={(e) => setSearchParams({ ...searchParams, tipus_contracte: e.target.value })}
                                >
                                    <option value="">Tots els tipus</option>
                                    {filtros?.tipos_contrato.map((tipo) => (
                                        <option key={tipo} value={tipo}>
                                            {tipo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Estat Intern</label>
                                <select
                                    className="input"
                                    value={searchParams.estado_interno}
                                    onChange={(e) => setSearchParams({ ...searchParams, estado_interno: e.target.value })}
                                >
                                    <option value="">Tots</option>
                                    <option value="normal">Normal</option>
                                    <option value="pendiente_aprobacion">Pendent d'aprovació</option>
                                    <option value="aprobado">Aprovat</option>
                                    <option value="rechazado">Rebutjat</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Té Pròrroga</label>
                                <select
                                    className="input"
                                    value={searchParams.te_prorroga}
                                    onChange={(e) => setSearchParams({ ...searchParams, te_prorroga: e.target.value })}
                                >
                                    <option value="">Tots</option>
                                    <option value="true">Sí</option>
                                    <option value="false">No</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Departament</label>
                                <select
                                    className="input"
                                    value={searchParams.departamento_id}
                                    onChange={(e) => setSearchParams({ ...searchParams, departamento_id: e.target.value })}
                                >
                                    <option value="">Tots els departaments</option>
                                    {departamentos.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {canAssign && (
                <div className={`glass-card p-4 flex items-center gap-6 border-l-4 border-l-primary-500 transition-all duration-300 overflow-visible ${selectedContracts.size === 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3 shrink-0">
                        <CheckSquare className="text-primary-600" size={24} />
                        <div>
                            <span className="font-semibold text-slate-800">{selectedContracts.size}</span>
                            <span className="text-slate-600 ml-1">contractes seleccionats</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                        <select 
                            className="input w-72 max-w-full bg-white shadow-sm"
                            id="mass-assign-select"
                            disabled={selectedContracts.size === 0}
                            defaultValue=""
                        >
                            <option value="" disabled>-- Selecciona un departament --</option>
                            <option value="none">-- Treure Departament --</option>
                            {departamentos.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.nombre}
                                </option>
                            ))}
                        </select>
                        <button 
                            className="btn btn-primary whitespace-nowrap shadow-sm gap-2"
                            disabled={selectedContracts.size === 0}
                            onClick={() => {
                                const select = document.getElementById('mass-assign-select') as HTMLSelectElement;
                                if (select.value) {
                                  handleMassAssign(select.value === 'none' ? '' : select.value);
                                  select.value = '';
                                }
                            }}
                        >
                            <CheckSquare size={18} />
                            Assignar Selecció
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="glass-card flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="loading-spinner w-10 h-10"></div>
                        </div>
                    ) : contratos.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">No s'han trobat contractes</p>
                        </div>
                    ) : (
                        <table className="table border-collapse w-full">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    {canAssign && (
                                        <th className="w-10 text-center px-4 py-3">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600"
                                                checked={contratos.length > 0 && selectedContracts.size === contratos.length}
                                                onChange={toggleAllContracts}
                                            />
                                        </th>
                                    )}
                                    <SortableTh label="Expedient" sortKey="codi_expedient" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Objecte" sortKey="objecte_contracte" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Adjudicatari" sortKey="adjudicatari_nom" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Import" sortKey="import_adjudicacio_amb_iva" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Data Inici" sortKey="data_inici" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Estat" sortKey="estat_actual" sortConfig={sortConfig} onSort={requestSort} />
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {contratos.map((contrato) => (
                                    <tr key={contrato.id} className={`${contrato.possiblement_finalitzat ? 'bg-red-50/50' : contrato.alerta_finalitzacio ? 'bg-yellow-50/50' : ''} ${selectedContracts.has(contrato.id) ? 'bg-primary-50/50' : ''}`}>
                                        {canAssign && (
                                            <td className="text-center px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600 cursor-pointer"
                                                    checked={selectedContracts.has(contrato.id)}
                                                    onChange={() => toggleContractSelect(contrato.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-slate-800">{contrato.codi_expedient}</span>
                                                    {getEstadoInternoBadge(contrato.estado_interno)}
                                                    {getExpirationBadge(contrato)}
                                                    {getProrroguesBadge(contrato)}
                                                    {contrato.num_lots && contrato.num_lots > 1 && (
                                                        <span className="badge bg-purple-100 text-purple-800 flex items-center gap-1" title={`${contrato.num_lots} lots`}>
                                                            <Layers size={12} />
                                                            {contrato.num_lots} lots
                                                        </span>
                                                    )}
                                                </div>
                                                {contrato.departamento_id && (
                                                    <div className="text-xs text-primary-700 bg-primary-50 py-0.5 px-2 rounded-md w-max border border-primary-100 flex items-center gap-1">
                                                        {departamentos.find(d => d.id === contrato.departamento_id)?.nombre || "Departament Asignat"}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span
                                                className="text-slate-600 line-clamp-2"
                                                title={contrato.objecte_contracte || ''}
                                            >
                                                {contrato.objecte_contracte
                                                    ? contrato.objecte_contracte.substring(0, 80) +
                                                    (contrato.objecte_contracte.length > 80 ? '...' : '')
                                                    : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-700">{contrato.adjudicatari_nom || '-'}</td>
                                        <td className="px-4 py-4 font-medium text-slate-800 number-display">
                                            {formatCurrency(contrato.import_adjudicacio_amb_iva)}
                                        </td>
                                        <td className="px-4 py-4 text-slate-600">{formatDate(contrato.data_inici)}</td>
                                        <td className="px-4 py-4">
                                            <span className="badge badge-info">{contrato.estat_actual || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Link
                                                to={`/contratos/${contrato.id}`}
                                                className="btn btn-secondary p-2"
                                                title="Veure detall"
                                            >
                                                <ExternalLink size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {contratos.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                        <p className="text-sm text-slate-500 font-medium">
                            Mostrant <span className="text-slate-800">{page * LIMIT + 1}</span> - <span className="text-slate-800">{page * LIMIT + contratos.length}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setPage(page + 1)}
                                disabled={contratos.length < LIMIT}
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
