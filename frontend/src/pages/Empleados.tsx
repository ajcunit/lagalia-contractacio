import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Empleado, Departamento } from '../api/client';
import { 
    Users, 
    Plus, 
    Edit2, 
    Trash2, 
    Shield, 
    User, 
    Globe, 
    Save, 
    Loader2, 
    Check
} from 'lucide-react';
import { useSortableData, SortableTh } from '../components/SortableTable';

export default function Empleados() {
    const navigate = useNavigate();
    const [empleadosRaw, setEmpleadosRaw] = useState<Empleado[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [loading, setLoading] = useState(true);
    const { sortedItems: empleados, sortConfig, requestSort } = useSortableData(empleadosRaw);
    const [activeTab, setActiveTab] = useState<'users' | 'ldap'>('users');
    const [ldapConfig, setLdapConfig] = useState({
        server: '',
        port: '389',
        base_dn: '',
        user_domain: '',
        enabled: false
    });
    const [groupMappings, setGroupMappings] = useState<{ad_group: string, role: string, dept_id: number}[]>([]);
    const [ldapLoading, setLdapLoading] = useState(false);
    const [ldapSuccess, setLdapSuccess] = useState(false);

    useEffect(() => {
        loadData();
        loadLdapConfig();
    }, []);

    const loadLdapConfig = async () => {
        try {
            const [server, port, base_dn, domain, enabled, mappings] = await Promise.all([
                api.getConfig('ldap_server'),
                api.getConfig('ldap_port'),
                api.getConfig('ldap_base_dn'),
                api.getConfig('ldap_user_domain'),
                api.getConfig('ldap_enabled'),
                api.getConfig('ldap_group_mappings'),
            ]);
            setLdapConfig({
                server: server.valor,
                port: port.valor || '389',
                base_dn: base_dn.valor,
                user_domain: domain.valor,
                enabled: enabled.valor === 'true'
            });
            if (mappings.valor) {
                try {
                    setGroupMappings(JSON.parse(mappings.valor));
                } catch (e) {
                    console.error('Error parsing LDAP group mappings:', e);
                    setGroupMappings([]);
                }
            } else {
                setGroupMappings([]);
            }
        } catch (err) {
            console.error('Error loading LDAP config:', err);
        }
    };

    const handleSaveLdap = async () => {
        try {
            setLdapLoading(true);
            setLdapSuccess(false);
            await Promise.all([
                api.updateConfig('ldap_server', ldapConfig.server),
                api.updateConfig('ldap_port', ldapConfig.port),
                api.updateConfig('ldap_base_dn', ldapConfig.base_dn),
                api.updateConfig('ldap_user_domain', ldapConfig.user_domain),
                api.updateConfig('ldap_enabled', ldapConfig.enabled ? 'true' : 'false'),
                api.updateConfig('ldap_group_mappings', JSON.stringify(groupMappings)),
            ]);
            setLdapSuccess(true);
            setTimeout(() => setLdapSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving LDAP config:', err);
            alert('Error al guardar la configuració');
        } finally {
            setLdapLoading(false);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [emps, depts] = await Promise.all([
                api.getEmpleados(),
                api.getDepartamentos(),
            ]);
            setEmpleadosRaw(emps);
            setDepartamentos(depts);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetail = (emp?: Empleado) => {
        if (emp) {
            navigate(`/empleados/${emp.id}`);
        } else {
            navigate('/empleados/nuevo');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Estàs segur de desactivar aquest empleat?')) return;
        try {
            await api.deleteEmpleado(id);
            loadData();
        } catch (err) {
            console.error('Error deleting empleado:', err);
        }
    };

    const getRolBadge = (rol: string) => {
        switch (rol) {
            case 'admin':
                return (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1 w-fit">
                        <Shield size={10} />
                        Admin
                    </span>
                );
            case 'responsable':
                return (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1 w-fit">
                        <User size={10} />
                        Responsable
                    </span>
                );
            default:
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 w-fit">Empleat</span>;
        }
    };

    const getDepartamentoNombre = (deptId?: number) => {
        if (!deptId) return 'Sense assignar';
        const dept = departamentos.find((d) => d.id === deptId);
        return dept?.nombre || 'Desconegut';
    };

    return (
        <div className="space-y-6 w-full h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Empleats</h1>
                    <p className="text-slate-500">Gestió d'empleats i assignacions</p>
                </div>
                {activeTab === 'users' && (
                    <button className="btn btn-primary gap-2" onClick={() => handleOpenDetail()}>
                        <Plus size={18} />
                        Nou Empleat
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                        activeTab === 'users' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => setActiveTab('users')}
                >
                    Llista d'Usuaris
                    {activeTab === 'users' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                    )}
                </button>
                <button
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                        activeTab === 'ldap' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => setActiveTab('ldap')}
                >
                    Directori Actiu (AD/LDAP)
                    {activeTab === 'ldap' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                    )}
                </button>
            </div>

            {activeTab === 'users' ? (
                <div className="animate-in fade-in duration-500 overflow-auto flex-1 pr-1">
                    <div className="glass-card overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="animate-spin text-primary-600" size={40} />
                            </div>
                        ) : empleados.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <Users className="text-slate-400" size={32} />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800">Cap empleat</h3>
                                <p className="text-slate-500 mt-2">Comença afegint el primer empleat</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <SortableTh label="Nom" sortKey="nombre" sortConfig={sortConfig} onSort={requestSort} />
                                            <SortableTh label="Email" sortKey="email" sortConfig={sortConfig} onSort={requestSort} />
                                            <SortableTh label="Departament" sortKey="departamento_id" sortConfig={sortConfig} onSort={requestSort} />
                                            <SortableTh label="Rol" sortKey="rol" sortConfig={sortConfig} onSort={requestSort} />
                                            <SortableTh label="Estat" sortKey="activo" sortConfig={sortConfig} onSort={requestSort} />
                                            <th>Accions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {empleados.map((emp) => (
                                            <tr 
                                                key={emp.id} 
                                                className="cursor-pointer hover:bg-slate-50/50 transition-colors group"
                                                onClick={() => handleOpenDetail(emp)}
                                            >
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium shadow-sm group-hover:scale-110 transition-transform">
                                                            {emp.nombre.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-slate-800">{emp.nombre}</span>
                                                    </div>
                                                </td>
                                                <td className="text-slate-600">{emp.email}</td>
                                                <td className="text-slate-700">{getDepartamentoNombre(emp.departamento_id)}</td>
                                                <td>{getRolBadge(emp.rol)}</td>
                                                <td>
                                                    {emp.activo ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Actiu</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Inactiu</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary-600 transition-colors shadow-sm bg-slate-50"
                                                            onClick={() => handleOpenDetail(emp)}
                                                            title="Veure fitxa"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 transition-colors shadow-sm bg-slate-50"
                                                            onClick={() => handleDelete(emp.id)}
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
                        )}
                    </div>
                </div>
            ) : (
                <div className="glass-card p-8 animate-in fade-in duration-500 overflow-auto flex-1">
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                                <Globe size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Configuració de Directori Actiu</h2>
                                <p className="text-slate-500">Permet que els usuaris s'identifiquin amb les seves credencials corporatives.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Servidor LDAP / Host</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="ldap://10.0.0.1"
                                        value={ldapConfig.server}
                                        onChange={(e) => setLdapConfig({ ...ldapConfig, server: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Port</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="389"
                                        value={ldapConfig.port}
                                        onChange={(e) => setLdapConfig({ ...ldapConfig, port: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Base DN (Search Base)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="dc=empresa,dc=local"
                                    value={ldapConfig.base_dn}
                                    onChange={(e) => setLdapConfig({ ...ldapConfig, base_dn: e.target.value })}
                                />
                                <p className="text-xs text-slate-400 mt-1">Lloc on començar a cercar els usuaris.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Domini d'Usuari (Suffix)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="@empresa.local"
                                    value={ldapConfig.user_domain}
                                    onChange={(e) => setLdapConfig({ ...ldapConfig, user_domain: e.target.value })}
                                />
                                <p className="text-xs text-slate-400 mt-1">S'afegirà automàticament al nom d'usuari si no l'escriuen.</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                        checked={ldapConfig.enabled}
                                        onChange={(e) => setLdapConfig({ ...ldapConfig, enabled: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Activar Autenticació LDAP / Directori Actiu</span>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-slate-100 mt-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                                        <Shield size={20} className="text-primary-500" />
                                        <h2>Mapeig de Grups AD ( memberOf )</h2>
                                    </div>
                                    <button 
                                        onClick={() => setGroupMappings([...groupMappings, { ad_group: '', role: 'empleado', dept_id: 0 }])}
                                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Plus size={14} /> Afegir Regla
                                    </button>
                                </div>
                                <p className="text-sm text-slate-500 mb-6">
                                    Assigna automàticament rols i departaments segons els grups de l'Active Directory.
                                </p>
                                
                                <div className="space-y-3">
                                    {groupMappings.length === 0 ? (
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-sm text-slate-400 italic">
                                            No hi ha cap mapeig definit. Els usuaris s'assignaran com a 'Empleado' per defecte.
                                        </div>
                                    ) : (
                                        groupMappings.map((mapping, idx) => (
                                            <div key={idx} className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">DN del Grup AD</label>
                                                    <input 
                                                        type="text" 
                                                        className="input input-sm w-full bg-white" 
                                                        placeholder="CN=Administradors,OU=Grups..."
                                                        value={mapping.ad_group}
                                                        onChange={(e) => {
                                                            const newMappings = [...groupMappings];
                                                            newMappings[idx].ad_group = e.target.value;
                                                            setGroupMappings(newMappings);
                                                        }}
                                                    />
                                                </div>
                                                <div className="w-32 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Rol</label>
                                                    <select 
                                                        className="input input-sm w-full bg-white shadow-sm"
                                                        value={mapping.role}
                                                        onChange={(e) => {
                                                            const newMappings = [...groupMappings];
                                                            newMappings[idx].role = e.target.value;
                                                            setGroupMappings(newMappings);
                                                        }}
                                                    >
                                                        <option value="empleado">Empleado</option>
                                                        <option value="responsable">Responsable</option>
                                                        <option value="responsable_contratacion">Responsable de Contractació</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </div>
                                                <div className="w-48 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Departament</label>
                                                    <select 
                                                        className="input input-sm w-full bg-white shadow-sm"
                                                        value={mapping.dept_id || 0}
                                                        onChange={(e) => {
                                                            const newMappings = [...groupMappings];
                                                            newMappings[idx].dept_id = parseInt(e.target.value);
                                                            setGroupMappings(newMappings);
                                                        }}
                                                    >
                                                        <option value={0}>Sense assignar</option>
                                                        {departamentos.map(d => (
                                                            <option key={d.id} value={d.id}>{d.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button 
                                                    onClick={() => setGroupMappings(groupMappings.filter((_, i) => i !== idx))}
                                                    className="btn btn-ghost btn-sm btn-square text-slate-400 hover:text-red-500 mt-5"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 flex items-center justify-end gap-4">
                                {ldapSuccess && (
                                    <span className="text-green-600 text-sm font-medium flex items-center gap-2">
                                        <Check size={16} />
                                        Configuració guardada!
                                    </span>
                                )}
                                <button
                                    className="btn btn-primary gap-2 min-w-[140px]"
                                    onClick={handleSaveLdap}
                                    disabled={ldapLoading}
                                >
                                    {ldapLoading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    Guardar Configuració AD
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
