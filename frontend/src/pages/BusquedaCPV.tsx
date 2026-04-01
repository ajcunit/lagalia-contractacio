import { useState, useEffect } from 'react';
import { api, CPV, CPVAISuggestion } from '../api/client';
import {
    Search,
    Sparkles,
    Info,
    Copy,
    Loader2,
    AlertCircle
} from 'lucide-react';

export default function BusquedaCPV() {
    const [searchTerm, setSearchTerm] = useState('');
    const [aiDescription, setAiDescription] = useState('');
    const [results, setResults] = useState<CPV[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<CPVAISuggestion[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);
    const [mode, setMode] = useState<'manual' | 'ai'>('manual');
    const [iaEnabled, setIaEnabled] = useState(true);

    useEffect(() => {
        api.getConfig('ia_enabled').then(res => {
            setIaEnabled(res.valor === 'true');
            if (res.valor !== 'true') setMode('manual');
        }).catch(() => setIaEnabled(true));
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setLoadingSearch(true);
        try {
            const data = await api.searchCpvs(searchTerm);
            setResults(data);
        } catch (err) {
            console.error('Error searching CPVs:', err);
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleAISuggest = async () => {
        if (!aiDescription.trim()) return;

        setLoadingAI(true);
        try {
            const data = await api.suggestCpvsAI(aiDescription);
            setAiSuggestions(data.suggestions);
        } catch (err) {
            console.error('Error getting AI suggestions:', err);
        } finally {
            setLoadingAI(false);
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        // Could add a toast notification here
    };

    return (
        <div className="space-y-6 w-full flex-1 overflow-auto pr-1">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Buscador de Codis CPV</h1>
                    <p className="text-slate-500 mt-1">Troba el codi oficial correcte per a la teva licitació</p>
                </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setMode('manual')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                        mode === 'manual' 
                        ? 'bg-white text-primary-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Cerca Manual
                </button>
                {iaEnabled && (
                    <button
                        onClick={() => setMode('ai')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            mode === 'ai' 
                            ? 'bg-white text-primary-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Sparkles size={16} />
                        Suggeriments IA
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Search Panel */}
                <div className="lg:col-span-12">
                    {mode === 'manual' ? (
                        <div className="glass-card p-6">
                            <form onSubmit={handleSearch} className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Cerca per codi (ex: 722) o paraula clau (ex: software)..."
                                        className="input input-bordered w-full pl-10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary px-8" disabled={loadingSearch}>
                                    {loadingSearch ? <Loader2 className="animate-spin" size={20} /> : 'Cercar'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="glass-card p-6 bg-gradient-to-br from-primary-50/50 to-white border-primary-100">
                            <div className="flex items-center gap-2 mb-4 text-primary-700">
                                <Sparkles size={20} />
                                <h3 className="font-semibold italic">Assistent Intel·ligent de CPV</h3>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">
                                Descriu l'objecte del contracte o el projecte i la IA et suggerirà els codis més rellevants.
                            </p>
                            <div className="space-y-4">
                                <textarea
                                    className="input input-bordered w-full h-32 py-3"
                                    placeholder="Exemple: Contracte de serveis per al manteniment preventiu i correctiu dels ascensors de l'ajuntament per un període de 2 anys..."
                                    value={aiDescription}
                                    onChange={(e) => setAiDescription(e.target.value)}
                                />
                                <button 
                                    onClick={handleAISuggest} 
                                    className="btn btn-primary gap-2 w-full sm:w-auto" 
                                    disabled={loadingAI || !aiDescription.trim()}
                                >
                                    {loadingAI ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Analitzant amb Ollama...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            Generar Suggeriments
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Area */}
                <div className="lg:col-span-12">
                    {mode === 'manual' && results.length > 0 && (
                        <div className="glass-card overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h4 className="font-medium text-slate-700">Resultats de la cerca ({results.length})</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Codi</th>
                                            <th className="px-6 py-3 font-semibold">Descripció</th>
                                            <th className="px-6 py-3 font-semibold">Nivell</th>
                                            <th className="px-6 py-3 font-semibold w-24">Accions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {results.map((cpv) => (
                                            <tr key={cpv.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-primary-700 bg-primary-50 px-2 py-1 rounded border border-primary-100 text-sm">
                                                        {cpv.codigo}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-700 text-sm">{cpv.descripcion}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                        cpv.nivel === 'Categoria' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                        cpv.nivel === 'Classe' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                        {cpv.nivel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button 
                                                        onClick={() => copyToClipboard(cpv.codigo)}
                                                        className="text-slate-400 hover:text-primary-600 transition-colors" 
                                                        title="Copiar codi"
                                                    >
                                                        <Copy size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {mode === 'ai' && aiSuggestions.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="font-medium text-slate-700 px-2 flex items-center gap-2">
                                <Sparkles size={18} className="text-primary-500" />
                                Suggeriments d'Intel·ligència Artificial
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {aiSuggestions.map((s, idx) => (
                                    <div key={idx} className="glass-card p-5 hover:shadow-md transition-all border-l-4 border-l-primary-500">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-lg font-bold text-primary-700">{s.codigo}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-primary-500 rounded-full" 
                                                            style={{ width: `${s.score * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 capitalize">Relevància: {(s.score * 100).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => copyToClipboard(s.codigo)}
                                                className="text-slate-400 hover:text-primary-600 transition-colors p-1"
                                                title="Copiar codi"
                                            >
                                                <Copy size={20} />
                                            </button>
                                        </div>
                                        <p className="font-semibold text-slate-800 text-sm mb-2">{s.descripcion}</p>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-3">
                                            <div className="flex gap-2 items-start">
                                                <Info size={14} className="text-primary-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-slate-500 italic leading-relaxed">
                                                    {s.justificacion}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {((mode === 'manual' && results.length === 0 && !loadingSearch && searchTerm) || 
                      (mode === 'ai' && aiSuggestions.length === 0 && !loadingAI && aiDescription)) && (
                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                            <AlertCircle size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">No s'ha trobat cap resultat</p>
                            <p className="text-slate-400 text-sm">Prova amb altres termes o una descripció més detallada</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
