import { useState, useEffect } from 'react';
import { api, CarpetaFavorita, ContratoFavorito } from '../api/client';
import { Star, Folder, Trash2, Calendar, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Favoritos() {
    const navigate = useNavigate();
    const [carpetas, setCarpetas] = useState<CarpetaFavorita[]>([]);
    const [selectedCarpetaId, setSelectedCarpetaId] = useState<number | null>(null);
    const [contratos, setContratos] = useState<ContratoFavorito[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCarpetas();
    }, []);

    useEffect(() => {
        if (selectedCarpetaId) {
            loadContratos(selectedCarpetaId);
        } else {
            setContratos([]);
        }
    }, [selectedCarpetaId]);

    const loadCarpetas = async () => {
        try {
            const data = await api.getCarpetasFavoritas();
            setCarpetas(data);
            if (data.length > 0 && !selectedCarpetaId) {
                setSelectedCarpetaId(data[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadContratos = async (id: number) => {
        setLoading(true);
        try {
            const data = await api.getFavoritosPorCarpeta(id);
            setContratos(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCarpeta = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Vols eliminar aquesta carpeta i treure'n tots els favorits?")) return;
        try {
            await api.deleteCarpeta(id);
            if (selectedCarpetaId === id) setSelectedCarpetaId(null);
            loadCarpetas();
        } catch (e) {
            alert("Error a l'eliminar carpeta");
        }
    };

    const handleRemoveFavorito = async (contratoId: number) => {
        if (!selectedCarpetaId) return;
        try {
            await api.deleteFavorito(selectedCarpetaId, contratoId);
            loadContratos(selectedCarpetaId);
        } catch (e) {
            console.error("Error al treure favorit: ", e);
        }
    };

    const formatCurrency = (amount: any) => {
        if (amount === undefined || amount === null) return '---';
        return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(Number(amount));
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '---';
        return new Date(dateStr).toLocaleDateString('ca-ES');
    };

    return (
        <div className="w-full flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
            {/* Sidebar Carpetas */}
            <div className="w-full md:w-64 flex flex-col gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                    <Star className="text-yellow-500" />
                    <h2 className="text-lg font-bold text-slate-800">Les teves carpetes</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {loading && carpetas.length === 0 ? (
                        <p className="text-sm text-slate-500">Carregant...</p>
                    ) : carpetas.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No hi ha carpetes. Crea'n una des del SuperBuscador.</p>
                    ) : (
                        carpetas.map(carpeta => (
                            <div 
                                key={carpeta.id}
                                onClick={() => setSelectedCarpetaId(carpeta.id)}
                                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedCarpetaId === carpeta.id ? 'bg-primary-50 border border-primary-100 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Folder className={selectedCarpetaId === carpeta.id ? 'text-primary-500' : 'text-slate-400'} size={20} />
                                    <span className={`text-sm truncate font-medium ${selectedCarpetaId === carpeta.id ? 'text-primary-800' : 'text-slate-600'}`}>
                                        {carpeta.nombre}
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteCarpeta(carpeta.id, e)}
                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Eliminar carpeta"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {selectedCarpetaId ? (
                    <div className="glass-card flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-white/50">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Library className="text-primary-500" />
                                Contractes a la carpeta
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">{contratos.length} elements guardats</p>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-0">
                            {loading && contratos.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">Cercant contractes...</div>
                            ) : contratos.length === 0 ? (
                                <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                                    <Folder size={48} className="mb-4 opacity-50" />
                                    <p>Aquesta carpeta està buida</p>
                                    <p className="text-sm mt-2 max-w-sm">Pots afegir-hi expedients des del SuperBuscador fent clic al panell corresponent.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 z-10 text-slate-500 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold w-12"></th>
                                            <th className="px-6 py-4 font-semibold">Expedient Guardat</th>
                                            <th className="px-6 py-4 font-semibold">Objecte Guardat</th>
                                            <th className="px-6 py-4 font-semibold w-24">Accions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {contratos.map(fav => {
                                            const c: any = fav.contrato;
                                            if (!c) return null;
                                            return (
                                                <tr key={fav.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => navigate(`/superbuscador/${encodeURIComponent(c.codi_expedient)}`)}>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        <Star size={18} className="text-yellow-500 mx-auto" />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-primary-600 truncate max-w-[200px]" title={c.organisme_adjudicador}>
                                                                {c.organisme_adjudicador || 'Generalitat'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{c.codi_expedient}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                                                            {c.objecte_contracte || '-'}
                                                        </p>
                                                        <div className="flex gap-2 mt-1 items-center">
                                                            <span className="text-[10px] bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded font-bold">{formatCurrency(c.import_adjudicacio_amb_iva || c.preu_licitar)}</span>
                                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c.estat_actual || '-'}</span>
                                                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10}/> {formatDate(fav.fecha_agregado)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button 
                                                                className="p-2 text-red-300 hover:text-red-500 transition-colors bg-white rounded-md shadow-sm opacity-0 group-hover:opacity-100"
                                                                title="Treure element de la carpeta"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveFavorito(fav.contrato_id);
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-full border-2 border-dashed border-slate-200 rounded-2xl">
                        <Star size={48} className="mb-4 text-slate-300" />
                        <p className="font-medium text-lg">Selecciona una carpeta</p>
                        <p className="text-sm mt-1">Podràs veure els teus contractes favorits</p>
                    </div>
                )}
            </div>
        </div>
    );
}
