import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ContratoMenor, Departamento, Empleado } from '../api/client';
import { Search, ChevronLeft, ChevronRight, ExternalLink, CheckSquare, Layers, Filter } from 'lucide-react';
import { useSortableData, SortableTh } from '../components/SortableTable';

export default function ContratosMenores() {
    const [contratosRaw, setContratosRaw] = useState<ContratoMenor[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [user, setUser] = useState<Empleado | null>(null);
    const [selectedContracts, setSelectedContracts] = useState<Set<number>>(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const { sortedItems: contratos, sortConfig, requestSort } = useSortableData(contratosRaw);

    const [urlParams] = useSearchParams();

    const [searchParams, setSearchParams] = useState({
        busqueda: urlParams.get('busqueda') || '',
        adjudicatari: urlParams.get('adjudicatari') || '',
        exercici: urlParams.get('exercici') || '',
        recent: urlParams.get('recent') === 'true',
        departamento_id: urlParams.get('departamento_id') || '',
        estado_interno: urlParams.get('estado_interno') || '',
    });

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i);

    const LIMIT = 50;

    useEffect(() => {
        loadDepartamentos();
        api.getMe().then(setUser).catch(console.error);
    }, []);

    useEffect(() => {
        loadContratos();
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

    const loadContratos = async () => {
        try {
            setLoading(true);

            const params: Record<string, string | number | boolean> = {
                skip: page * LIMIT,
                limit: LIMIT,
                search: searchParams.busqueda,
                adjudicatari: searchParams.adjudicatari,
            };

            if (searchParams.exercici) {
                params.exercici = parseInt(searchParams.exercici);
            }
            if (searchParams.recent) {
                params.recent = true;
            }
            if (searchParams.departamento_id) {
                params.departamento_id = parseInt(searchParams.departamento_id);
            }
            if (searchParams.estado_interno) {
                params.estado_interno = searchParams.estado_interno;
            }

            const data = await api.getContratosMenores(params);
            setContratosRaw(data);
        } catch (err) {
            console.error('Error loading contratos menores:', err);
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

    const toggleSelect = (id: number) => {
        const next = new Set(selectedContracts);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedContracts(next);
    };

    const toggleSelectAll = () => {
        if (selectedContracts.size === contratos.length) {
            setSelectedContracts(new Set());
        } else {
            setSelectedContracts(new Set(contratos.map(c => c.id)));
        }
    };

    const handleMassAssign = async (departamentoId: string) => {
        if (selectedContracts.size === 0) return;
        
        try {
            setLoading(true);
            const deptId = departamentoId === '' ? null : parseInt(departamentoId);
            await api.asignarMasivoMenores(Array.from(selectedContracts), deptId);
            setSelectedContracts(new Set());
            await loadContratos();
        } catch (err) {
            console.error('Error in mass assignment:', err);
            alert('Error al realitzar l\'assignació massiva');
        } finally {
            setLoading(false);
        }
    };

    const canAssign = user?.rol === 'admin' || user?.rol === 'responsable_contratacion';

    return (
        <div className="space-y-6 w-full h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Contractes Menors</h1>
                    <p className="text-slate-500">Gestió i consulta de l'adjudicació i liquidació de contractes menors</p>
                    {searchParams.recent && (
                        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            Filtre Especial: Mostrant només contractes de l'últim any (Red Flag)
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card p-4">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Cercar per expedient o descripció..."
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
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Exercici</label>
                                <select
                                    className="input"
                                    value={searchParams.exercici}
                                    onChange={(e) => setSearchParams({ ...searchParams, exercici: e.target.value })}
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
                                    value={searchParams.adjudicatari}
                                    onChange={(e) => setSearchParams({ ...searchParams, adjudicatari: e.target.value })}
                                />
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

            <div className="glass-card flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="loading-spinner w-10 h-10"></div>
                        </div>
                    ) : contratos.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">No s'han trobat contractes menors</p>
                        </div>
                    ) : (
                        <table className="table border-collapse w-full">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    {canAssign && (
                                        <th className="w-10 px-4 py-3">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                checked={contratos.length > 0 && selectedContracts.size === contratos.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                    )}
                                    <SortableTh label="Expedient" sortKey="codi_expedient" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Descripció" sortKey="descripcio_expedient" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Departament" sortKey="departamento_id" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Tipus" sortKey="tipus_contracte" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Adjudicatari" sortKey="adjudicatari" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Import (Sense IVA)" sortKey="import_adjudicacio" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableTh label="Liquidació" sortKey="tipus_liquidacio" sortConfig={sortConfig} onSort={requestSort} />
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {contratos.map((contrato) => (
                                    <tr key={contrato.id} className={selectedContracts.has(contrato.id) ? 'bg-blue-50' : ''}>
                                        {canAssign && (
                                            <td className="px-4 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    checked={selectedContracts.has(contrato.id)}
                                                    onChange={() => toggleSelect(contrato.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-4">
                                            <span className="font-medium text-slate-800">{contrato.codi_expedient}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span
                                                className="text-slate-600 line-clamp-2"
                                                title={contrato.descripcio_expedient || ''}
                                            >
                                                {contrato.descripcio_expedient
                                                    ? contrato.descripcio_expedient.substring(0, 80) +
                                                    (contrato.descripcio_expedient.length > 80 ? '...' : '')
                                                    : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {contrato.departamento_id ? (
                                                <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center w-fit gap-1">
                                                    <Layers size={12} />
                                                    {departamentos.find(d => d.id === contrato.departamento_id)?.nombre || 'Dept. ' + contrato.departamento_id}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Sense assignar</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-slate-600">{contrato.tipus_contracte || '-'}</td>
                                        <td className="px-4 py-4 text-slate-700">{contrato.adjudicatari || '-'}</td>
                                        <td className="px-4 py-4 font-medium text-slate-800 number-display">
                                            {formatCurrency(contrato.import_adjudicacio)}
                                        </td>
                                        <td className="px-4 py-4">
                                            {contrato.tipus_liquidacio ? (
                                                <span className="badge badge-success">{contrato.tipus_liquidacio}</span>
                                            ) : (
                                                <span className="badge badge-pending">Pendent</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <Link
                                                to={`/contratos-menores/${contrato.id}`}
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
