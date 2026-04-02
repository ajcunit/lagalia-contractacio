import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ContratoMenor, Departamento, Empleado } from '../api/client';
import { ArrowLeft, Building2, Calendar, FileText, CheckCircle2, Edit, Save, X, Layers } from 'lucide-react';

export default function ContratoMenorDetalle() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [contrato, setContrato] = useState<ContratoMenor | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<Empleado | null>(null);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editState, setEditState] = useState<{ departamento_id?: number | null }>({});

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [userData, deptsData] = await Promise.all([
                    api.getMe(),
                    api.getDepartamentos()
                ]);
                setUser(userData);
                setDepartamentos(deptsData);
            } catch (err) {
                console.error('Error loading initial data:', err);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const loadContrato = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await api.getContratoMenor(parseInt(id));
                setContrato(data);
                setEditState({ departamento_id: data.departamento_id });
            } catch (err) {
                console.error('Error loading contrato menor:', err);
            } finally {
                setLoading(false);
            }
        };

        loadContrato();
    }, [id]);

    const handleSave = async () => {
        if (!contrato || !id) return;
        try {
            setLoading(true);
            const updated = await api.updateContratoMenor(parseInt(id), {
                departamento_id: editState.departamento_id === 0 ? null : editState.departamento_id
            });
            setContrato(updated);
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating contrato menor:', err);
            alert('Error al guardar els canvis');
        } finally {
            setLoading(false);
        }
    };

    const canEdit = user?.rol === 'admin' || user?.rol === 'responsable_contratacion';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="loading-spinner w-10 h-10"></div>
            </div>
        );
    }

    if (!contrato) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-800">Contracte no trobat</h2>
                <button onClick={() => navigate(-1)} className="btn btn-primary mt-4 inline-flex items-center gap-2">
                    <ArrowLeft size={16} /> Tornar als contractes
                </button>
            </div>
        );
    }

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('ca-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ca-ES');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Nav */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="btn btn-secondary">
                    <ArrowLeft size={18} className="mr-2" /> Tornar
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        Expedient: {contrato.codi_expedient}
                        {contrato.tipus_liquidacio && <span className="badge badge-success text-sm">{contrato.tipus_liquidacio}</span>}
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Principal Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                                <FileText size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Dades de l'Expedient</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-500">Descripció</label>
                                <p className="text-slate-800 font-medium text-lg mt-1">{contrato.descripcio_expedient || 'Sense descripció'}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipus de Contracte</label>
                                    <p className="text-slate-800 font-medium mt-1">{contrato.tipus_contracte || '-'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exercici</label>
                                    <p className="text-slate-800 font-medium mt-1">{contrato.exercici || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle2 size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Liquidació de l'Expedient</h2>
                        </div>
                        
                        {contrato.tipus_liquidacio ? (
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                    <label className="text-xs font-semibold text-green-700 uppercase tracking-wider">Estat de Liquidació</label>
                                    <p className="text-green-900 font-bold mt-1 text-lg">{contrato.tipus_liquidacio}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Liquidació</label>
                                    <p className="text-slate-800 font-medium mt-1">{formatDate(contrato.data_liquidacio)}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Import Liquidació</label>
                                    <p className="text-slate-800 font-medium mt-1 number-display text-xl">{formatCurrency(contrato.import_liquidacio)}</p>
                                </div>
                             </div>
                        ) : (
                            <div className="p-6 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                <p className="text-slate-500">Aquest expedient encara no té dades de liquidació registrades o pendents de sincronització.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="glass-card p-6 border-t-4 border-t-primary-500">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Gestió Interna</h2>
                            {canEdit && !isEditing && (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="p-1 hover:bg-slate-100 rounded text-primary-600 transition-colors"
                                    title="Editar assignació"
                                >
                                    <Edit size={16} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block uppercase tracking-wider">Departament Assignat</label>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <select 
                                            className="input w-full"
                                            value={editState.departamento_id || 0}
                                            onChange={(e) => setEditState({ ...editState, departamento_id: parseInt(e.target.value) || null })}
                                        >
                                            <option value={0}>Sense assignar</option>
                                            {departamentos.map(d => (
                                                <option key={d.id} value={d.id}>{d.nombre}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleSave}
                                                className="btn btn-primary flex-1 py-1 px-2 text-sm flex items-center justify-center gap-1 shadow-sm"
                                            >
                                                <Save size={14} /> Guardar
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setEditState({ departamento_id: contrato.departamento_id });
                                                }}
                                                className="btn btn-secondary flex-1 py-1 px-2 text-sm flex items-center justify-center gap-1"
                                            >
                                                <X size={14} /> Cancel·lar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <Layers size={16} />
                                        </div>
                                        <span className="font-semibold text-slate-800">
                                            {departamentos.find(d => d.id === contrato.departamento_id)?.nombre || 'Sense assignar'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Imports Reals</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-500">Import Adjudicació (Sense IVA)</label>
                                <p className="text-2xl font-bold text-primary-700 number-display">{formatCurrency(contrato.import_adjudicacio)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
                            <Building2 size={18} className="text-primary-500" /> Adjudicatari
                        </div>
                        <p className="text-slate-700 font-medium">
                            {contrato.adjudicatari || 'No especificat'}
                        </p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
                            <Calendar size={18} className="text-primary-500" /> Terminis i Dates
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 pointer-events-none">
                                <span className="text-sm text-slate-500">Data adjudicació</span>
                                <span className="font-medium text-slate-800">{formatDate(contrato.data_adjudicacio)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 pointer-events-none">
                                <span className="text-sm text-slate-500">Durada estimativa</span>
                                <span className="font-medium text-slate-800">
                                    {contrato.anys_durada ? `${contrato.anys_durada} anys ` : ''}
                                    {contrato.mesos_durada ? `${contrato.mesos_durada} mesos ` : ''}
                                    {contrato.dies_durada ? `${contrato.dies_durada} dies` : ''}
                                    {(!contrato.anys_durada && !contrato.mesos_durada && !contrato.dies_durada) ? '-' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center text-xs text-slate-400">
                        Darrera sincronització: {formatDate(contrato.fecha_ultima_sincronizacion)}
                    </div>
                </div>
            </div>
        </div>
    );
}
