import { useState, useEffect } from 'react';
import { api, DashboardStats } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    TrendingDown,
    FileText,
    AlertTriangle,
    DollarSign,
    Calendar,
    RefreshCw,
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
} from 'recharts';

const COLORS = ['#0ea5e9', '#f97316', '#22c55e', '#8b5cf6', '#ec4899', '#eab308'];

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await api.getDashboardStats();
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

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Mai';
        return new Date(dateStr).toLocaleString('ca-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
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

    const adjudicatariosData = stats?.top_adjudicatarios.slice(0, 5) || [];

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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                {/* Total Contratos */}
                <Link to="/contratos" className="glass-card p-5 hover-lift block cursor-pointer transition-colors hover:border-slate-300">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <FileText className="text-blue-600" size={20} />
                        </div>
                        <span className="flex items-center gap-1 text-xs text-green-600">
                            <TrendingUp size={14} />
                            +{stats?.contratos_este_mes || 0}
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 number-display">
                        {stats?.total_contratos.toLocaleString() || 0}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Total Contractes</p>
                </Link>

                {/* Pendientes */}
                <Link to="/contratos?estado_interno=pendiente_aprobacion" className="glass-card p-5 hover-lift block cursor-pointer transition-colors hover:border-slate-300">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                            <AlertTriangle className="text-orange-600" size={20} />
                        </div>
                        {stats?.pendientes_aprobacion && stats.pendientes_aprobacion > 0 && (
                            <span className="badge badge-pending text-xs">Pendents</span>
                        )}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 number-display">
                        {stats?.pendientes_aprobacion || 0}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Pendents Aprovació</p>
                </Link>

                {/* Próximos a Finalizar */}
                <Link to="/contratos?alerta_finalitzacio=true" className="glass-card p-5 hover-lift border-l-4 border-l-yellow-400 block cursor-pointer transition-colors hover:bg-yellow-50/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                            <Calendar className="text-yellow-600" size={20} />
                        </div>
                        {stats?.contratos_proximos_finalizar && stats.contratos_proximos_finalizar > 0 && (
                            <span className="badge bg-yellow-100 text-yellow-800 text-xs">⚠️ Alerta</span>
                        )}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 number-display">
                        {stats?.contratos_proximos_finalizar || 0}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Finalitzen en 6 mesos</p>
                </Link>

                {/* Posiblemente Finalizados */}
                <Link to="/contratos?possiblement_finalitzat=true" className="glass-card p-5 hover-lift border-l-4 border-l-red-400 block cursor-pointer transition-colors hover:bg-red-50/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <TrendingDown className="text-red-600" size={20} />
                        </div>
                        {stats?.contratos_posiblemente_finalizados && stats.contratos_posiblemente_finalizados > 0 && (
                            <span className="badge badge-error text-xs">Revisar</span>
                        )}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 number-display">
                        {stats?.contratos_posiblemente_finalizados || 0}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Possiblement Finalitzats</p>
                </Link>

                {/* Total Importe */}
                <div className="glass-card p-5 hover-lift">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <DollarSign className="text-green-600" size={20} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 number-display">
                        {formatCurrency(stats?.total_importe || 0)}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Volum Total</p>
                </div>

                {/* Última Sincronización */}
                <div className="glass-card p-5 hover-lift">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <RefreshCw className="text-purple-600" size={20} />
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">
                        {formatDate(stats?.ultima_sincronizacion)}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Última Sync</p>
                </div>

                {/* Total Contratos Menores */}
                <Link to="/contratos-menores" className="glass-card p-5 hover-lift block cursor-pointer transition-colors hover:bg-blue-50/30 border-l-4 border-l-cyan-400">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                            <FileText className="text-cyan-600" size={20} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 number-display">
                        {stats?.total_contratos_menores?.toLocaleString() || 0}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Contractes Menors</p>
                </Link>

                {/* Total Importe Menores */}
                <div className="glass-card p-5 hover-lift border-l-4 border-l-emerald-400">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <DollarSign className="text-emerald-600" size={20} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 number-display">
                        {formatCurrency(stats?.total_importe_menores || 0)}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Volum Menors</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Contractes per Estat</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={estadoData} 
                                layout="vertical" 
                                margin={{ left: 30, right: 30, top: 0, bottom: 0 }}
                                barGap={8}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    width={150} 
                                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    formatter={(value: number, _name: string, props: any) => [
                                        `${value.toLocaleString()} (${props.payload.percent}%)`, 
                                        'Contractes'
                                    ]}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    }}
                                    cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                                />
                                <Bar 
                                    dataKey="value" 
                                    radius={[0, 6, 6, 0]} 
                                    barSize={24}
                                    onClick={(data) => {
                                        const fullName = data.fullName || data.payload?.fullName;
                                        if (fullName) navigate(`/contratos?estat_actual=${encodeURIComponent(fullName)}`);
                                    }}
                                    cursor="pointer"
                                >
                                    {estadoData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Adjudicatarios */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Adjudicataris</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={adjudicatariosData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                                <YAxis
                                    type="category"
                                    dataKey="nombre"
                                    width={120}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => (v.length > 18 ? v.substring(0, 18) + '...' : v)}
                                />
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    }}
                                />
                                <Bar 
                                    dataKey="volumen" 
                                    fill="#0ea5e9" 
                                    radius={[0, 4, 4, 0]} 
                                    onClick={(data) => {
                                        if (data.nombre) navigate(`/contratos?adjudicatari_nom=${encodeURIComponent(data.nombre)}`);
                                    }}
                                    cursor="pointer"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Quick Stats Table */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Resum per Estat</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {estadoData.map((estado, index) => (
                        <div 
                            key={estado.name} 
                            className="text-center p-4 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
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
