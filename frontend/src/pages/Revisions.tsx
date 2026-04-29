import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, ContratoListItem } from '../api/client';
import {
    AlertTriangle,
    Clock,
    CheckCircle2,
    XCircle,
    ExternalLink,
    RefreshCw,
    FileText,
} from 'lucide-react';

type Tab = 'finalitzats' | 'proxims';

export default function Revisions() {
    const [activeTab, setActiveTab] = useState<Tab>('finalitzats');
    const [finalitzats, setFinalitzats] = useState<ContratoListItem[]>([]);
    const [proxims, setProxims] = useState<ContratoListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fin, prox] = await Promise.all([
                api.getContratos({ possiblement_finalitzat: true, limit: 200 }),
                api.getContratos({ alerta_finalitzacio: true, limit: 200 }),
            ]);
            setFinalitzats(fin);
            setProxims(prox);
        } catch (err) {
            console.error('Error loading revisions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleFinalitzar = async (id: number, expedient: string) => {
        if (!window.confirm(`Confirmes que el contracte ${expedient} està realment finalitzat?`)) return;
        try {
            setActionLoading(id);
            await api.finalitzarContrato(id);
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Error al finalitzar el contracte');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDescartar = async (id: number, expedient: string) => {
        if (!window.confirm(`Descartar l'alerta de finalització per ${expedient}? El contracte tornarà a l'estat normal.`)) return;
        try {
            setActionLoading(id);
            await api.descartarFinalitzacio(id);
            await loadData();
        } catch (err: any) {
            alert(err.message || "Error al descartar l'alerta");
        } finally {
            setActionLoading(null);
        }
    };

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('ca-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ca-ES');
    };

    const currentList = activeTab === 'finalitzats' ? finalitzats : proxims;

    return (
        <div className="space-y-6 flex-1 overflow-auto pr-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Revisions</h1>
                    <p className="text-slate-500">Contractes pendents de revisió i gestió de finalització</p>
                </div>
                <button onClick={loadData} disabled={loading} className="btn btn-secondary gap-2">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Actualitzar
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => setActiveTab('finalitzats')}
                    className={`glass-card p-5 text-left transition-all border-l-4 ${
                        activeTab === 'finalitzats' 
                            ? 'border-l-red-500 ring-2 ring-red-200 bg-red-50/30' 
                            : 'border-l-red-300 hover:border-l-red-400'
                    }`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="text-red-600" size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Possiblement Finalitzats</h3>
                            <p className="text-xs text-slate-500">Contractes que han superat la data de fi calculada</p>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-red-600 mt-2">{finalitzats.length}</p>
                </button>

                <button
                    onClick={() => setActiveTab('proxims')}
                    className={`glass-card p-5 text-left transition-all border-l-4 ${
                        activeTab === 'proxims' 
                            ? 'border-l-yellow-500 ring-2 ring-yellow-200 bg-yellow-50/30' 
                            : 'border-l-yellow-300 hover:border-l-yellow-400'
                    }`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                            <Clock className="text-yellow-600" size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Pròxims a Finalitzar</h3>
                            <p className="text-xs text-slate-500">Contractes que finalitzen en els pròxims mesos</p>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{proxims.length}</p>
                </button>
            </div>

            {/* Contract List */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <FileText size={18} className="text-primary-600" />
                        {activeTab === 'finalitzats' ? 'Contractes Possiblement Finalitzats' : 'Contractes Pròxims a Finalitzar'}
                        <span className="text-sm font-normal text-slate-500">({currentList.length})</span>
                    </h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="loading-spinner w-10 h-10"></div>
                    </div>
                ) : currentList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <CheckCircle2 size={48} className="mb-3 text-green-400" />
                        <p className="font-medium text-lg text-slate-600">Tot al dia!</p>
                        <p className="text-sm">No hi ha contractes pendents de revisió en aquesta categoria.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {currentList.map(c => (
                            <div
                                key={c.id}
                                className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group"
                            >
                                {/* Contract Info */}
                                <Link to={`/contratos/${c.id}`} className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-slate-800">{c.codi_expedient}</span>
                                        <ExternalLink size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {c.estat_actual && (
                                            <span className="badge badge-info text-[10px]">{c.estat_actual}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 truncate" title={c.objecte_contracte}>
                                        {c.objecte_contracte || 'Sense objecte'}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        {c.adjudicatari_nom && <span>{c.adjudicatari_nom}</span>}
                                        {c.import_adjudicacio_amb_iva && (
                                            <span className="font-medium text-slate-500">
                                                {formatCurrency(c.import_adjudicacio_amb_iva)}
                                            </span>
                                        )}
                                    </div>
                                </Link>

                                {/* Date badge */}
                                <div className="hidden sm:block text-right flex-shrink-0">
                                    {c.data_finalitzacio_calculada && (
                                        <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                                            activeTab === 'finalitzats' 
                                                ? 'bg-red-100 text-red-700' 
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {formatDate(c.data_finalitzacio_calculada)}
                                        </div>
                                    )}
                                    {c.departamentos && c.departamentos.length > 0 && (
                                        <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[140px]">
                                            {c.departamentos.map(d => d.nombre).join(', ')}
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {activeTab === 'finalitzats' && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleFinalitzar(c.id, c.codi_expedient)}
                                            disabled={actionLoading === c.id}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                                            title="Confirmar que està finalitzat"
                                        >
                                            {actionLoading === c.id ? (
                                                <div className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <CheckCircle2 size={14} />
                                            )}
                                            <span className="hidden md:inline">Finalitzar</span>
                                        </button>
                                        <button
                                            onClick={() => handleDescartar(c.id, c.codi_expedient)}
                                            disabled={actionLoading === c.id}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                            title="Descartar alerta (no està finalitzat)"
                                        >
                                            {actionLoading === c.id ? (
                                                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <XCircle size={14} />
                                            )}
                                            <span className="hidden md:inline">Descartar</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
