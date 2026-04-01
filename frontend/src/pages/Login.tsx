import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = await api.login(email, password);
            localStorage.setItem('token', data.access_token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Error en autenticar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex text-slate-800 bg-slate-50 font-sans">
            {/* Left side pattern / Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col py-16 px-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
                </div>
                <div className="relative z-10 flex flex-col h-full items-start justify-center">
                    <h1 className="text-8xl font-black text-white mb-6 leading-tight tracking-tighter">Licit<span className="text-primary-500">IA</span></h1>
                    <p className="text-xl text-slate-400 max-w-sm font-light">L'assistent intel·ligent per a la gestió, anàlisi i control de processos de contractació pública.</p>
                </div>
            </div>

            {/* Right side login box */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="text-center mb-10">
                        <div className="lg:hidden flex justify-center mb-6">
                            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">Licit<span className="text-primary-600">IA</span></h1>
                        </div>
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 mb-2 font-display">Bentornat a LicitIA</h2>
                        <p className="text-slate-500">Sincronitza i gestiona els teus contractes amb l'ajuda de la IA.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-start gap-3 text-sm animate-in shake">
                                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Correu Electrònic</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="email" 
                                    disabled={loading}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="input input-bordered w-full !pl-12 h-12 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="admin@admin.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Contrasenya</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="password"
                                    disabled={loading}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)} 
                                    className="input input-bordered w-full !pl-12 h-12 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="btn btn-primary w-full h-12 text-base shadow-primary-500/30 shadow-lg mt-8"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Iniciar Sessió'}
                        </button>
                    </form>
                    
                    <p className="text-center text-sm text-slate-400 mt-8 font-medium">
                        Plataforma Privada. Accés exclusivament per a personal autoritzat.
                    </p>
                </div>
            </div>
        </div>
    );
}
