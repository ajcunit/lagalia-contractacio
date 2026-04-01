import { Heart, Code, Server } from 'lucide-react';

export default function Credits() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-auto flex-1 pr-1">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">
                    Crèdits
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Aquesta plataforma ha estat desenvolupada internament amb amor per l'Ajuntament de Cunit, per a facilitar la gestió i transparència de la contractació pública.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {/* Equip o Desenvolupadors */}
                <div className="glass-card p-6 border-t-4 border-t-primary-500 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 mb-4">
                        <Code size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Desenvolupament i Arquitectura</h3>
                    <p className="text-slate-600 mb-4">
                        Dissenyat i programat des de zero per a respondre a les necessitats específiques de gestió de contractes.
                    </p>
                    <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Ajuntament de Cunit</li>
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Departament d'Informàtica / Contractació</li>
                    </ul>
                </div>

                {/* Tecnologies */}
                <div className="glass-card p-6 border-t-4 border-t-blue-500 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                        <Server size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Tecnologies Utilitzades</h3>
                    <p className="text-slate-600 mb-4">
                        S'han utilitzat les últimes tecnologies de codi obert per garantir un rendiment òptim i segur.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <span className="badge bg-blue-100 text-blue-700 border-none">React</span>
                        <span className="badge bg-yellow-100 text-yellow-700 border-none">Python</span>
                        <span className="badge bg-green-100 text-green-700 border-none">FastAPI</span>
                        <span className="badge bg-purple-100 text-purple-700 border-none">TailwindCSS</span>
                        <span className="badge bg-slate-200 text-slate-700 border-none">SQLite</span>
                        <span className="badge bg-indigo-100 text-indigo-700 border-none">Ollama (IA)</span>
                    </div>
                </div>

                <div className="md:col-span-2 glass-card p-8 bg-gradient-to-br from-slate-50 to-white text-center rounded-2xl border border-slate-200">
                    <Heart className="mx-auto text-red-500 mb-4 animate-pulse" size={32} />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Fet amb Passió</h3>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Agraïments especials a totes les persones que han contribuït a fer possible aquesta eina, amb l'objectiu de modernitzar i agilitzar els tràmits de l'administració pública.
                    </p>
                </div>
            </div>
        </div>
    );
}
