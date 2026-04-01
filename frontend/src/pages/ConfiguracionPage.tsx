import { useState, useEffect } from 'react';
import { api, Empleado } from '../api/client';
import { 
    Globe, 
    Cpu, 
    Building2, 
    Save, 
    RefreshCw, 
    Loader2, 
    Settings,
    Users
} from 'lucide-react';

import Sincronizacion from './Sincronizacion';
import Empleados from './Empleados';
import Departamentos from './Departamentos';

export default function ConfiguracionPage() {
    const [activeTab, setActiveTab] = useState<'general' | 'sync' | 'personnel'>('general');
    const [personnelTab, setPersonnelTab] = useState<'employees' | 'departments'>('employees');
    
    const [configs, setConfigs] = useState<Record<string, string>>({
        'ine10_code': '',
        'sync_api_url': '',
        'prorrogues_api_url': '',
        'cpv_api_url': '',
        'ollama_url': '',
        'ollama_model_cpv': '',
        'ollama_model_auditoria': '',
        'ollama_think': 'smart',
        'ia_enabled': 'true'
    });
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingModels, setLoadingModels] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [user, setUser] = useState<Empleado | null>(null);

    const isAdmin = user?.rol === 'admin';
    const isResponsable = user?.rol === 'responsable_contratacion';

    useEffect(() => {
        loadAllConfig();
        api.getMe().then(setUser).catch(() => {});
    }, []);

    const loadAllConfig = async () => {
        setLoading(true);
        try {
            const keys = ['ine10_code', 'sync_api_url', 'prorrogues_api_url', 'cpv_api_url', 'ollama_url', 'ollama_model_cpv', 'ollama_model_auditoria', 'ollama_think', 'ia_enabled'];
            const newConfigs: Record<string, string> = {};
            
            for (const key of keys) {
                try {
                    const cfg = await api.getConfig(key);
                    newConfigs[key] = cfg.valor;
                } catch (err) {
                    // Fallback defaults for UI display if not in DB yet
                    if (key === 'ine10_code') newConfigs[key] = '4305160009';
                    else if (key === 'sync_api_url') newConfigs[key] = 'https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json';
                    else if (key === 'prorrogues_api_url') newConfigs[key] = 'https://analisi.transparenciacatalunya.cat/resource/hb6v-jcbf.json';
                    else if (key === 'cpv_api_url') newConfigs[key] = 'https://analisi.transparenciacatalunya.cat/resource/wxdw-5eyv.json?$limit=50000';
                    else if (key === 'ollama_url') newConfigs[key] = 'http://localhost:11434';
                    else if (key === 'ollama_model_cpv') newConfigs[key] = 'llama3';
                    else if (key === 'ollama_model_auditoria') newConfigs[key] = 'llama3';
                    else if (key === 'ollama_think') newConfigs[key] = 'smart';
                    else if (key === 'ia_enabled') newConfigs[key] = 'true';
                }
            }
            setConfigs(newConfigs);
            fetchModels();
        } catch (err) {
            console.error('Error loading config:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchModels = async () => {
        setLoadingModels(true);
        try {
            const models = await api.getOllamaModels();
            setAvailableModels(models);
        } catch (err) {
            console.error('Error fetching models:', err);
            setAvailableModels([]);
        } finally {
            setLoadingModels(false);
        }
    };

    const handleChange = (clave: string, valor: string) => {
        setConfigs({ ...configs, [clave]: valor });
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await Promise.all(
                Object.entries(configs).map(([clave, valor]) => api.updateConfig(clave, valor))
            );
            setMessage({ type: 'success', text: 'Configuració guardada correctament' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error('Error saving config:', err);
            setMessage({ type: 'error', text: 'Error al guardar la configuració' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 w-full flex-1 overflow-auto pr-1">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Administració del Sistema</h1>
                <p className="text-slate-500 mt-1">Gestió de paràmetres, sincronització i personal</p>
            </div>

            {/* Main Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'general' 
                            ? 'bg-white text-primary-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Settings size={16} />
                        Configuració General
                    </button>
                )}
                {(isAdmin || isResponsable) && (
                    <button
                        onClick={() => setActiveTab('sync')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'sync' 
                            ? 'bg-white text-primary-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <RefreshCw size={16} />
                        Sincronització
                    </button>
                )}
                {(isAdmin || isResponsable) && (
                    <button
                        onClick={() => setActiveTab('personnel')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'personnel' 
                            ? 'bg-white text-primary-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Users size={16} />
                        Gestió de Personal
                    </button>
                )}
            </div>

            <div className="mt-6">
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="animate-spin text-primary-500" size={40} />
                            </div>
                        ) : (
                            <>
                                {/* Organisme */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-2 mb-6 text-slate-800 font-semibold border-b border-slate-100 pb-4">
                                        <Building2 size={20} className="text-primary-500" />
                                        <h2>Dades de l'Organisme</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Codi INE10</label>
                                            <input 
                                                type="text" 
                                                className="input input-bordered w-full" 
                                                value={configs.ine10_code}
                                                onChange={(e) => handleChange('ine10_code', e.target.value)}
                                                placeholder="ex: 4305160009"
                                            />
                                            <p className="text-xs text-slate-400">Identificador únic de l'ajuntament o ens públic.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Endpoints */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-2 mb-6 text-slate-800 font-semibold border-b border-slate-100 pb-4">
                                        <Globe size={20} className="text-primary-500" />
                                        <h2>Endpoints de Sincronització</h2>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">URL Plataforma de Contractació Pública (JSON)</label>
                                            <input 
                                                type="text" 
                                                className="input input-bordered w-full" 
                                                value={configs.sync_api_url}
                                                onChange={(e) => handleChange('sync_api_url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">URL Registre Públic de Contractes (Prorrogues i Modificacions)</label>
                                            <input 
                                                type="text" 
                                                className="input input-bordered w-full" 
                                                value={configs.prorrogues_api_url}
                                                onChange={(e) => handleChange('prorrogues_api_url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">URL Nomenclatura CPVs (Open Data)</label>
                                            <input 
                                                type="text" 
                                                className="input input-bordered w-full" 
                                                value={configs.cpv_api_url}
                                                onChange={(e) => handleChange('cpv_api_url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Ollama */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-2 mb-6 text-slate-800 font-semibold border-b border-slate-100 pb-4 justify-between">
                                        <div className="flex items-center gap-2">
                                            <Cpu size={20} className="text-primary-500" />
                                            <h2>Intel·ligència Artificial (Ollama)</h2>
                                        </div>
                                        <label className="flex items-center cursor-pointer">
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only" 
                                                    checked={configs.ia_enabled === 'true'}
                                                    onChange={(e) => handleChange('ia_enabled', e.target.checked ? 'true' : 'false')}
                                                />
                                                <div className={`block w-10 h-6 rounded-full transition-colors ${configs.ia_enabled === 'true' ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${configs.ia_enabled === 'true' ? 'transform translate-x-4' : ''}`}></div>
                                            </div>
                                            <span className="ml-3 text-sm font-medium text-slate-700">Mòduls IA Actius</span>
                                        </label>
                                    </div>
                                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${configs.ia_enabled !== 'true' ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">URL de l'API Ollama</label>
                                            <input 
                                                type="text" 
                                                className="input input-bordered w-full" 
                                                value={configs.ollama_url}
                                                onChange={(e) => handleChange('ollama_url', e.target.value)}
                                                placeholder="http://localhost:11434"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Model per Classificació CPV</label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        className="select select-bordered w-full"
                                                        value={availableModels.includes(configs.ollama_model_cpv) ? configs.ollama_model_cpv : 'manual'}
                                                        onChange={(e) => handleChange('ollama_model_cpv', e.target.value)}
                                                    >
                                                        {!availableModels.includes(configs.ollama_model_cpv) && configs.ollama_model_cpv && (
                                                            <option value={configs.ollama_model_cpv}>{configs.ollama_model_cpv} (actual)</option>
                                                        )}
                                                        {availableModels.map(m => (
                                                            <option key={`cpv-${m}`} value={m}>{m}</option>
                                                        ))}
                                                        <option value="manual">+ Escriure manualment...</option>
                                                    </select>
                                                    <button 
                                                        type="button"
                                                        onClick={() => fetchModels()}
                                                        className="btn btn-square btn-ghost"
                                                        disabled={loadingModels}
                                                    >
                                                        <RefreshCw size={18} className={loadingModels ? 'animate-spin' : ''} />
                                                    </button>
                                                </div>
                                                {configs.ollama_model_cpv === 'manual' && (
                                                    <input 
                                                        type="text" 
                                                        className="input input-bordered w-full mt-2" 
                                                        placeholder="Nom del model (ex: mistral)"
                                                        onBlur={(e) => {
                                                            if (e.target.value) handleChange('ollama_model_cpv', e.target.value);
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Model per Anàlisi i Auditoria</label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        className="select select-bordered w-full"
                                                        value={availableModels.includes(configs.ollama_model_auditoria) ? configs.ollama_model_auditoria : 'manual'}
                                                        onChange={(e) => handleChange('ollama_model_auditoria', e.target.value)}
                                                    >
                                                        {!availableModels.includes(configs.ollama_model_auditoria) && configs.ollama_model_auditoria && (
                                                            <option value={configs.ollama_model_auditoria}>{configs.ollama_model_auditoria} (actual)</option>
                                                        )}
                                                        {availableModels.map(m => (
                                                            <option key={`auditoria-${m}`} value={m}>{m}</option>
                                                        ))}
                                                        <option value="manual">+ Escriure manualment...</option>
                                                    </select>
                                                    <button 
                                                        type="button"
                                                        onClick={() => fetchModels()}
                                                        className="btn btn-square btn-ghost"
                                                        disabled={loadingModels}
                                                    >
                                                        <RefreshCw size={18} className={loadingModels ? 'animate-spin' : ''} />
                                                    </button>
                                                </div>
                                                {configs.ollama_model_auditoria === 'manual' && (
                                                    <input 
                                                        type="text" 
                                                        className="input input-bordered w-full mt-2" 
                                                        placeholder="Nom del model (ex: llama3)"
                                                        onBlur={(e) => {
                                                            if (e.target.value) handleChange('ollama_model_auditoria', e.target.value);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Nivell de raonament (think)</label>
                                            <select 
                                                className="select select-bordered w-full"
                                                value={configs.ollama_think}
                                                onChange={(e) => handleChange('ollama_think', e.target.value)}
                                            >
                                                <option value="smart">Smart (Automàtic segons model)</option>
                                                <option value="none">Cap (Ometre paràmetre)</option>
                                                <option value="false">Desactivat (think: false)</option>
                                                <option value="low">Baix (think: low)</option>
                                                <option value="medium">Mitjà (think: medium)</option>
                                                <option value="high">Alt (think: high)</option>
                                            </select>
                                            <p className="text-xs text-slate-400">Controla la fase de "raonament" en models compatibles (Ollama R1, GPT-OSS, etc).</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex flex-col items-end gap-3 mt-6">
                                    {message && (
                                        <div className={`text-sm px-4 py-2 rounded-lg ${
                                            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                        }`}>
                                            {message.text}
                                        </div>
                                    )}
                                    <button 
                                        onClick={handleSave} 
                                        className="btn btn-primary px-12 gap-2" 
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        Guardar Configuració
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'sync' && (
                    <div className="animate-in slide-in-from-left-4 duration-300">
                        <Sincronizacion />
                    </div>
                )}

                {activeTab === 'personnel' && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <div className="flex p-1 bg-slate-100 rounded-xl w-fit mb-6">
                            {isAdmin && (
                                <button 
                                    className={`px-8 py-2 rounded-lg text-sm font-medium transition-all ${
                                        personnelTab === 'employees' 
                                        ? 'bg-white text-primary-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                    onClick={() => setPersonnelTab('employees')}
                                >
                                    Empleats
                                </button>
                            )}
                            {(isAdmin || isResponsable) && (
                                <button 
                                    className={`px-8 py-2 rounded-lg text-sm font-medium transition-all ${
                                        personnelTab === 'departments' 
                                        ? 'bg-white text-primary-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                    onClick={() => setPersonnelTab('departments')}
                                >
                                    Departaments
                                </button>
                            )}
                        </div>
                        
                        {personnelTab === 'employees' ? <Empleados /> : <Departamentos />}
                    </div>
                )}
            </div>
        </div>
    );
}
