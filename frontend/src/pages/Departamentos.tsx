import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Departamento } from '../api/client';
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';

export default function Departamentos() {
    const navigate = useNavigate();
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [loading, setLoading] = useState(true);

    const loadDepartamentos = async () => {
        try {
            setLoading(true);
            const data = await api.getDepartamentos();
            setDepartamentos(data);
        } catch (err) {
            console.error('Error loading departamentos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDepartamentos();
    }, []);

    const handleOpenDetail = (dept?: Departamento) => {
        if (dept) {
            navigate(`/departamentos/${dept.id}`);
        } else {
            navigate('/departamentos/nou');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Estàs segur de desactivar aquest departament?')) return;
        try {
            await api.deleteDepartamento(id);
            loadDepartamentos();
        } catch (err) {
            console.error('Error deleting departamento:', err);
        }
    };

    return (
        <div className="space-y-6 flex-1 overflow-auto pr-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Departaments</h1>
                    <p className="text-slate-500">Gestió de departaments de l'organització</p>
                </div>
                <button className="btn btn-primary gap-2" onClick={() => handleOpenDetail()}>
                    <Plus size={18} />
                    Nou Departament
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="loading-spinner w-10 h-10"></div>
                </div>
            ) : departamentos.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Building2 className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">Cap departament</h3>
                    <p className="text-slate-500 mt-2">Comença afegint el primer departament</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Departament i Codi</th>
                                    <th>Descripció</th>
                                    <th>Estat</th>
                                    <th>Accions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departamentos.map((dept) => (
                                    <tr 
                                        key={dept.id} 
                                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                        onClick={() => handleOpenDetail(dept)}
                                    >
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium shadow-sm group-hover:scale-110 transition-transform">
                                                    <Building2 size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800">{dept.nombre}</div>
                                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{dept.codigo}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-slate-600">
                                            {dept.descripcion ? (
                                                <span className="line-clamp-2 text-sm" title={dept.descripcion}>{dept.descripcion}</span>
                                            ) : (
                                                <span className="text-slate-400 italic text-sm">-</span>
                                            )}
                                        </td>
                                        <td>
                                            {dept.activo ? (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Actiu</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Inactiu</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary-600 transition-colors shadow-sm bg-slate-50"
                                                    onClick={() => handleOpenDetail(dept)}
                                                    title="Editar Departament"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 transition-colors shadow-sm bg-slate-50"
                                                    onClick={() => handleDelete(dept.id)}
                                                    title="Desactivar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
