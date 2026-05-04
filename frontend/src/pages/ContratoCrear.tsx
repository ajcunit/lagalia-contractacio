import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Departamento, Empleado } from '../api/client';
import { ArrowLeft, Save, Building2, User, FileText, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { showAlert } from '../utils/swal';

export default function ContratoCrear() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [createdId, setCreatedId] = useState<number | null>(null);
    const [gestionaEnabled, setGestionaEnabled] = useState(false);

    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    
    const [formData, setFormData] = useState({
        codi_expedient: '',
        objecte_contracte: '',
        tipus_contracte: '',
        estat_actual: 'En preparació',
        adjudicatari_nom: '',
        adjudicatari_nif: '',
        preu_licitar: '',
        departamentos_ids: [] as number[],
        responsables_ids: [] as number[],
    });

    useEffect(() => {
        const loadCommonData = async () => {
            try {
                const [depts, emps, config] = await Promise.all([
                    api.getDepartamentos(),
                    api.getEmpleados(),
                    api.getConfig('gestiona_integration_enabled').catch(() => ({ valor: 'false' }))
                ]);
                setDepartamentos(depts);
                setEmpleados(emps);
                
                const isGestiona = config.valor === 'true';
                setGestionaEnabled(isGestiona);
                if (isGestiona) {
                    setFormData(prev => ({ ...prev, codi_expedient: `PENDENT-${Date.now()}` }));
                }
            } catch (err) {
                console.error("Error loading common data:", err);
            }
        };
        loadCommonData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, field: 'departamentos_ids' | 'responsables_ids') => {
        const selectedOptions = Array.from(e.target.selectedOptions).map(opt => parseInt(opt.value));
        setFormData(prev => ({ ...prev, [field]: selectedOptions }));
    };

    const handleSave = async () => {
        if (!formData.codi_expedient.trim()) {
            setError('El codi d\'expedient és obligatori');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const payload = {
                ...formData,
                preu_licitar: formData.preu_licitar ? parseFloat(formData.preu_licitar) : undefined,
                estado_interno: 'normal'
            };

            const created = await api.createContrato(payload);
            setCreatedId(created.id);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Error al crear l\'expedient');
        } finally {
            setLoading(false);
        }
    };

    const handleTriggerGestiona = async () => {
        if (!createdId) return;
        try {
            setLoading(true);
            const response = await api.triggerGestionaWebhook(createdId);
            showAlert(response && response.message ? response.message : `Dades enviades (Sense missatge detallat del servidor). Resposta: ${JSON.stringify(response)}`, 'success');
            navigate(`/contratos/${createdId}`);
        } catch (err: any) {
            console.error("Error triggering webhook:", err);
            showAlert(err.message || 'No s\'ha pogut enviar a Gestiona', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-20 py-4 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-transparent">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white text-slate-500 hover:text-primary-600 hover:bg-primary-50 shadow-sm border border-slate-200 transition-all active:scale-95"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Nou Expedient</h1>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Creació manual d'un nou contracte</p>
                    </div>
                </div>
                {!success ? (
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="h-11 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-md shadow-primary-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? <div className="loading-spinner w-5 h-5" /> : <Save size={18} />}
                        Guardar Expedient
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate(`/contratos/${createdId}`)}
                            className="h-11 px-5 rounded-xl bg-white text-slate-700 border border-slate-200 font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
                        >
                            Veure Detall
                        </button>
                        <button 
                            onClick={handleTriggerGestiona} 
                            disabled={loading}
                            className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? <div className="loading-spinner w-5 h-5 border-white border-t-transparent" /> : <ExternalLink size={18} />}
                            Obrir a Gestiona
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="shrink-0 mt-0.5 text-red-500" size={18} />
                    <div>
                        <h3 className="font-bold text-sm">No s'ha pogut guardar</h3>
                        <p className="text-xs font-medium opacity-80 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <Check className="shrink-0 mt-0.5 text-emerald-500" size={18} />
                    <div>
                        <h3 className="font-bold text-sm">Expedient creat amb èxit</h3>
                        <p className="text-xs font-medium opacity-80 mt-1">Ara pots enviar aquest expedient a Gestiona o anar a la fitxa de detall.</p>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${success ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                                <FileText size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Dades Principals</h2>
                        </div>
                        
                        <div className="space-y-5">
                            {!gestionaEnabled && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Codi d'Expedient *</label>
                                    <input 
                                        type="text" 
                                        name="codi_expedient"
                                        value={formData.codi_expedient}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-semibold"
                                        placeholder="Ex: EXP-2026/001"
                                    />
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Objecte del contracte</label>
                                <textarea 
                                    name="objecte_contracte"
                                    value={formData.objecte_contracte}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all resize-none font-medium"
                                    placeholder="Descripció breu del contracte..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipus de contracte</label>
                                    <select 
                                        name="tipus_contracte"
                                        value={formData.tipus_contracte}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-semibold appearance-none"
                                    >
                                        <option value="">Selecciona tipus...</option>
                                        <option value="Subministraments">Subministraments</option>
                                        <option value="Serveis">Serveis</option>
                                        <option value="Obres">Obres</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estat Inicial</label>
                                    <input 
                                        type="text" 
                                        name="estat_actual"
                                        value={formData.estat_actual}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-semibold"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                <Building2 size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Dades Adjudicatari i Imports</h2>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nom Adjudicatari</label>
                                    <input 
                                        type="text" 
                                        name="adjudicatari_nom"
                                        value={formData.adjudicatari_nom}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">NIF</label>
                                    <input 
                                        type="text" 
                                        name="adjudicatari_nif"
                                        value={formData.adjudicatari_nif}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-semibold uppercase"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preu de Licitació (Sense IVA)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        name="preu_licitar"
                                        value={formData.preu_licitar}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 pl-8 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-semibold"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <User size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Assignacions</h2>
                        </div>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Departaments</label>
                                <select 
                                    multiple
                                    value={formData.departamentos_ids.map(String)}
                                    onChange={(e) => handleSelectChange(e, 'departamentos_ids')}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all min-h-[120px]"
                                >
                                    {departamentos.map(d => (
                                        <option key={d.id} value={d.id} className="py-1 px-2 my-0.5 rounded-md hover:bg-slate-200">
                                            {d.nombre}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Mantén Ctrl/Cmd per seleccionar múltiples</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Responsables</label>
                                <select 
                                    multiple
                                    value={formData.responsables_ids.map(String)}
                                    onChange={(e) => handleSelectChange(e, 'responsables_ids')}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all min-h-[120px]"
                                >
                                    {empleados.map(e => (
                                        <option key={e.id} value={e.id} className="py-1 px-2 my-0.5 rounded-md hover:bg-slate-200">
                                            {e.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
