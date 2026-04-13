import { useState, useEffect } from 'react';
import { api, DashboardStats } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    TrendingDown,
    FileText,
    DollarSign,
    Calendar,
    RefreshCw,
    Search,
    Users,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
} from 'recharts';

const COLORS = ['#0ea5e9', '#f97316', '#22c55e', '#8b5cf6', '#ec4899', '#eab308'];

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterYear, setFilterYear] = useState<number | ''>('');
    const [filterMin, setFilterMin] = useState<number | ''>('');
    const [filterMax, setFilterMax] = useState<number | ''>('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (filterYear) params.year = filterYear;
            if (filterMin !== '') params.importe_min = filterMin;
            if (filterMax !== '') params.importe_max = filterMax;
            
            const data = await api.getDashboardStats(params);
            setStats(data);
            setError(null);
        } catch (err) {
            setError('Error al cargar les estadístiques');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ca-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="loading-spinner w-12 h-12"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card p-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={loadStats} className="btn btn-primary">
                    Reintentar
                </button>
            </div>
        );
    }

    const totalContratosCount = stats ? Object.values(stats.contratos_por_estado).reduce((a, b) => a + b, 0) : 0;
    const estadoData = stats
        ? Object.entries(stats.contratos_por_estado)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({
                name: name.length > 22 ? name.substring(0, 20) + '...' : name,
                fullName: name,
                value,
                percent: totalContratosCount > 0 ? (value / totalContratosCount * 100).toFixed(0) : 0
            }))
        : [];

    const departamentoData = stats?.contratos_por_departamento
        ? [...stats.contratos_por_departamento]
            .sort((a, b) => b.contratos - a.contratos)
            .slice(0, 8)
            .map(d => ({
                name: d.departamento.length > 20 ? d.departamento.substring(0, 18) + '...' : d.departamento,
                fullName: d.departamento,
                contratos: d.contratos,
                volumen: d.volumen
            }))
        : [];

    const maxContractsObj = stats ? Math.max(...(stats.top_adjudicatarios.map(a => a.desglose?.length || 0)), 0) : 0;
    
    const adjudicatariosData = stats?.top_adjudicatarios.slice(0, 5).map(adj => {
        const item: any = { nombre: adj.nombre, total_volumen: adj.volumen, _originalName: adj.nombre };
        if (adj.desglose && adj.desglose.length > 0) {
            adj.desglose.forEach((d, i) => {
                item[`contracte_${i}_import`] = d.importe;
                item[`contracte_${i}_exp`] = d.codi_expedient;
                item[`contracte_${i}_obj`] = d.objecte;
            });
        } else {
            item['contracte_0_import'] = adj.volumen;
            item['contracte_0_exp'] = 'Varis';
            item['contracte_0_obj'] = 'Múltiples contractes agrupats (sense detall)';
        }
        return item;
    }) || [];

    const CustomAdjudicatarioTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 border rounded-xl shadow-xl text-sm max-w-sm z-50">
                    <p className="font-bold text-slate-800 mb-1">{data._originalName || label}</p>
                    <p className="font-semibold text-blue-600 mb-3 border-b pb-2">
                        Volum Total: {formatCurrency(data.total_volumen)}
                    </p>
                    <div className="max-h-60 overflow-y-auto pr-1">
                        {payload.filter((p: any) => p.value > 0).map((p: any, idx: number) => {
                            const indexStr = p.dataKey.split('_')[1];
                            const exp = data[`contracte_${indexStr}_exp`];
                            const obj = data[`contracte_${indexStr}_obj`];
                            return (
                                <div key={idx} className="mb-3 border-l-2 pl-2" style={{ borderColor: p.fill }}>
                                    <p className="text-xs font-bold text-slate-700">{exp}</p>
                                    <p className="text-xs text-slate-500 mb-1 line-clamp-2" title={obj}>{obj}</p>
                                    <p className="font-semibold text-slate-800">{formatCurrency(p.value)}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 flex-1 overflow-auto pr-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500">Visió general dels contractes públics</p>
                </div>
                <button onClick={loadStats} className="btn btn-secondary gap-2">
                    <RefreshCw size={18} />
                    Actualitzar
                </button>
            </div>

            {/* Filtres */}
            <div className="glass-card p-4 flex flex-wrap gap-4 items-end">
                <div className="form-control">
                    <label className="label text-sm font-semibold text-slate-700">Any</label>
                    <input 
                        type="number" 
                        className="input" 
                        placeholder="Ex: 2024" 
                        value={filterYear} 
                        onChange={e => setFilterYear(e.target.value ? parseInt(e.target.value) : '')} 
                        onKeyDown={e => e.key === 'Enter' && loadStats()}
                    />
                </div>
                <div className="form-control">
                    <label className="label text-sm font-semibold text-slate-700">Import Mínim (€)</label>
                    <input 
                        type="number" 
                        className="input" 
                        placeholder="0" 
                        value={filterMin} 
                        onChange={e => setFilterMin(e.target.value ? parseFloat(e.target.value) : '')} 
                        onKeyDown={e => e.key === 'Enter' && loadStats()}
                    />
                </div>
                <div className="form-control">
                    <label className="label text-sm font-semibold text-slate-700">Import Màxim (€)</label>
                    <input 
                        type="number" 
                        className="input" 
                        placeholder="Sense límit" 
                        value={filterMax} 
                        onChange={e => setFilterMax(e.target.value ? parseFloat(e.target.value) : '')} 
                        onKeyDown={e => e.key === 'Enter' && loadStats()}
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={loadStats} className="btn btn-primary gap-2">
                        <Search size={18} />
                        Aplicar
                    </button>
                    {(filterYear || filterMin !== '' || filterMax !== '') && (
                        <button 
                            onClick={() => {
                                setFilterYear('');
                                setFilterMin('');
                                setFilterMax('');
                                // Automatically load without filters next tick
                                setTimeout(loadStats, 0);
                            }} 
                            className="btn btn-ghost text-slate-500"
                        >
                            Netejar
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                {/* Total Contratos */}
                <Link to="/contratos" className="glass-card p-4 hover-lift block cursor-pointer transition-colors hover:border-slate-300">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileText className="text-blue-600" size={16} />
                        </div>
                        <span className="flex items-center gap-1 text-[10px] text-green-600">
                            <TrendingUp size={12} />
                            +{stats?.contratos_este_mes || 0}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 number-display truncate">
                        {stats?.total_contratos.toLocaleString() || 0}
                    </h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs mt-1 truncate">Total Contractes</p>
                </Link>


                {/* Próximos a Finalizar */}
                <Link to="/contratos?alerta_finalitzacio=true" className="glass-card p-4 hover-lift border-l-4 border-l-yellow-400 block cursor-pointer transition-colors hover:bg-yellow-50/30">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                            <Calendar className="text-yellow-600" size={16} />
                        </div>
                        {stats?.contratos_proximos_finalizar && stats.contratos_proximos_finalizar > 0 && (
                            <span className="badge bg-yellow-100 text-yellow-800 text-[10px] px-1 py-0">Alerta</span>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 number-display truncate">
                        {stats?.contratos_proximos_finalizar || 0}
                    </h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs mt-1 truncate">Fi propera</p>
                </Link>

                {/* Posiblemente Finalizados */}
                <Link to="/contratos?possiblement_finalitzat=true" className="glass-card p-4 hover-lift border-l-4 border-l-red-400 block cursor-pointer transition-colors hover:bg-red-50/30">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                            <TrendingDown className="text-red-600" size={16} />
                        </div>
                        {stats?.contratos_posiblemente_finalizados && stats.contratos_posiblemente_finalizados > 0 && (
                            <span className="badge badge-error text-[10px] px-1 py-0">Revisar</span>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 number-display truncate">
                        {stats?.contratos_posiblemente_finalizados || 0}
                    </h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs mt-1 truncate">Finalitzats?</p>
                </Link>

                {/* Total Importe */}
                <div className="glass-card p-4 hover-lift">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <DollarSign className="text-green-600" size={16} />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 number-display truncate" title={formatCurrency(stats?.total_importe || 0)}>
                        {stats?.total_importe ? new Intl.NumberFormat('ca-ES', { notation: "compact", maximumFractionDigits: 1 }).format(stats?.total_importe) + ' €' : '0 €'}
                    </h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs mt-1 truncate">Volum Total</p>
                </div>


                {/* Total Contratos Menores */}
                <Link to="/contratos-menores" className="glass-card p-4 hover-lift block cursor-pointer transition-colors hover:bg-blue-50/30 border-l-4 border-l-cyan-400">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                            <FileText className="text-cyan-600" size={16} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 number-display truncate">
                        {stats?.total_contratos_menores?.toLocaleString() || 0}
                    </h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs mt-1 truncate">Menors</p>
                </Link>

                {/* Total Importe Menores */}
                <div className="glass-card p-4 hover-lift border-l-4 border-l-emerald-400">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <DollarSign className="text-emerald-600" size={16} />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 number-display truncate" title={formatCurrency(stats?.total_importe_menores || 0)}>
                        {stats?.total_importe_menores ? new Intl.NumberFormat('ca-ES', { notation: "compact", maximumFractionDigits: 1 }).format(stats?.total_importe_menores) + ' €' : '0 €'}
                    </h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs mt-1 truncate">Volum Menors</p>
                </div>

                {/* Licitadors únics */}
                <div className="glass-card p-4 hover-lift border-l-4 border-l-orange-400">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                            <Users className="text-orange-600" size={16} />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 number-display truncate">
                        {stats?.licitadors_unics || 0}
                    </h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs mt-1 truncate">Licitadors Únics</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Top Adjudicatarios */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Adjudicataris</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={adjudicatariosData} layout="vertical" margin={{ left: 30, right: 30, top: 0, bottom: 0 }}>

                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                                <YAxis
                                    type="category"
                                    dataKey="nombre"
                                    width={180}
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickFormatter={(v) => (v && v.length > 30 ? v.substring(0, 27) + '...' : v)}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomAdjudicatarioTooltip />} cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }} />
                                {Array.from({ length: Math.max(1, maxContractsObj) }).map((_, i) => (
                                    <Bar 
                                        key={i} 
                                        dataKey={`contracte_${i}_import`} 
                                        stackId="a" 
                                        fill={COLORS[(i + 1) % COLORS.length]} 
                                        radius={
                                            i === 0 && maxContractsObj === 1 ? [0, 4, 4, 0] : 
                                            i === maxContractsObj - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]
                                        }
                                        onClick={(data) => {
                                            if (data._originalName) navigate(`/contratos?adjudicatari_nom=${encodeURIComponent(data._originalName)}`);
                                        }}
                                        cursor="pointer"
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Contractes per Departament */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Contractes per Departament</h3>
                    <div className="h-80 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={departamentoData}
                                    cx="50%"
                                    cy="85%"
                                    startAngle={180}
                                    endAngle={0}
                                    innerRadius={90}
                                    outerRadius={130}
                                    paddingAngle={3}
                                    dataKey="contratos"
                                    onClick={(data) => {
                                        if (data.fullName) navigate(`/contratos?departamento_id=${encodeURIComponent(data.fullName)}`);
                                    }}
                                    cursor="pointer"
                                    label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                                    labelLine={false}
                                >
                                    {departamentoData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number, name: string) => {
                                        if (name === 'contratos') return [`${value.toLocaleString()}`, 'Contractes'];
                                        if (name === 'volumen') return [`${formatCurrency(value)}`, 'Volum Total'];
                                        return [value, name];
                                    }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute bottom-4 text-center w-full pointer-events-none">
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Repartiment</p>
                            <p className="text-xl font-bold text-slate-800">per Àrees</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Table */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Resum per Estat</h3>
                <div className="flex flex-wrap lg:flex-nowrap justify-between gap-4">
                    {estadoData.map((estado, index) => (
                        <div 
                            key={estado.name} 
                            className="flex-1 min-w-[120px] text-center p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => navigate(`/contratos?estat_actual=${encodeURIComponent(estado.fullName)}`)}
                        >
                            <div
                                className="w-3 h-3 rounded-full mx-auto mb-2"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <p className="text-2xl font-bold text-slate-800">{estado.value}</p>
                            <p className="text-xs text-slate-500 truncate" title={estado.name}>
                                {estado.name}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

