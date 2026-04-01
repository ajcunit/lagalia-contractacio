import { useState, useEffect } from 'react';
import { api, Duplicado, DuplicadoAdjudicatario } from '../api/client';
import { AlertTriangle, Check, X, Merge, Building2 } from 'lucide-react';

export default function Duplicados() {
    const [activeTab, setActiveTab] = useState<'contratos' | 'empresas'>('contratos');
    const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
    const [adjudicatarios, setAdjudicatarios] = useState<DuplicadoAdjudicatario[]>([]);
    const [loading, setLoading] = useState(true);
    const [validando, setValidando] = useState<number | null>(null);
    const [observaciones, setObservaciones] = useState('');

    useEffect(() => {
        const initialLoad = async () => {
            setLoading(true);
            try {
                const [dupsData, adjData] = await Promise.all([
                    api.getDuplicados('pendiente'),
                    api.getDuplicadosAdjudicatarios()
                ]);
                setDuplicados(dupsData);
                setAdjudicatarios(adjData);
                
                // Si no hi ha contractes però hi ha empreses, canviem a la pestanya d'empreses
                if (dupsData.length === 0 && adjData.length > 0) {
                    setActiveTab('empresas');
                }
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setLoading(false);
            }
        };
        initialLoad();
    }, []);

    const loadData = async () => {
        try {
            // Aquesta funció es queda per quan facis fusions, per refrescar la llista
            if (activeTab === 'contratos') {
                const data = await api.getDuplicados('pendiente');
                setDuplicados(data);
            } else {
                const data = await api.getDuplicadosAdjudicatarios();
                setAdjudicatarios(data);
            }
        } catch (err) {
            console.error('Error refreshing data:', err);
        }
    };

    const handleValidar = async (id: number, accion: string) => {
        try {
            setValidando(id);
            await api.validarDuplicado(id, { accion_tomada: accion, observaciones });
            setObservaciones('');
            loadData();
        } catch (err) {
            console.error('Error validating duplicado:', err);
        } finally {
            setValidando(null);
        }
    };

    const handleGestionarAdjudicatario = async (id: number, accion: string) => {
        try {
            setValidando(id);
            await api.gestionarDuplicadoAdjudicatario(id, accion);
            loadData();
        } catch (err) {
            console.error('Error managing adjudicatario duplicate:', err);
        } finally {
            setValidando(null);
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

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('ca-ES');
    };

    if (loading && (duplicados.length === 0 && adjudicatarios.length === 0)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="loading-spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Cua de Validació</h1>
                        <p className="text-slate-500">Neteja i resolució de duplicats del sistema</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit">
                    <button
                        onClick={() => setActiveTab('contratos')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                            activeTab === 'contratos' 
                            ? 'bg-white text-primary-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <AlertTriangle size={16} />
                        Contractes
                        {duplicados.length > 0 && (
                            <span className="ml-1 bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[10px]">
                                {duplicados.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('empresas')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                            activeTab === 'empresas' 
                            ? 'bg-white text-primary-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Building2 size={16} />
                        Empreses
                        {adjudicatarios.length > 0 && (
                            <span className="ml-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px]">
                                {adjudicatarios.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {activeTab === 'contratos' ? (
                /* --- TAB CONTRACTES --- */
                duplicados.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <Check className="text-green-600" size={32} />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800">Tot al dia!</h3>
                        <p className="text-slate-500 mt-2">No hi ha duplicats de contractes pendents</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {duplicados.map((duplicado) => (
                            <div key={duplicado.id} className="glass-card p-6 border-l-4 border-l-orange-400">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                            <AlertTriangle className="text-orange-600" size={22} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg uppercase tracking-tight">
                                                Expedient: {duplicado.valor_duplicado.split('|')[0]}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Detecció automàtica</span>
                                                {duplicado.motivo_duplicado && (
                                                    <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-100">
                                                        {duplicado.motivo_duplicado}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-400 block font-medium uppercase">Data Detecció</span>
                                        <span className="text-sm font-bold text-slate-600">{formatDateTime(duplicado.fecha_deteccion)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    {/* Opció 1 */}
                                    <div className="relative group p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary-200 transition-all duration-300">
                                        <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-primary-600 border border-primary-100 shadow-sm">OPCIÓ A</div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Versió Existente</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[40px] leading-tight">{duplicado.contrato_1?.objecte_contracte}</p>
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium italic"><Building2 size={12}/> {duplicado.contrato_1?.adjudicatari_nom}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-2 rounded-xl border border-slate-100">
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Import</p>
                                                    <p className="text-xs font-bold text-slate-700">{formatCurrency(duplicado.contrato_1?.import_adjudicacio_amb_iva)}</p>
                                                </div>
                                                <div className="bg-white p-2 rounded-xl border border-slate-100">
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Publicació</p>
                                                    <p className="text-xs font-bold text-slate-700">{duplicado.contrato_1?.data_actualitzacio ? new Date(duplicado.contrato_1.data_actualitzacio).toLocaleDateString('ca-ES') : '-'}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleValidar(duplicado.id, 'aprobar_1')}
                                                disabled={validando !== null}
                                                className="w-full btn btn-primary py-2.5 text-xs gap-2 rounded-xl"
                                            >
                                                <Check size={16} /> Mantenir Aquesta
                                            </button>
                                        </div>
                                    </div>

                                    {/* Opció 2 */}
                                    <div className="relative group p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary-200 transition-all duration-300">
                                        <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-primary-600 border border-primary-100 shadow-sm">OPCIÓ B</div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Versió Nova Detectada</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[40px] leading-tight">{duplicado.contrato_2?.objecte_contracte}</p>
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium italic"><Building2 size={12}/> {duplicado.contrato_2?.adjudicatari_nom}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-2 rounded-xl border border-slate-100">
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Import</p>
                                                    <p className="text-xs font-bold text-slate-700">{formatCurrency(duplicado.contrato_2?.import_adjudicacio_amb_iva)}</p>
                                                </div>
                                                <div className="bg-white p-2 rounded-xl border border-slate-100">
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Publicació</p>
                                                    <p className="text-xs font-bold text-slate-700">{duplicado.contrato_2?.data_actualitzacio ? new Date(duplicado.contrato_2.data_actualitzacio).toLocaleDateString('ca-ES') : '-'}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleValidar(duplicado.id, 'aprobar_2')}
                                                disabled={validando !== null}
                                                className="w-full btn btn-primary py-2.5 text-xs gap-2 rounded-xl"
                                            >
                                                <Check size={16} /> Mantenir Aquesta
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex-1 max-w-md">
                                        <textarea
                                            placeholder="Afegeix notes de validació (opcional)..."
                                            className="w-full bg-slate-50 border-none rounded-xl text-sm p-3 focus:ring-2 focus:ring-primary-500 min-h-[44px] transition-all"
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-3 ml-6">
                                        <button 
                                            onClick={() => handleValidar(duplicado.id, 'fusionar')}
                                            disabled={validando !== null}
                                            className="btn btn-secondary px-6 text-xs gap-2 rounded-xl hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200"
                                            title="Combina el millor de les dues i tanca cas"
                                        >
                                            <Merge size={16} /> Fusionar Automàtic
                                        </button>
                                        <button 
                                            onClick={() => handleValidar(duplicado.id, 'rechazar_ambos')}
                                            disabled={validando !== null}
                                            className="btn btn-secondary px-6 text-xs gap-2 rounded-xl border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200"
                                        >
                                            <X size={16} /> Rebutjar Tots Dos
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                /* --- TAB EMPRESES --- */
                adjudicatarios.length === 0 ? (
                    <div className="glass-card p-12 text-center text-slate-500">
                        <Building2 className="mx-auto mb-4 opacity-20" size={64} />
                        <h3 className="text-xl font-semibold text-slate-800">Directori Net</h3>
                        <p className="mt-2">No s'han trobat empreses amb noms fragmentats o corregibles.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-4 items-start mb-2">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                <Building2 className="text-amber-700" size={20} />
                            </div>
                            <div>
                                <h4 className="text-amber-900 font-bold text-sm uppercase tracking-tight">Neteja d'Adjudicataris</h4>
                                <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                                    Aquí pots fusionar versions diferents del nom d'una mateixa empresa (ex: sigles, errors ortogràfics). 
                                    En triar un nom, el sistema actualitzarà <strong>tots els contractes passats i futurs</strong> amb aquest nom canònic.
                                </p>
                            </div>
                        </div>

                        {adjudicatarios.map((adj) => (
                            <div key={adj.id} className="glass-card p-5 hover:border-amber-200 transition-all">
                                <div className="flex items-center justify-between gap-6">
                                    <div className="flex-1 flex items-center gap-10">
                                        <div className="flex flex-col gap-1 min-w-[200px]">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identificador Fiscal</span>
                                            <code className="text-sm font-mono text-primary-700 font-bold bg-primary-50 px-3 py-1 rounded-lg border border-primary-100 w-fit">
                                                {adj.nif}
                                            </code>
                                        </div>

                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Versió A</p>
                                                <p className="text-sm font-bold text-slate-700">{adj.nombre_1}</p>
                                            </div>
                                            
                                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                                <Merge size={14} className="text-slate-400" />
                                            </div>

                                            <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Versió B</p>
                                                <p className="text-sm font-bold text-slate-700">{adj.nombre_2}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 min-w-[220px]">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleGestionarAdjudicatario(adj.id, 'fusionar_1')}
                                                disabled={validando !== null}
                                                className="flex-1 btn btn-primary text-xs py-2 rounded-xl"
                                                title={`Tots els contractes passaran a anomenar-se ${adj.nombre_1}`}
                                            >
                                                Fixar A
                                            </button>
                                            <button 
                                                onClick={() => handleGestionarAdjudicatario(adj.id, 'fusionar_2')}
                                                disabled={validando !== null}
                                                className="flex-1 btn btn-primary text-xs py-2 rounded-xl"
                                                title={`Tots els contractes passaran a anomenar-se ${adj.nombre_2}`}
                                            >
                                                Fixar B
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => handleGestionarAdjudicatario(adj.id, 'rechazar')}
                                            disabled={validando !== null}
                                            className="w-full btn btn-secondary text-[10px] py-1.5 uppercase font-bold tracking-tight rounded-lg hover:border-red-200 hover:text-red-600"
                                        >
                                            Ignorar (Són diferents)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
