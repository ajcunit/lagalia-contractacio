import React, { useState } from 'react';
import { Star, FolderPlus, Loader2, X } from 'lucide-react';
import { api, CarpetaFavorita } from '../api/client';

export default function FavoriteButton({ codi_expedient }: { codi_expedient: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [carpetas, setCarpetas] = useState<CarpetaFavorita[]>([]);
    const [loading, setLoading] = useState(false);
    const [guardant, setGuardant] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // nova carpeta
    const [novaCarpetaNom, setNovaCarpetaNom] = useState('');
    const [showNou, setShowNou] = useState(false);

    const loadCarpetas = async () => {
        setLoading(true);
        try {
            const data = await api.getCarpetasFavoritas();
            setCarpetas(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
        setSuccessMessage(null);
        loadCarpetas();
    };

    const handleClose = (e?: React.MouseEvent) => {
        if(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsOpen(false);
    };

    const saveToFolder = async (carpetaId: number, carpetaNombre: string) => {
        setGuardant(true);
        try {
            await api.addFavoritoByExpediente(carpetaId, codi_expedient);
            setSuccessMessage(`Guardat correctament a ${carpetaNombre}`);
            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (e: any) {
            alert(e.message || "Error al guardar (pot ser que ja el tinguis en aquesta carpeta)");
            handleClose();
        } finally {
            setGuardant(false);
            setShowNou(false);
        }
    };

    const crearNovaCarpeta = async () => {
        if (!novaCarpetaNom.trim()) return;
        setGuardant(true);
        try {
            const nova = await api.createCarpetaFavorita({ nombre: novaCarpetaNom });
            await saveToFolder(nova.id, nova.nombre);
        } catch (e: any) {
            alert(e.message || "Error al crear carpeta");
            setGuardant(false);
        }
    };

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button 
                className="p-2 text-slate-400 hover:text-yellow-500 transition-colors"
                title="Guardar a Favorits"
                onClick={handleOpen}
            >
                <Star size={18} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={handleClose}></div>
                    <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h4 className="font-bold text-slate-700 text-sm">Guardar a Favorits</h4>
                            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>
                        
                        {successMessage ? (
                            <div className="p-6 text-center text-sm font-medium text-green-600 bg-green-50">
                                ⭐ {successMessage}
                            </div>
                        ) : (
                            <>
                                <div className="max-h-60 overflow-y-auto p-2">
                                    {loading ? (
                                        <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
                                    ) : carpetas.length === 0 && !showNou ? (
                                        <div className="p-4 text-center text-sm text-slate-500">Sense carpetes. Crea'n una de nova!</div>
                                    ) : (
                                        <div className="space-y-1">
                                            {carpetas.map(c => (
                                                <button 
                                                    key={c.id} 
                                                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors flex items-center justify-between group"
                                                    onClick={() => saveToFolder(c.id, c.nombre)}
                                                    disabled={guardant}
                                                >
                                                    <span className="truncate flex-1">{c.nombre}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 border-t border-slate-100 bg-slate-50">
                                    {showNou ? (
                                        <div className="space-y-2">
                                            <input 
                                                type="text" 
                                                className="input input-bordered input-sm w-full text-sm"
                                                placeholder="Nom de la carpeta..."
                                                value={novaCarpetaNom}
                                                onChange={e => setNovaCarpetaNom(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') crearNovaCarpeta();
                                                }}
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button className="btn btn-primary btn-sm flex-1 text-xs" onClick={crearNovaCarpeta} disabled={guardant || !novaCarpetaNom.trim()}>
                                                    {guardant ? <Loader2 className="animate-spin" size={14}/> : 'Crear i Guardar'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            className="w-full text-left text-sm text-primary-600 font-medium flex items-center gap-2 hover:text-primary-700 p-1"
                                            onClick={() => setShowNou(true)}
                                            disabled={guardant}
                                        >
                                            <FolderPlus size={16} /> Nova Carpeta
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
