import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, Departamento, Empleado, ContratoListItem } from '../api/client';
import {
    ArrowLeft,
    Building2,
    Edit2,
    Check,
    X,
    Loader2,
    AlertCircle,
    Trash2,
    Users,
    FileText,
    Hash,
    AlignLeft,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';

export default function DepartamentoDetalle() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [departamento, setDepartamento] = useState<Departamento | null>(null);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [contratos, setContratos] = useState<ContratoListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [isNew, setIsNew] = useState(false);
    const [formData, setFormData] = useState({
        codigo: '',
        nombre: '',
        descripcion: '',
        activo: true,
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (id === 'nou') {
            setIsNew(true);
            setIsEditing(true);
            setLoading(false);
        } else if (id) {
            loadData(parseInt(id));
        }
    }, [id]);

    const loadData = async (deptId: number) => {
        try {
            setLoading(true);
            const [dept, emps, ctrs] = await Promise.all([
                api.getDepartamento(deptId),
                api.request<Empleado[]>(`/departamentos/${deptId}/empleados`),
                api.request<ContratoListItem[]>(`/departamentos/${deptId}/contratos`),
            ]);
            setDepartamento(dept);
            setEmpleados(emps);
            setContratos(ctrs);
            setFormData({
                codigo: dept.codigo,
                nombre: dept.nombre,
                descripcion: dept.descripcion || '',
                activo: dept.activo,
            });
            setError(null);
        } catch (err) {
            console.error(err);
            setError("No s'ha pogut carregar la informació del departament.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveError(null);
        try {
            if (isNew) {
                const newDept = await api.createDepartamento({
                    codigo: formData.codigo,
                    nombre: formData.nombre,
                    descripcion: formData.descripcion || undefined,
                });
                navigate(`/departamentos/${newDept.id}`, { replace: true });
                setIsNew(false);
                setIsEditing(false);
                loadData(newDept.id);
            } else if (id) {
                await api.updateDepartamento(parseInt(id), {
                    nombre: formData.nombre,
                    descripcion: formData.descripcion || undefined,
                    activo: formData.activo,
                });
                await loadData(parseInt(id));
                setIsEditing(false);
            }
        } catch (err: any) {
            setSaveError(err.message || 'Error al guardar els canvis');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async () => {
        if (!id || !departamento) return;
        const action = departamento.activo ? 'desactivar' : 'reactivar';
        if (!window.confirm(`Estàs segur que vols ${action} aquest departament?`)) return;
        try {
            await api.updateDepartamento(parseInt(id), { activo: !departamento.activo });
            await loadData(parseInt(id));
        } catch (err) {
            console.error(err);
            setSaveError(`Error al ${action} el departament`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary-600" size={40} />
            </div>
        );
    }

    if (error && !isNew) {
        return (
            <div className="glass-card p-12 text-center max-w-2xl mx-auto mt-8">
                <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Error</h2>
                <p className="text-slate-600 mb-6">{error}</p>
                <Link to="/departamentos" className="btn btn-primary inline-flex items-center gap-2">
                    <ArrowLeft size={18} />
                    Tornar a la llista
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/departamentos')}
                        className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm bg-white/50 text-slate-600 hover:text-primary-600"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                            <Link to="/departamentos" className="hover:text-primary-600">Departaments</Link>
                            <span>/</span>
                            <span>Fitxa del departament</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            {isNew ? 'Nou Departament' : departamento?.nombre}
                        </h1>
                    </div>
                </div>
                {!isEditing && !isNew && (
                    <div className="flex gap-3">
                        <button
                            onClick={handleToggleActive}
                            className={`btn bg-white border border-slate-200 gap-2 ${
                                departamento?.activo ? 'hover:bg-red-50 text-red-600' : 'hover:bg-green-50 text-green-600'
                            }`}
                        >
                            {departamento?.activo ? <Trash2 size={18} /> : <Check size={18} />}
                            {departamento?.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="btn btn-primary gap-2"
                        >
                            <Edit2 size={18} />
                            Editar
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg ring-4 ring-white">
                            {isNew ? <Building2 size={40} /> : <Building2 size={40} />}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-1">
                            {isNew ? 'Registre' : departamento?.nombre}
                        </h2>
                        <p className="text-slate-500 mb-4 font-mono text-sm">
                            {isNew ? 'Introdueix les dades' : departamento?.codigo}
                        </p>

                        <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-3">
                            {!isNew && departamento && (
                                <>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Estat</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            departamento.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {departamento.activo ? 'Actiu' : 'Inactiu'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Empleats</span>
                                        <span className="text-slate-700 font-medium">{empleados.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Contractes</span>
                                        <span className="text-slate-700 font-medium">{contratos.length}</span>
                                    </div>
                                </>
                            )}
                            {isNew && (
                                <div className="text-xs text-slate-400 py-4 italic">
                                    El departament s'activarà automàticament en guardar
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details / Edit View */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-6 h-full">
                        {isEditing ? (
                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {isNew ? 'Nou Departament' : 'Modificar Dades'}
                                    </h3>
                                    {!isNew && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                if (departamento) {
                                                    setFormData({
                                                        codigo: departamento.codigo,
                                                        nombre: departamento.nombre,
                                                        descripcion: departamento.descripcion || '',
                                                        activo: departamento.activo,
                                                    });
                                                }
                                            }}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Codi *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.codigo}
                                            onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                            required
                                            disabled={!isNew}
                                            placeholder="Ex: DEPT-001"
                                        />
                                        {!isNew && (
                                            <p className="text-xs text-slate-400 mt-1">El codi no es pot modificar</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                            required
                                            placeholder="Nom del departament"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripció</label>
                                        <textarea
                                            className="input"
                                            rows={3}
                                            value={formData.descripcion}
                                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                            placeholder="Descripció opcional del departament"
                                        />
                                    </div>
                                    {!isNew && (
                                        <div className="md:col-span-2 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                {formData.activo ? (
                                                    <ToggleRight size={24} className="text-green-500" />
                                                ) : (
                                                    <ToggleLeft size={24} className="text-slate-400" />
                                                )}
                                                <span className="font-medium text-slate-700">Departament Actiu</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={formData.activo}
                                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {saveError && (
                                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                        <AlertCircle size={16} />
                                        {saveError}
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                    {!isNew && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setIsEditing(false);
                                                if (departamento) {
                                                    setFormData({
                                                        codigo: departamento.codigo,
                                                        nombre: departamento.nombre,
                                                        descripcion: departamento.descripcion || '',
                                                        activo: departamento.activo,
                                                    });
                                                }
                                            }}
                                        >
                                            Cancel·lar
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="btn btn-primary gap-2"
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-8">
                                <h3 className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">Informació del Departament</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                            <Hash size={20} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Codi</label>
                                            <p className="text-slate-800 font-medium font-mono">{departamento?.codigo}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nom</label>
                                            <p className="text-slate-800 font-medium">{departamento?.nombre}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 md:col-span-2">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                            <AlignLeft size={20} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Descripció</label>
                                            <p className="text-slate-800 font-medium">
                                                {departamento?.descripcion || <span className="text-slate-400 italic">Sense descripció</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Empleados Section */}
                                {empleados.length > 0 && (
                                    <div className="pt-6 border-t border-slate-100">
                                        <h3 className="text-lg font-bold text-slate-800 pb-4 flex items-center gap-2">
                                            <Users size={20} className="text-primary-500" />
                                            Empleats del departament ({empleados.length})
                                        </h3>
                                        <div className="table-container">
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>Nom</th>
                                                        <th>Email</th>
                                                        <th>Rol</th>
                                                        <th>Estat</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {empleados.map((emp) => (
                                                        <tr
                                                            key={emp.id}
                                                            className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                                                            onClick={() => navigate(`/empleados/${emp.id}`)}
                                                        >
                                                            <td>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
                                                                        {emp.nombre.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="font-medium text-slate-800">{emp.nombre}</span>
                                                                </div>
                                                            </td>
                                                            <td className="text-slate-600">{emp.email}</td>
                                                            <td>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    emp.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                                    emp.rol === 'responsable' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-slate-100 text-slate-700'
                                                                }`}>
                                                                    {emp.rol}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    emp.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                    {emp.activo ? 'Actiu' : 'Inactiu'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Contratos Section */}
                                {contratos.length > 0 && (
                                    <div className="pt-6 border-t border-slate-100">
                                        <h3 className="text-lg font-bold text-slate-800 pb-4 flex items-center gap-2">
                                            <FileText size={20} className="text-primary-500" />
                                            Contractes assignats ({contratos.length})
                                        </h3>
                                        <div className="table-container">
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>Expedient</th>
                                                        <th>Objecte</th>
                                                        <th>Estat</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {contratos.map((c) => (
                                                        <tr
                                                            key={c.id}
                                                            className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                                                            onClick={() => navigate(`/contratos/${c.id}`)}
                                                        >
                                                            <td className="font-medium text-slate-800 font-mono text-sm">{c.codi_expedient || '-'}</td>
                                                            <td className="text-slate-600 text-sm line-clamp-1" title={c.objecte_contracte}>{c.objecte_contracte || '-'}</td>
                                                            <td>
                                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                                    {c.estat_actual || '-'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
