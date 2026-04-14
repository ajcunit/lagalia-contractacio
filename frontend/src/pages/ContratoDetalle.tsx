import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, Contrato, Prorroga, Empleado } from '../api/client';
import {
    ArrowLeft,
    Building2,
    User,
    Calendar,
    DollarSign,
    MapPin,
    ExternalLink,
    FileText,
    Edit,
    X,
    Check,
    Clock,
    AlertCircle,
    ChevronDown,
    Search,
    Download,
    Users,
    Layers,
} from 'lucide-react';


export default function ContratoDetalle() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [contrato, setContrato] = useState<Contrato | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Contrato & { departamentos_ids: number[], responsables_ids: number[] }>>({});
    const [saving, setSaving] = useState(false);
    const [prorrogues, setProrrogues] = useState<Prorroga[]>([]);
    const [modificacions, setModificacions] = useState<any[]>([]);
    const [departamentos, setDepartamentos] = useState<any[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    
    // JSON Document state
    const [documentsJson, setDocumentsJson] = useState<{label: string, url: string}[]>([]);
    const [mesaMembers, setMesaMembers] = useState<{name: string, carrec: string}[]>([]);
    const [loadingJson, setLoadingJson] = useState(false);
    const [activeJsonId, setActiveJsonId] = useState<string | null>(null);
    const [jsonError, setJsonError] = useState<string | null>(null);

    const handleExploreJson = async (url: string, jsonId: string) => {
        if (activeJsonId === jsonId && (documentsJson.length > 0 || mesaMembers.length > 0 || jsonError)) {
            setActiveJsonId(null);
            setDocumentsJson([]);
            setMesaMembers([]);
            setJsonError(null);
            return;
        }
        
        setLoadingJson(true);
        setActiveJsonId(jsonId);
        setJsonError(null);
        setDocumentsJson([]);
        setMesaMembers([]);
        
        try {
            const data = await api.getProxyJson(url);
            const foundDocs: {label: string, url: string}[] = [];
            const foundMembers: {name: string, carrec: string}[] = [];
            
            const findContent = (obj: any) => {
                if (!obj || typeof obj !== 'object') return;
                
                // Buscar membres de la Mesa (normalment a dadesPublicacio o dadesExpedient)
                if (obj.membresMesa && Array.isArray(obj.membresMesa)) {
                    obj.membresMesa.forEach((m: any) => {
                        const name = `${m.nom || ''} ${m.cognoms || ''}`.trim();
                        if (name) {
                            foundMembers.push({
                                name,
                                carrec: m.carrec?.ca || m.carrec?.es || m.carrec?.en || m.carrec?.oc || '-'
                            });
                        }
                    });
                }

                if (Array.isArray(obj)) {
                    obj.forEach(item => findContent(item));
                } else {
                    // Buscar documents
                    if (obj.id && obj.titol && obj.hash) {
                        foundDocs.push({
                            label: obj.titol,
                            url: `https://contractaciopublica.cat/portal-api/descarrega-document/${obj.id}/${obj.hash}`
                        });
                    }
                    // Sempre buscar en les claus per si hi ha mes content
                    Object.values(obj).forEach(val => findContent(val));
                }
            };
            
            findContent(data);
            
            // Deduplicar membres si cal (a vegades surten repetits en diferents nodes)
            const uniqueMembers = Array.from(new Map(foundMembers.map(m => [m.name, m])).values());
            
            setDocumentsJson(foundDocs);
            setMesaMembers(uniqueMembers);
            
            if (foundDocs.length === 0 && uniqueMembers.length === 0) {
                setJsonError("No s'ha trobat cap document ni informació de la Mesa en aquest fitxer.");
            }
        } catch (err: any) {
            console.error("Error explorant el JSON:", err);
            setJsonError("No s'ha pogut carregar el contingut del JSON. Revisa el format o la connexió.");
        } finally {
            setLoadingJson(false);
        }
    };
    const [cpvDescriptions, setCpvDescriptions] = useState<Record<string, string>>({});
    const [lots, setLots] = useState<Contrato[]>([]);
    const [expandedLots, setExpandedLots] = useState<Set<number>>(new Set());

    const [user, setUser] = useState<Empleado | null>(null);

    useEffect(() => {
        const loadAllData = async () => {
            if (id) {
                await loadContrato(parseInt(id));
                await loadProrrogues(parseInt(id));
                await loadModificacions(parseInt(id));
                await loadLots(parseInt(id));
            }
            try {
                const [depts, emps] = await Promise.all([
                    api.getDepartamentos(),
                    api.getEmpleados()
                ]);
                setDepartamentos(depts);
                setEmpleados(emps);
            } catch (err) {
                console.error("Error loading common data:", err);
            }
        };
        loadAllData();
        api.getMe().then(setUser).catch(() => {});
    }, [id]);

    const loadContrato = async (contratoId: number) => {
        try {
            setLoading(true);
            const data = await api.getContrato(contratoId);
            setContrato(data);
            setError(null);
        } catch (err) {
            setError('Error al carregar el contracte');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadProrrogues = async (contratoId: number) => {
        try {
            const data = await api.getProrrogues(contratoId);
            setProrrogues(data);
        } catch (err) {
            console.error('Error loading prorrogues:', err);
        }
    };

    const loadModificacions = async (contratoId: number) => {
        try {
            const data = await api.getModificacions(contratoId);
            setModificacions(data);
        } catch (err) {
            console.error('Error loading modificacions:', err);
        }
    };

    useEffect(() => {
        if (contrato?.cpv_principal_codi) {
            const codes = Array.from(new Set(contrato.cpv_principal_codi.split('||'))).filter(Boolean);
            if (codes.length > 0) {
                api.getCpvInfo(codes).then(setCpvDescriptions).catch(console.error);
            }
        }
    }, [contrato?.cpv_principal_codi]);

    const loadLots = async (contratoId: number) => {
        try {
            const data = await api.getContratoLots(contratoId);
            setLots(data);
        } catch (err) {
            console.error('Error loading lots:', err);
        }
    };

    const toggleLot = (lotId: number) => {
        setExpandedLots(prev => {
            const next = new Set(prev);
            if (next.has(lotId)) {
                next.delete(lotId);
            } else {
                next.add(lotId);
            }
            return next;
        });
    };

    const handleOpenEdit = () => {
        if (contrato) {
            const dept_ids = contrato.departamentos?.map((d) => d.id) || [];
            const resp_ids = contrato.responsables?.map((r) => r.id) || [];

            setEditData({ 
                ...contrato, 
                responsables_ids: resp_ids,
                departamentos_ids: dept_ids
            });
            setIsEditing(true);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditData({});
    };

    const handleSave = async () => {
        console.log("Handle Save triggered", { editData });
        if (!contrato || !id) {
            console.error("No contract or ID found", { contrato, id });
            return;
        }
        try {
            setSaving(true);
            const isResponsable = user?.rol === 'responsable';
            const isAdmin = user?.rol === 'admin' || user?.rol === 'responsable_contratacion';
            
            console.log("User role:", user?.rol);

            // Només enviem els camps que el backend permet actualitzar
            let dataToSend: any = {};
            
            if (isAdmin) {
                // Camps que un admin pot tocar
                const allowedFields = [
                    'codi_expedient', 'objecte_contracte', 'tipus_contracte', 'procediment',
                    'estat_actual', 'adjudicatari_nom', 'adjudicatari_nif', 'adjudicatari_nacionalitat',
                    'import_adjudicacio_amb_iva', 'data_inici', 'data_final', 'data_formalitzacio', 
                    'estado_interno', 'departamentos_ids', 'responsables_ids', 'meses_aviso_vencimiento',
                    'organisme_adjudicador', 'departament_adjudicador', 'tipus_tramitacio',
                    'cpv_principal_codi', 'cpv_principal_descripcio', 'codi_nuts', 'lots', 
                    'forma_financament', 'preu_licitar', 'preu_adjudicar', 'import_licitar_sense_iva',
                    'pressupost_licitacio_sense_iva', 'pressupost_licitacio_amb_iva'
                ];
                
                allowedFields.forEach(field => {
                    let value = editData[field as keyof typeof editData];
                    
                    // Convertir strings buits a null per a camps de data o números
                    const numericFields = [
                        'import_adjudicacio_amb_iva', 'preu_licitar', 'preu_adjudicar', 
                        'import_licitar_sense_iva', 'pressupost_licitacio_sense_iva', 
                        'pressupost_licitacio_amb_iva', 'meses_aviso_vencimiento'
                    ];
                    const dateFields = ['data_inici', 'data_final', 'data_formalitzacio'];
                    
                    if ((numericFields.includes(field) || dateFields.includes(field)) && value === "") {
                        value = undefined;
                    }
                    
                    if (value !== undefined) {
                        // Si és un array d'IDs, filtrem valors no vàlids (com nulls)
                        if (Array.isArray(value) && (field === 'departamentos_ids' || field === 'responsables_ids')) {
                            const filtered = value.filter(id => id !== null && id !== undefined);
                            dataToSend[field] = Array.from(new Set(filtered));
                        } else {
                            dataToSend[field] = value;
                        }
                    }
                });
            } else if (isResponsable) {
                // Un responsable només pot tocar els mesos d'avís
                dataToSend = { 
                    meses_aviso_vencimiento: editData.meses_aviso_vencimiento 
                };
            }
            
            console.log("Data to send:", dataToSend);
            
            await api.updateContrato(parseInt(id), dataToSend);
            console.log("Update successful");
            await loadContrato(parseInt(id));
            setIsEditing(false);
        } catch (err: any) {
            console.error('Error saving contract:', err);
            const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
            alert("Error al desar: " + errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('ca-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ca-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    const getEstadoInternoBadge = (estado: string) => {
        switch (estado) {
            case 'pendiente_aprobacion':
                return <span className="badge badge-pending">Pendent d'Aprovació</span>;
            case 'aprobado':
                return <span className="badge badge-success">Aprovat</span>;
            case 'rechazado':
                return <span className="badge badge-error">Rebutjat</span>;
            default:
                return <span className="badge badge-info">Normal</span>;
        }
    };

    const getExpirationAlert = () => {
        if (!contrato) return null;
        if (contrato.possiblement_finalitzat) {
            return (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
                    <AlertCircle className="text-red-600" size={24} />
                    <div>
                        <p className="font-medium text-red-800">Possiblement Finalitzat</p>
                        <p className="text-sm text-red-600">La data de finalització calculada ha passat.</p>
                    </div>
                </div>
            );
        }
        if (contrato.alerta_finalitzacio) {
            return (
                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center gap-3">
                    <Clock className="text-yellow-600" size={24} />
                    <div>
                        <p className="font-medium text-yellow-800">Pròxim a Finalitzar</p>
                        <p className="text-sm text-yellow-600">Aquest contracte finalitza en els pròxims 6 mesos.</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="loading-spinner w-12 h-12"></div>
            </div>
        );
    }

    if (error || !contrato) {
        return (
            <div className="glass-card p-6 text-center">
                <p className="text-red-500 mb-4">{error || 'Contracte no trobat'}</p>
                <button onClick={() => navigate(-1)} className="btn btn-primary">
                    Tornar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="btn btn-secondary p-2">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <input 
                                type="text" 
                                className="input input-bordered text-2xl font-bold h-12 w-full max-w-md" 
                                value={editData.codi_expedient || ""} 
                                onChange={(e) => setEditData({ ...editData, codi_expedient: e.target.value })} 
                            />
                        ) : (
                            <h1 className="text-2xl font-bold text-slate-800">{contrato.codi_expedient}</h1>
                        )}
                        {getEstadoInternoBadge(contrato.estado_interno)}
                        {isEditing ? (
                            <input 
                                type="text" 
                                className="input input-bordered h-10 w-48 text-sm" 
                                placeholder="Estat Actual"
                                value={editData.estat_actual || ""} 
                                onChange={(e) => setEditData({ ...editData, estat_actual: e.target.value })} 
                            />
                        ) : (
                            <span className="badge badge-info">{contrato.estat_actual}</span>
                        )}
                    </div>
                    {isEditing ? (
                        <input 
                            type="text" 
                            className="input input-bordered h-10 w-full max-w-md text-sm mt-2" 
                            placeholder="Tipus de Contracte"
                            value={editData.tipus_contracte || ""} 
                            onChange={(e) => setEditData({ ...editData, tipus_contracte: e.target.value })} 
                        />
                    ) : (
                        <p className="text-slate-500 mt-1">{contrato.tipus_contracte}</p>
                    )}
                </div>
                <div className="flex gap-2">
                    {contrato.enllac_publicacio && (
                        <a
                            href={contrato.enllac_publicacio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary gap-2"
                        >
                            <ExternalLink size={18} />
                            Veure Publicació
                        </a>
                    )}
                {(user?.rol === 'admin' || user?.rol === 'responsable_contratacion' || user?.rol === 'responsable') && (
                    /* Header Actions */
                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="btn bg-white border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <X size={18} />
                                    <span className="hidden sm:inline">Cancel·lar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log("Save button DOM click");
                                        handleSave();
                                    }}
                                    disabled={saving}
                                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary-200"
                                >
                                    {saving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Check size={18} />
                                    )}
                                    <span>{saving ? 'Desant...' : 'Desar Canvis'}</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleOpenEdit}
                                className="btn bg-white border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Edit size={18} />
                                <span>Editar</span>
                            </button>
                        )}
                    </div>
                )}
                </div>
            </div>

            {/* Expiration Alert */}
            {getExpirationAlert()}

            {/* Object Card */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <FileText size={20} className="text-primary-600" />
                    Objecte del Contracte
                </h3>
                {isEditing ? (
                    <textarea
                        className="input input-bordered w-full"
                        rows={3}
                        value={editData.objecte_contracte || ""}
                        onChange={(e) => setEditData({ ...editData, objecte_contracte: e.target.value })}
                    />
                ) : (
                    <p className="text-slate-700 leading-relaxed">{contrato.objecte_contracte || '-'}</p>
                )}
            </div>

            {/* Gestió del Contracte (Inline) */}
            <div className="glass-card p-6 border-l-4 border-l-primary-500">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Users size={20} className="text-primary-600" />
                    Gestió del Contracte
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Departaments */}
                    <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-500 mb-2 block tracking-wider uppercase text-[10px]">
                            Departaments Assignats
                        </label>
                        {isEditing ? (
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl">
                                {departamentos.map(d => {
                                    const isChecked = editData.departamentos_ids?.some(id => Number(id) === Number(d.id)) || false;
                                    return (
                                        <label key={d.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    const currentIds = editData.departamentos_ids || [];
                                                    if (e.target.checked) {
                                                        setEditData({ ...editData, departamentos_ids: [...currentIds, d.id] });
                                                    } else {
                                                        setEditData({ ...editData, departamentos_ids: currentIds.filter((id: number) => id !== d.id) });
                                                    }
                                                }}
                                            />
                                            <span className="text-sm font-medium text-slate-700">{d.nombre}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {contrato.departamentos && contrato.departamentos.length > 0 ? (
                                    contrato.departamentos.map(d => (
                                        <span key={d.id} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-50 text-primary-700 border border-primary-100">
                                            {d.nombre}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-slate-400 italic text-sm">Sense departaments assignats</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Responsables */}
                    <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-500 mb-2 block tracking-wider uppercase text-[10px]">
                            Responsables
                        </label>
                        {isEditing ? (
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl">
                                {empleados
                                    .filter(emp => {
                                        if (!['responsable', 'admin', 'responsable_contratacion'].includes(emp.rol)) return false;
                                        const selectedDeptIds = editData.departamentos_ids || [];
                                        if (selectedDeptIds.length === 0) return false;
                                        return emp.departamentos?.some(d => 
                                            selectedDeptIds.some(sId => Number(sId) === Number(d.id))
                                        );
                                    })
                                    .map(emp => (
                                        <label key={emp.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                                                checked={editData.responsables_ids?.some(id => Number(id) === Number(emp.id)) || false}
                                                onChange={(e) => {
                                                    const currentIds = editData.responsables_ids || [];
                                                    if (e.target.checked) {
                                                        setEditData({ ...editData, responsables_ids: [...currentIds, emp.id] });
                                                    } else {
                                                        setEditData({ ...editData, responsables_ids: currentIds.filter((id: number) => id !== emp.id) });
                                                    }
                                                }}
                                            />
                                            <span className="text-sm font-medium text-slate-700">{emp.nombre}</span>
                                        </label>
                                    ))
                                }
                                {(editData.departamentos_ids?.length || 0) === 0 && (
                                    <span className="text-xs text-amber-600 italic p-2 bg-amber-50 rounded-lg font-medium">
                                        Selecciona un departament per veure els responsables disponibles
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {contrato.responsables && contrato.responsables.length > 0 ? (
                                    contrato.responsables.map(r => (
                                        <span key={r.id} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-secondary-50 text-secondary-700 border border-secondary-100">
                                            <User size={12} className="mr-1" />
                                            {r.nombre}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-slate-400 italic text-sm">Sense responsables assignats</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Estats i Avisos */}
                    <div className="lg:col-span-2">
                        <label className="text-sm font-semibold text-slate-500 mb-2 block tracking-wider uppercase text-[10px]">
                            Estat Intern
                        </label>
                        {isEditing ? (
                            <select 
                                className="input input-bordered w-full" 
                                value={editData.estado_interno || ""} 
                                onChange={(e) => setEditData({ ...editData, estado_interno: e.target.value })}
                            >
                                <option value="normal">Normal</option>
                                <option value="pendiente_aprobacion">Pendent d'aprovació</option>
                                <option value="aprobado">Aprovat</option>
                                <option value="rechazado">Rebutjat</option>
                            </select>
                        ) : (
                            <div>{getEstadoInternoBadge(contrato.estado_interno)}</div>
                        )}
                    </div>

                    <div className="lg:col-span-2">
                        <label className="text-sm font-semibold text-slate-500 mb-2 block tracking-wider uppercase text-[10px]">
                            Mesos d'Avís Venciment
                        </label>
                        {isEditing ? (
                            <input 
                                type="number" 
                                className="input input-bordered w-full" 
                                value={editData.meses_aviso_vencimiento || ""} 
                                onChange={(e) => setEditData({ ...editData, meses_aviso_vencimiento: parseInt(e.target.value) || 0 })} 
                            />
                        ) : (
                            <p className="font-bold text-slate-700">{contrato.meses_aviso_vencimiento || 6} mesos</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Adjudicación */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <User size={20} className="text-primary-600" />
                        Adjudicació
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-500">Adjudicatari</label>
                            {isEditing ? (
                                <input type="text" className="input input-bordered w-full mt-1" value={editData.adjudicatari_nom || ""} onChange={(e) => setEditData({ ...editData, adjudicatari_nom: e.target.value })} />
                            ) : (
                                <p className="font-medium text-slate-800">{contrato.adjudicatari_nom || '-'}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-500">NIF</label>
                                {isEditing ? (
                                    <input type="text" className="input input-bordered w-full mt-1" value={editData.adjudicatari_nif || ""} onChange={(e) => setEditData({ ...editData, adjudicatari_nif: e.target.value })} />
                                ) : (
                                    <p className="text-slate-700">{contrato.adjudicatari_nif || '-'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm text-slate-500">Nacionalitat</label>
                                {isEditing ? (
                                    <input type="text" className="input input-bordered w-full mt-1" value={editData.adjudicatari_nacionalitat || ""} onChange={(e) => setEditData({ ...editData, adjudicatari_nacionalitat: e.target.value })} />
                                ) : (
                                    <p className="text-slate-700">{contrato.adjudicatari_nacionalitat || '-'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Importes */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <DollarSign size={20} className="text-primary-600" />
                        Imports
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50">
                                <label className="text-sm text-slate-500">Preu Licitar</label>
                                {isEditing ? (
                                    <input type="number" step="0.01" className="input input-bordered w-full mt-1" value={editData.preu_licitar || ""} onChange={(e) => setEditData({ ...editData, preu_licitar: parseFloat(e.target.value) || undefined })} />
                                ) : (
                                    <p className="text-xl font-bold text-slate-800 number-display">
                                        {formatCurrency(contrato.preu_licitar)}
                                    </p>
                                )}
                            </div>
                            <div className="p-4 rounded-xl bg-green-50">
                                <label className="text-sm text-slate-500">Preu Adjudicar</label>
                                {isEditing ? (
                                    <input type="number" step="0.01" className="input input-bordered w-full mt-1" value={editData.preu_adjudicar || ""} onChange={(e) => setEditData({ ...editData, preu_adjudicar: parseFloat(e.target.value) || undefined })} />
                                ) : (
                                    <p className="text-xl font-bold text-green-700 number-display">
                                        {formatCurrency(contrato.preu_adjudicar)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-500">Import amb IVA</label>
                                {isEditing ? (
                                    <input type="number" step="0.01" className="input input-bordered w-full mt-1" value={editData.import_adjudicacio_amb_iva || ""} onChange={(e) => setEditData({ ...editData, import_adjudicacio_amb_iva: parseFloat(e.target.value) || undefined })} />
                                ) : (
                                    <p className="font-medium text-slate-800">
                                        {formatCurrency(contrato.import_adjudicacio_amb_iva)}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm text-slate-500">Import sense IVA</label>
                                {isEditing ? (
                                    <input type="number" step="0.01" className="input input-bordered w-full mt-1" value={editData.import_licitar_sense_iva || ""} onChange={(e) => setEditData({ ...editData, import_licitar_sense_iva: parseFloat(e.target.value) || undefined })} />
                                ) : (
                                    <p className="font-medium text-slate-800">
                                        {formatCurrency(contrato.import_licitar_sense_iva)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-500">Pressupost Licitació (sense IVA)</label>
                                {isEditing ? (
                                    <input type="number" step="0.01" className="input input-bordered w-full mt-1" value={editData.pressupost_licitacio_sense_iva || ""} onChange={(e) => setEditData({ ...editData, pressupost_licitacio_sense_iva: parseFloat(e.target.value) || undefined })} />
                                ) : (
                                    <p className="text-slate-700">{formatCurrency(contrato.pressupost_licitacio_sense_iva)}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm text-slate-500">Pressupost Licitació (amb IVA)</label>
                                {isEditing ? (
                                    <input type="number" step="0.01" className="input input-bordered w-full mt-1" value={editData.pressupost_licitacio_amb_iva || ""} onChange={(e) => setEditData({ ...editData, pressupost_licitacio_amb_iva: parseFloat(e.target.value) || undefined })} />
                                ) : (
                                    <p className="text-slate-700">{formatCurrency(contrato.pressupost_licitacio_amb_iva)}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organismo */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Building2 size={20} className="text-primary-600" />
                        Organisme
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-500">Organisme Adjudicador</label>
                            {isEditing ? (
                                <input type="text" className="input input-bordered w-full mt-1" value={editData.organisme_adjudicador || ""} onChange={(e) => setEditData({ ...editData, organisme_adjudicador: e.target.value })} />
                            ) : (
                                <p className="text-slate-700">{contrato.organisme_adjudicador || '-'}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm text-slate-500">Departament Adjudicador</label>
                            {isEditing ? (
                                <input type="text" className="input input-bordered w-full mt-1" value={editData.departament_adjudicador || ""} onChange={(e) => setEditData({ ...editData, departament_adjudicador: e.target.value })} />
                            ) : (
                                <p className="text-slate-700">{contrato.departament_adjudicador || '-'}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-500">Procediment</label>
                                {isEditing ? (
                                    <input type="text" className="input input-bordered w-full mt-1" value={editData.procediment || ""} onChange={(e) => setEditData({ ...editData, procediment: e.target.value })} />
                                ) : (
                                    <p className="text-slate-700">{contrato.procediment || '-'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm text-slate-500">Tipus Tramitació</label>
                                {isEditing ? (
                                    <input type="text" className="input input-bordered w-full mt-1" value={editData.tipus_tramitacio || ""} onChange={(e) => setEditData({ ...editData, tipus_tramitacio: e.target.value })} />
                                ) : (
                                    <p className="text-slate-700">{contrato.tipus_tramitacio || '-'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fechas y Duración */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-primary-600" />
                        Dates i Durada
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-500">Data Formalització</label>
                                {isEditing ? (
                                    <input type="date" className="input input-bordered w-full mt-1" value={editData.data_formalitzacio?.split("T")[0] || ""} onChange={(e) => setEditData({ ...editData, data_formalitzacio: e.target.value })} />
                                ) : (
                                    <p className="text-slate-700">{formatDate(contrato.data_formalitzacio)}</p>
                                )}
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50">
                                <label className="text-sm text-blue-600">Durada del Contracte</label>
                                <p className="text-lg font-bold text-blue-800">
                                    {contrato.durada_contracte ? `${contrato.durada_contracte} mesos` : '-'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-xl bg-green-50">
                                <label className="text-sm text-green-600">Data Inici</label>
                                {isEditing ? (
                                    <input type="date" className="input input-bordered w-full mt-1" value={editData.data_inici?.split("T")[0] || ""} onChange={(e) => setEditData({ ...editData, data_inici: e.target.value })} />
                                ) : (
                                    <p className="font-medium text-green-800">{formatDate(contrato.data_inici)}</p>
                                )}
                            </div>
                            <div className={`p-3 rounded-xl ${contrato.possiblement_finalitzat ? 'bg-red-50' : contrato.alerta_finalitzacio ? 'bg-yellow-50' : 'bg-slate-50'}`}>
                                <label className={`text-sm ${contrato.possiblement_finalitzat ? 'text-red-600' : contrato.alerta_finalitzacio ? 'text-yellow-600' : 'text-slate-500'}`}>
                                    Data Final
                                </label>
                                {isEditing ? (
                                    <input type="date" className="input input-bordered w-full mt-1" value={editData.data_final?.split("T")[0] || ""} onChange={(e) => setEditData({ ...editData, data_final: e.target.value })} />
                                ) : (
                                    <p className={`font-medium ${contrato.possiblement_finalitzat ? 'text-red-800' : contrato.alerta_finalitzacio ? 'text-yellow-800' : 'text-slate-700'}`}>
                                        {formatDate(contrato.data_final)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-500">Publicació</label>
                                <p className="text-slate-700">{formatDate(contrato.data_publicacio)}</p>
                            </div>
                            <div>
                                <label className="text-sm text-slate-500">Anunci Adjudicació</label>
                                <p className="text-slate-700">{formatDate(contrato.data_anunci_adjudicacio)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clasificación */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <MapPin size={20} className="text-primary-600" />
                    Classificació
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-sm text-slate-500 block mb-2">CPV Principal</label>
                        {isEditing ? (
                            <div className="space-y-2">
                                <input type="text" className="input input-bordered w-full mt-1" placeholder="Codi CPV (ex: 79000000-4)" value={editData.cpv_principal_codi || ""} onChange={(e) => setEditData({ ...editData, cpv_principal_codi: e.target.value })} />
                                <textarea className="input input-bordered w-full mt-1 text-sm" placeholder="Descripció CPV" rows={2} value={editData.cpv_principal_descripcio || ""} onChange={(e) => setEditData({ ...editData, cpv_principal_descripcio: e.target.value })} />
                            </div>
                        ) : (
                            <>
                                {contrato.cpv_principal_codi ? (
                                    <div className="flex flex-col gap-3 mb-2">
                                        {Array.from(new Set(contrato.cpv_principal_codi.split('||'))).filter(Boolean).map((cpv, index) => (
                                            <div key={index} className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-primary-200 transition-colors">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-primary-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                        CPV
                                                    </span>
                                                    <span className="font-mono text-sm font-bold text-slate-700">
                                                        {cpv}
                                                    </span>
                                                </div>
                                                {cpvDescriptions[cpv] && (
                                                    <p className="text-sm text-slate-600 leading-snug font-medium">
                                                        {cpvDescriptions[cpv]}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-700">-</p>
                                )}
                                {contrato.cpv_principal_descripcio && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <label className="text-xs text-slate-400 block mb-1">Descripció original de l'expedient</label>
                                        <p className="text-sm text-slate-500 italic">{contrato.cpv_principal_descripcio}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div>
                        <label className="text-sm text-slate-500">NUTS</label>
                        {isEditing ? (
                            <input type="text" className="input input-bordered w-full mt-1" value={editData.codi_nuts || ""} onChange={(e) => setEditData({ ...editData, codi_nuts: e.target.value })} />
                        ) : (
                            <p className="text-slate-700">{contrato.codi_nuts || '-'}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm text-slate-500">Lot</label>
                        {isEditing ? (
                            <input type="text" className="input input-bordered w-full mt-1" value={editData.lots || ""} onChange={(e) => setEditData({ ...editData, lots: e.target.value })} />
                        ) : (
                            <p className="text-slate-700">{contrato.lots || '-'}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm text-slate-500">Forma de Finançament</label>
                        {isEditing ? (
                            <input type="text" className="input input-bordered w-full mt-1" value={editData.forma_financament || ""} onChange={(e) => setEditData({ ...editData, forma_financament: e.target.value })} />
                        ) : (
                            <p className="text-slate-700">{contrato.forma_financament || '-'}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Lots de l'expedient */}
            {lots.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Layers size={20} className="text-primary-600" />
                        Lots de l'Expedient
                        <span className="bg-primary-100 text-primary-700 text-sm px-2 py-0.5 rounded-full">
                            {lots.length + 1} lots
                        </span>
                    </h3>
                    <div className="mb-3 p-3 rounded-xl bg-primary-50 border border-primary-200">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                                Lot {contrato.lots || '-'}
                            </span>
                            <span className="text-sm font-medium text-primary-800">Lot actual (estàs aquí)</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {lots.map((lot) => (
                            <div key={lot.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => toggleLot(lot.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap">
                                            Lot {lot.lots || '-'}
                                        </span>
                                        <span className="text-sm text-slate-700 truncate">
                                            {lot.adjudicatari_nom || 'Sense adjudicatari'}
                                        </span>
                                        {lot.estat_actual && (
                                            <span className="badge badge-info text-xs whitespace-nowrap">{lot.estat_actual}</span>
                                        )}
                                        {lot.import_adjudicacio_amb_iva !== undefined && lot.import_adjudicacio_amb_iva !== null && (
                                            <span className="text-sm font-semibold text-green-700 whitespace-nowrap ml-auto mr-2">
                                                {formatCurrency(lot.import_adjudicacio_amb_iva)}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDown
                                        size={18}
                                        className={`text-slate-400 transition-transform flex-shrink-0 ${expandedLots.has(lot.id) ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {expandedLots.has(lot.id) && (
                                    <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                                        {lot.objecte_contracte && (
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase tracking-wider">Objecte</label>
                                                <p className="text-sm text-slate-700 mt-0.5">{lot.objecte_contracte}</p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-500">Adjudicatari</label>
                                                <p className="text-sm font-medium text-slate-800">{lot.adjudicatari_nom || '-'}</p>
                                                {lot.adjudicatari_nif && <p className="text-xs text-slate-500">{lot.adjudicatari_nif}</p>}
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500">Import amb IVA</label>
                                                <p className="text-sm font-medium text-green-700">{formatCurrency(lot.import_adjudicacio_amb_iva)}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500">Data Formalització</label>
                                                <p className="text-sm text-slate-700">{formatDate(lot.data_formalitzacio)}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500">Data Final</label>
                                                <p className="text-sm text-slate-700">{formatDate(lot.data_final)}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-500">Durada</label>
                                                <p className="text-sm text-slate-700">{lot.durada_contracte ? `${lot.durada_contracte} mesos` : '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500">Procediment</label>
                                                <p className="text-sm text-slate-700">{lot.procediment || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500">CPV</label>
                                                {lot.cpv_principal_codi ? (
                                                    <div className="flex flex-col gap-1.5 mt-1">
                                                        {Array.from(new Set(lot.cpv_principal_codi.split('||'))).filter(Boolean).map((cpv, index) => (
                                                            <div key={index} className="flex items-start gap-2">
                                                                <span className="bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold whitespace-nowrap">
                                                                    {cpv}
                                                                </span>
                                                                {cpvDescriptions[cpv] && (
                                                                    <span className="text-[11px] text-slate-500 leading-tight flex-1">{cpvDescriptions[cpv]}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-700">{lot.cpv_principal_codi || '-'}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500">Estat</label>
                                                <p className="text-sm text-slate-700">{lot.estat_actual || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200">
                                            <Link
                                                to={`/contratos/${lot.id}`}
                                                className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
                                            >
                                                Veure detall complet d'aquest lot
                                                <ExternalLink size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pròrrogues */}
            {prorrogues.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-primary-600" />
                        Pròrrogues
                        <span className="bg-primary-100 text-primary-700 text-sm px-2 py-0.5 rounded-full">
                            {prorrogues.length}
                        </span>
                    </h3>
                    <div className="space-y-4">
                        {prorrogues.map((p) => (
                            <div
                                key={p.id}
                                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-700 text-sm font-medium px-2.5 py-0.5 rounded-full">
                                            Pròrroga {p.numero_prorroga}
                                        </span>
                                        {p.exercici && (
                                            <span className="text-sm text-slate-500">Exercici {p.exercici}</span>
                                        )}
                                    </div>
                                    {p.import_adjudicacio !== undefined && p.import_adjudicacio !== null && p.import_adjudicacio > 0 && (
                                        <span className="font-semibold text-green-700">
                                            {formatCurrency(p.import_adjudicacio)}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-500">Data Inici</label>
                                        <p className="text-slate-700 font-medium">{formatDate(p.data_inici_prorroga)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-500">Data Fi</label>
                                        <p className="text-slate-700 font-medium">{formatDate(p.data_fi_prorroga)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modificacions */}
            {modificacions.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Edit size={20} className="text-primary-600" />
                        Modificacions
                        <span className="bg-primary-100 text-primary-700 text-sm px-2 py-0.5 rounded-full">
                            {modificacions.length}
                        </span>
                    </h3>
                    <div className="space-y-4">
                        {modificacions.map((m) => (
                            <div
                                key={m.id}
                                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-amber-100 text-amber-700 text-sm font-medium px-2.5 py-0.5 rounded-full">
                                            Modificació {m.numero_modificacio}
                                        </span>
                                        <span className="text-sm text-slate-500">{formatDate(m.data_aprovacio_modificacio)}</span>
                                    </div>
                                    {m.import_modificacio !== undefined && m.import_modificacio !== null && (
                                        <span className="font-semibold text-green-700">
                                            {formatCurrency(m.import_modificacio)}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase tracking-wider">Tipus de Modificació</label>
                                        <p className="text-sm text-slate-700 mt-0.5">{m.tipus_modificacio || '-'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                                        <div>
                                            <label className="text-xs text-slate-500">Import</label>
                                            <p className="text-sm font-medium text-slate-700">{formatCurrency(m.import_modificacio)}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500">Ampliació Termini</label>
                                            <p className="text-sm font-medium text-slate-700">
                                                {[
                                                    m.anys_termini_modificacio > 0 ? `${m.anys_termini_modificacio}a` : null,
                                                    m.mesos_termini_modificacio > 0 ? `${m.mesos_termini_modificacio}m` : null,
                                                    m.dies_termini_modificacio > 0 ? `${m.dies_termini_modificacio}d` : null
                                                ].filter(Boolean).join(' ') || 'Cap'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Enlaces */}
            {(contrato.enllac_perfil_contractant ||
                contrato.url_plataforma_contractacio ||
                contrato.enllac_licitacio ||
                contrato.enllac_adjudicacio ||
                contrato.url_json_futura ||
                contrato.url_json_agregada ||
                contrato.url_json_cpm ||
                contrato.url_json_previ ||
                contrato.url_json_licitacio ||
                contrato.url_json_avaluacio ||
                contrato.url_json_adjudicacio ||
                contrato.url_json_formalitzacio ||
                contrato.url_json_anulacio) && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <ExternalLink size={20} className="text-primary-600" />
                            Enllaços
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {contrato.enllac_perfil_contractant && (
                                <a
                                    href={contrato.enllac_perfil_contractant}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary gap-2"
                                >
                                    <ExternalLink size={16} />
                                    Perfil Contractant
                                </a>
                            )}
                            {contrato.url_plataforma_contractacio && (
                                <a
                                    href={contrato.url_plataforma_contractacio}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary gap-2"
                                >
                                    <ExternalLink size={16} />
                                    Plataforma Contractació
                                </a>
                            )}
                            {contrato.enllac_licitacio && (
                                <a
                                    href={contrato.enllac_licitacio}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary gap-2"
                                >
                                    <ExternalLink size={16} />
                                    Anunci Licitació
                                </a>
                            )}
                            {contrato.enllac_adjudicacio && (
                                <a
                                    href={contrato.enllac_adjudicacio}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary gap-2"
                                >
                                    <ExternalLink size={16} />
                                    Anunci Adjudicació
                                </a>
                            )}
                            
                             {/* Phase Tabs & Explorer Container */}
                             <div className="w-full mt-6 border-t border-slate-100 pt-6">
                                 <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-6">
                                     {[
                                         { id: 'futura', url: contrato.url_json_futura, label: 'Futura' },
                                         { id: 'agregada', url: contrato.url_json_agregada, label: 'Agregada' },
                                         { id: 'cpm', url: contrato.url_json_cpm, label: 'CPM' },
                                         { id: 'previ', url: contrato.url_json_previ, label: 'Previ' },
                                         { id: 'licitacio', url: contrato.url_json_licitacio, label: 'Licitació' },
                                         { id: 'avaluacio', url: contrato.url_json_avaluacio, label: 'Avaluació' },
                                         { id: 'adjudicacio', url: contrato.url_json_adjudicacio, label: 'Adjudicació' },
                                         { id: 'formalitzacio', url: contrato.url_json_formalitzacio, label: 'Formalització' },
                                         { id: 'anulacio', url: contrato.url_json_anulacio, label: 'Anul·lació' }
                                     ].filter(f => f.url).map((phase) => (
                                         <button
                                             key={phase.id}
                                             onClick={() => handleExploreJson(phase.url!, phase.id)}
                                             className={`px-5 py-3 text-sm font-bold transition-all relative rounded-t-xl ${
                                                 activeJsonId === phase.id
                                                     ? 'text-primary-600 bg-primary-50/30'
                                                     : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                             }`}
                                         >
                                             {phase.label}
                                             {activeJsonId === phase.id && (
                                                 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
                                             )}
                                         </button>
                                     ))}
                                 </div>
 
                                 {/* Tab Content */}
                                 {activeJsonId ? (
                                     <div className="w-full p-6 rounded-2xl bg-white border border-slate-200 shadow-sm min-h-[220px] relative overflow-hidden">
                                         {loadingJson && (
                                             <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center z-20">
                                                 <div className="flex flex-col items-center gap-3">
                                                     <div className="loading-spinner w-12 h-12 border-4 border-primary-600 border-t-transparent"></div>
                                                     <p className="text-xs font-black text-slate-500 tracking-[0.2em] uppercase animate-pulse">Analitzant fase...</p>
                                                 </div>
                                             </div>
                                         )}
                                         
                                         {mesaMembers.length > 0 && (
                                             <div className="mb-8">
                                                 <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                     <Users size={14} className="text-primary-500" />
                                                     Mesa de Contractació
                                                 </h5>
                                                 <div className="bg-slate-50/30 rounded-2xl border border-slate-100 overflow-hidden">
                                                     <table className="min-w-full divide-y divide-slate-200">
                                                         <thead className="bg-slate-50">
                                                             <tr>
                                                                 <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Nom</th>
                                                                 <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Càrrec</th>
                                                             </tr>
                                                         </thead>
                                                         <tbody className="divide-y divide-slate-100 bg-white">
                                                             {mesaMembers.map((member, idx) => (
                                                                 <tr key={idx} className="hover:bg-primary-50/20 transition-colors">
                                                                     <td className="px-6 py-3.5 text-sm font-bold text-slate-700">{member.name}</td>
                                                                     <td className="px-6 py-3.5 text-sm text-slate-500 italic font-medium">{member.carrec}</td>
                                                                 </tr>
                                                             ))}
                                                         </tbody>
                                                     </table>
                                                 </div>
                                             </div>
                                         )}
 
                                         {documentsJson.length > 0 && (
                                             <div>
                                                 <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                     <FileText size={14} className="text-primary-500" />
                                                     Documents de la fase
                                                 </h5>
                                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                     {documentsJson.map((doc, idx) => (
                                                         <a 
                                                             key={idx}
                                                             href={doc.url}
                                                             target="_blank"
                                                             rel="noopener noreferrer"
                                                             className="flex items-center justify-between p-4 rounded-xl bg-slate-50/20 border border-slate-200 hover:border-primary-400 hover:bg-white hover:shadow-lg transition-all text-sm group"
                                                         >
                                                             <span className="truncate flex-1 text-slate-700 font-bold group-hover:text-primary-700">{doc.label}</span>
                                                             <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary-600 group-hover:border-primary-100 shadow-sm ml-3 flex-shrink-0">
                                                                 <Download size={16} />
                                                             </div>
                                                         </a>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}
 
                                         {documentsJson.length === 0 && mesaMembers.length === 0 && !loadingJson && (
                                             <div className="py-16 flex flex-col items-center justify-center text-center">
                                                 <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-200 border border-slate-100">
                                                     {jsonError ? <AlertCircle size={32} className="text-red-300" /> : <Search size={32} />}
                                                 </div>
                                                 <p className={`max-w-xs text-sm font-semibold ${jsonError ? 'text-red-500' : 'text-slate-400 italic'}`}>
                                                     {jsonError || "No s'han trobat dades en aquesta fase."}
                                                 </p>
                                             </div>
                                         )}
                                     </div>
                                 ) : (
                                     <div className="w-full py-16 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 bg-slate-50/10">
                                         <Layers size={48} className="mb-4 opacity-10" />
                                         <p className="text-sm font-black uppercase tracking-[0.2em]">Selecciona una fase per explorar</p>
                                     </div>
                                 )}
                             </div>
                         </div>
                      </div>
                  )}
        </div>
    );
}
