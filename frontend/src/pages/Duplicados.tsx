import { useState, useEffect } from 'react';
import { api, Duplicado } from '../api/client';
import { AlertTriangle, Check, X, Merge, Calendar, DollarSign } from 'lucide-react';

export default function Duplicados() {
    const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
    const [loading, setLoading] = useState(true);
    const [validando, setValidando] = useState<number | null>(null);
    const [observaciones, setObservaciones] = useState('');

    useEffect(() => {
        loadDuplicados();
    }, []);

    const loadDuplicados = async () => {
        try {
            setLoading(true);
            const data = await api.getDuplicados('pendiente');
            setDuplicados(data);
        } catch (err) {
            console.error('Error loading duplicados:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleValidar = async (id: number, accion: string) => {
        try {
            setValidando(id);
            await api.validarDuplicado(id, { accion_tomada: accion, observaciones });
            setObservaciones('');
            loadDuplicados();
        } catch (err) {
            console.error('Error validating duplicado:', err);
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

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ca-ES');
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('ca-ES');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="loading-spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Duplicats Pendents</h1>
                    <p className="text-slate-500">Validació de contractes duplicats detectats</p>
                </div>
                <span className="badge badge-pending text-lg px-4 py-2">
                    {duplicados.length} pendents
                </span>
            </div>

            {duplicados.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <Check className="text-green-600" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">Tot al dia!</h3>
                    <p className="text-slate-500 mt-2">No hi ha duplicats pendents de validar</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {duplicados.map((duplicado) => (
                        <div key={duplicado.id} className="glass-card p-6">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                    <AlertTriangle className="text-orange-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">
                                        Expedient: {duplicado.valor_duplicado.split('|')[0]}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Detectat: {formatDateTime(duplicado.fecha_deteccion)}
                                    </p>
                                </div>
                            </div>

                            {/* Comparison */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                {/* Contract A */}
                                <div className="border border-slate-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-lg font-semibold text-slate-800">Contracte A</span>
                                        <span className="badge badge-info">
                                            ID: {duplicado.contrato_1?.id}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar size={16} className="text-slate-400" />
                                            <span className="text-slate-500">Actualitzat:</span>
                                            <span className="font-medium">
                                                {formatDateTime(duplicado.contrato_1?.data_actualitzacio)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <DollarSign size={16} className="text-slate-400" />
                                            <span className="text-slate-500">Import:</span>
                                            <span className="font-medium">
                                                {formatCurrency(duplicado.contrato_1?.import_adjudicacio_amb_iva)}
                                            </span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-slate-500">Adjudicatari:</span>
                                            <p className="font-medium">{duplicado.contrato_1?.adjudicatari_nom || '-'}</p>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-slate-500">Data Adjudicació:</span>
                                            <p className="font-medium">
                                                {formatDate(duplicado.contrato_1?.data_anunci_adjudicacio)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contract B */}
                                <div className="border border-slate-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-lg font-semibold text-slate-800">Contracte B</span>
                                        <span className="badge badge-info">
                                            ID: {duplicado.contrato_2?.id}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar size={16} className="text-slate-400" />
                                            <span className="text-slate-500">Actualitzat:</span>
                                            <span className="font-medium">
                                                {formatDateTime(duplicado.contrato_2?.data_actualitzacio)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <DollarSign size={16} className="text-slate-400" />
                                            <span className="text-slate-500">Import:</span>
                                            <span className="font-medium">
                                                {formatCurrency(duplicado.contrato_2?.import_adjudicacio_amb_iva)}
                                            </span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-slate-500">Adjudicatari:</span>
                                            <p className="font-medium">{duplicado.contrato_2?.adjudicatari_nom || '-'}</p>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-slate-500">Data Adjudicació:</span>
                                            <p className="font-medium">
                                                {formatDate(duplicado.contrato_2?.data_anunci_adjudicacio)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Observations */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Observacions
                                </label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Afegir observacions (opcional)..."
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    className="btn btn-success gap-2"
                                    onClick={() => handleValidar(duplicado.id, 'aprobar_1')}
                                    disabled={validando === duplicado.id}
                                >
                                    <Check size={18} />
                                    Aprovar A
                                </button>
                                <button
                                    className="btn btn-success gap-2"
                                    onClick={() => handleValidar(duplicado.id, 'aprobar_2')}
                                    disabled={validando === duplicado.id}
                                >
                                    <Check size={18} />
                                    Aprovar B
                                </button>
                                <button
                                    className="btn btn-primary gap-2"
                                    onClick={() => handleValidar(duplicado.id, 'fusionar')}
                                    disabled={validando === duplicado.id}
                                >
                                    <Merge size={18} />
                                    Fusionar (més recent)
                                </button>
                                <button
                                    className="btn btn-danger gap-2"
                                    onClick={() => handleValidar(duplicado.id, 'rechazar_ambos')}
                                    disabled={validando === duplicado.id}
                                >
                                    <X size={18} />
                                    Rebutjar ambdós
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
