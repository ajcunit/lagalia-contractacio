import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import PasswordStrength from '../components/PasswordStrength';
import {
    Shield, User, Building2, ChevronRight, Check, AlertCircle, Loader2
} from 'lucide-react';

export default function SetupWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirm: '',
        organization_name: '',
        ine10_code: '',
    });

    const update = (field: string, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const validateStep1 = () => {
        if (!form.admin_name.trim()) return 'El nom és obligatori';
        if (!form.admin_email.trim()) return 'El correu és obligatori';
        if (!form.admin_email.includes('@')) return 'Correu invàlid';
        if (form.admin_password.length < 8) return 'La contrasenya ha de tenir mínim 8 caràcters';
        if (!/[A-Z]/.test(form.admin_password)) return 'Cal almenys una majúscula';
        if (!/[a-z]/.test(form.admin_password)) return 'Cal almenys una minúscula';
        if (!/[0-9]/.test(form.admin_password)) return 'Cal almenys un número';
        if (form.admin_password !== form.admin_password_confirm) return 'Les contrasenyes no coincideixen';
        return null;
    };

    const goToStep2 = () => {
        const err = validateStep1();
        if (err) { setError(err); return; }
        setError(null);
        setStep(2);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            await api.initializeSetup(form);
            setStep(3);
        } catch (err: any) {
            setError(err.message || 'Error en la configuració');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl shadow-blue-100/50 dark:shadow-none p-10 sm:p-12 w-full max-w-xl border border-slate-100 dark:border-slate-700">
                {/* Progress dots */}
                {step < 3 && (
                    <div className="flex justify-center gap-2 mb-10">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    i === step ? 'w-8 bg-blue-500' :
                                    i < step ? 'w-2 bg-blue-300' : 'w-2 bg-slate-200 dark:bg-slate-600'
                                }`}
                            />
                        ))}
                    </div>
                )}

                {/* Step 0: Welcome */}
                {step === 0 && (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                            <Shield className="text-white" size={40} />
                        </div>
                        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                            Benvingut a LAGAL<span className="text-blue-600">ia</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-lg">
                            Sistema de gestió intel·ligent de contractació pública. 
                            Configurem el teu entorn en 2 minuts.
                        </p>
                        <button
                            onClick={() => setStep(1)}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-200 dark:shadow-blue-900/30 hover:bg-blue-700 transition-all active:scale-[0.98]"
                        >
                            Començar <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* Step 1: Admin */}
                {step === 1 && (
                    <div className="space-y-5 max-w-md mx-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                <User size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                    Crea l'Administrador
                                </h2>
                                <p className="text-sm text-slate-500">Pas 1 de 2</p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-2 text-sm">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <input
                            placeholder="Nom complet"
                            value={form.admin_name}
                            onChange={e => update('admin_name', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                        <input
                            type="email"
                            placeholder="Correu electrònic"
                            value={form.admin_email}
                            onChange={e => update('admin_email', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                        <div>
                            <input
                                type="password"
                                placeholder="Contrasenya (mínim 8 caràcters, 1 majúscula, 1 número)"
                                value={form.admin_password}
                                onChange={e => update('admin_password', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                            <PasswordStrength password={form.admin_password} />
                        </div>
                        <input
                            type="password"
                            placeholder="Repeteix la contrasenya"
                            value={form.admin_password_confirm}
                            onChange={e => update('admin_password_confirm', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                        <button
                            onClick={goToStep2}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Continuar <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {/* Step 2: Organization */}
                {step === 2 && (
                    <div className="space-y-5 max-w-md mx-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                                <Building2 size={20} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                    La teva Organització
                                </h2>
                                <p className="text-sm text-slate-500">Pas 2 de 2 (opcional)</p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-2 text-sm">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <input
                            placeholder="Nom de l'organització"
                            value={form.organization_name}
                            onChange={e => update('organization_name', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                        <input
                            placeholder="Codi INE10 (opcional)"
                            value={form.ine10_code}
                            onChange={e => update('ine10_code', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                        <p className="text-xs text-slate-400">
                            Pots canviar-ho tot més tard des de la pàgina de Configuració.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                            >
                                Enrere
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    'Finalitzar'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <Check size={40} className="text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
                            Tot llest! 🎉
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            LAGALia Contractació s'ha configurat correctament. Ja pots iniciar sessió.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 dark:shadow-blue-900/30 hover:bg-blue-700 transition-all active:scale-[0.98]"
                        >
                            Anar al Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
