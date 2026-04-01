import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Flag, AlertTriangle, TrendingDown, Clock, ExternalLink, Bot, Sparkles, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export default function Auditoria() {
    const [fraccionamientos, setFraccionamientos] = useState<any[]>([]);
    const [bajas, setBajas] = useState<any[]>([]);
    const [caducidad, setCaducidad] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [iaEnabled, setIaEnabled] = useState(true);
    const [customPrompt, setCustomPrompt] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [dataFrac, dataBajas, dataCad, iaConf] = await Promise.all([
                api.request<any[]>('/auditoria/redflags/fraccionamientos'),
                api.request<any[]>('/auditoria/redflags/bajas_temerarias'),
                api.request<any[]>('/auditoria/redflags/caducidad_proxima'),
                api.getConfig('ia_enabled').catch(() => ({ valor: 'true' }))
            ]);
            setFraccionamientos(dataFrac);
            setBajas(dataBajas);
            setCaducidad(dataCad);
            setIaEnabled(iaConf.valor === 'true');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadAiAnalysis = async () => {
        try {
            setAiLoading(true);
            setAiAnalysis(null);
            const res = await api.getAuditoriaAIAnalysis(customPrompt.trim() !== '' ? customPrompt : undefined);
            setAiAnalysis(res.analysis);
        } catch (error) {
            console.error("Error fetching AI analysis:", error);
            setAiAnalysis("Error de connexió amb el sistema d'intel·ligència artificial. Revisa si l'Ollama està actiu.");
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12">Carregant alertes d'intervenció...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                    <Flag size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Alertes d'Auditoria</h1>
                    <p className="text-slate-500">Panell de control per a Intervenció (Red Flags)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Posibles Fraccionaments */}
                <div className="glass-card p-6 border-t-4 border-t-orange-500">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="text-orange-500" />
                        <h2 className="text-lg font-bold text-slate-800">Possibles Fraccionaments (Menors &gt; 15.000€ l'últim any)</h2>
                    </div>
                    {fraccionamientos.length === 0 ? (
                        <p className="text-slate-500 italic">Cap alerta detectada.</p>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-auto pr-2">
                            {fraccionamientos.map((f, i) => (
                                <Link 
                                    to={`/contratos-menores?adjudicatari=${encodeURIComponent(f.nombre)}`}
                                    key={i} 
                                    className="block p-3 bg-orange-50 rounded-lg border border-orange-100 hover:border-orange-300 hover:bg-orange-100/50 transition-colors cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-orange-900 group-hover:text-orange-700 transition-colors truncate pr-4">{f.nombre}</h3>
                                        <ExternalLink size={16} className="text-orange-400 group-hover:text-orange-600 flex-shrink-0 mt-0.5" />
                                    </div>
                                    <div className="text-sm text-orange-700 flex justify-between mt-1">
                                        <span>{f.numero_contratos} contractes</span>
                                        <span className="font-bold">{new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(f.importe_total)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Baixes Temeràries */}
                <div className="glass-card p-6 border-t-4 border-t-red-500">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingDown className="text-red-500" />
                        <h2 className="text-lg font-bold text-slate-800">Baixes Temeràries (&gt; 20% descompte)</h2>
                    </div>
                    {bajas.length === 0 ? (
                        <p className="text-slate-500 italic">Cap alerta detectada.</p>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-auto pr-2">
                            {bajas.map((b, i) => (
                                <Link 
                                    to={`/contratos/${b.id}`}
                                    key={i} 
                                    className="block p-3 bg-red-50 rounded-lg border border-red-100 hover:border-red-300 hover:bg-red-100/50 transition-colors cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-mono text-xs font-bold text-red-900 mb-1 group-hover:text-red-700 transition-colors flex items-center gap-2">
                                            {b.codi_expedient}
                                            <ExternalLink size={12} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h3>
                                        <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">-{b.porcentaje_baja.toFixed(1)}%</span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 line-clamp-1 mb-1">{b.adjudicatari_nom}</p>
                                    <div className="text-xs text-red-700 flex justify-between">
                                        <span>Licitat: {new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(b.preu_licitar)}</span>
                                        <span>Adjudicat: {new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(b.preu_adjudicar)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Caducitat Pròxima */}
                <div className="glass-card p-6 border-t-4 border-t-blue-500 xl:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="text-blue-500" />
                        <h2 className="text-lg font-bold text-slate-800">Caducitat Pròxima (&lt; 6 mesos i en execució)</h2>
                    </div>
                    {caducidad.length === 0 ? (
                        <p className="text-slate-500 italic">Cap alerta detectada.</p>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-auto pr-2">
                            {caducidad.map((c, i) => (
                                <Link 
                                    to={`/contratos/${c.id}`}
                                    key={i} 
                                    className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between hover:border-blue-300 hover:bg-blue-100/50 transition-colors cursor-pointer group"
                                >
                                    <div>
                                        <h3 className="font-mono text-xs font-bold text-blue-900 mb-1 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                                            {c.codi_expedient}
                                            <ExternalLink size={12} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h3>
                                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{c.objecte_contracte}</p>
                                    </div>
                                    <div className="text-right pl-4 shrink-0">
                                        <div className="text-xs text-blue-600 mb-1">Finalitza el</div>
                                        <div className="font-bold text-blue-800">{new Date(c.fecha_fin).toLocaleDateString('ca-ES')}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Submòdul d'Intel·ligència Artificial */}
            {iaEnabled && (
                <div className="glass-card p-6 border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50/50 mt-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Bot size={120} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-purple-500" size={24} />
                        <h2 className="text-xl font-bold text-slate-800">Assistent d'Auditoria basat en IA</h2>
                    </div>
                </div>

                <div className="relative z-10 mb-6 bg-white/50 p-4 rounded-xl border border-purple-100 flex flex-col sm:flex-row gap-3">
                    <textarea
                        placeholder="Escriu una instrucció personalitzada per l'IA (opcional)... ex: Actúa com l'alcalde en comptes de l'interventor."
                        className="input input-bordered w-full bg-white text-slate-700 placeholder-slate-400 py-3 min-h-[50px]"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        disabled={aiLoading}
                    />
                    <button 
                        onClick={loadAiAnalysis} 
                        className="btn btn-secondary text-purple-700 bg-purple-100 hover:bg-purple-200 border-none flex items-center justify-center gap-2 shrink-0 sm:w-auto h-auto py-3 px-6"
                        disabled={aiLoading}
                    >
                        {aiLoading ? (
                            <>
                                <RefreshCw className="animate-spin" size={16} />
                                Analitzant...
                            </>
                        ) : (
                            <>
                                <Bot size={16} />
                                Generar Anàlisi
                            </>
                        )}
                    </button>
                </div>
                
                <div className="relative z-10">
                    {aiLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                            <p className="text-purple-600 font-medium animate-pulse">L'Interventor IA està redactant l'informe...</p>
                        </div>
                    ) : aiAnalysis ? (
                        <div className="p-6 bg-white/80 rounded-xl border border-purple-100 shadow-sm text-slate-800 text-sm leading-relaxed prose prose-purple prose-sm max-w-none">
                            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="py-6 text-center text-slate-500">
                            Fes clic al botó superior per sol·licitar a l'IA un anàlisi d'aquests indicadors de risc (Red Flags).
                        </div>
                    )}
                </div>
                </div>
            )}
        </div>
    );
}
