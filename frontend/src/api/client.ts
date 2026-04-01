const API_BASE_URL = '/api';

export interface Departamento {
    id: number;
    codigo: string;
    nombre: string;
    descripcion?: string;
    activo: boolean;
    fecha_creacion: string;
}

export interface Empleado {
    id: number;
    nombre: string;
    email: string;
    departamento_id?: number;
    rol: string;
    activo: boolean;
    permiso_auditoria?: boolean;
    fecha_creacion: string;
    departamento?: Departamento;
}

export interface ContratoListItem {
    id: number;
    codi_expedient: string;
    objecte_contracte?: string;
    adjudicatari_nom?: string;
    import_adjudicacio_amb_iva?: number;
    data_inici?: string;
    estat_actual?: string;
    estado_interno: string;
    departamento_id?: number;
    data_finalitzacio_calculada?: string;
    alerta_finalitzacio?: boolean;
    possiblement_finalitzat?: boolean;
    durada_contracte?: number;
    num_prorrogues?: number;
    num_lots?: number;
}

export interface Contrato {
    id: number;
    codi_expedient: string;
    codi_ine10?: string;
    codi_dir3?: string;
    objecte_contracte?: string;
    tipus_contracte?: string;
    procediment?: string;
    estat_actual?: string;
    adjudicatari_nom?: string;
    adjudicatari_nif?: string;
    adjudicatari_nacionalitat?: string;
    organisme_adjudicador?: string;
    departament_adjudicador?: string;
    preu_licitar?: number;
    preu_adjudicar?: number;
    import_adjudicacio_amb_iva?: number;
    import_licitar_sense_iva?: number;
    data_publicacio?: string;
    data_actualitzacio?: string;
    data_inici?: string;
    data_final?: string;
    data_formalitzacio?: string;
    data_anunci_previ?: string;
    data_anunci_licitacio?: string;
    data_anunci_adjudicacio?: string;
    data_anunci_formalitzacio?: string;
    cpv_principal_codi?: string;
    cpv_principal_descripcio?: string;
    enllac_anunci_previ?: string;
    enllac_licitacio?: string;
    enllac_adjudicacio?: string;
    enllac_formalitzacio?: string;
    enllac_perfil_contractant?: string;
    enllac_publicacio?: string;
    url_plataforma_contractacio?: string;
    lots?: string;
    tipus_tramitacio?: string;
    codi_nuts?: string;
    descripcio_nuts?: string;
    forma_financament?: string;
    departamento_id?: number;
    estado_interno: string;
    hash_contenido?: string;
    fecha_primera_sincronizacion?: string;
    fecha_ultima_sincronizacion?: string;
    pressupost_licitacio_sense_iva?: number;
    pressupost_licitacio_sense_iva_expedient?: number;
    pressupost_licitacio_amb_iva?: number;
    pressupost_licitacio_amb_iva_expedient?: number;
    valor_estimat_expedient?: number;
    durada_contracte?: number;
    data_finalitzacio_calculada?: string;
    alerta_finalitzacio?: boolean;
    possiblement_finalitzat?: boolean;
    data_anulacio?: string;
    url_json_futura?: string;
    url_json_agregada?: string;
    url_json_cpm?: string;
    url_json_previ?: string;
    url_json_licitacio?: string;
    url_json_avaluacio?: string;
    url_json_adjudicacio?: string;
    url_json_formalitzacio?: string;
    url_json_anulacio?: string;
}

export interface Sincronizacion {
    id: number;
    fecha_hora_inicio: string;
    fecha_hora_fin?: string;
    registros_nuevos: number;
    registros_actualizados: number;
    registros_sin_cambios: number;
    estado: string;
    log_errores?: string;
    url_endpoint?: string;
    total_registros_api?: number;
}

export interface ContratoMenor {
    id: number;
    codi_expedient: string;
    tipus_contracte?: string;
    descripcio_expedient?: string;
    adjudicatari?: string;
    import_adjudicacio?: number;
    data_adjudicacio?: string;
    exercici?: number;
    dies_durada?: number;
    mesos_durada?: number;
    anys_durada?: number;
    tipus_liquidacio?: string;
    data_liquidacio?: string;
    import_liquidacio?: number;
    fecha_ultima_sincronizacion?: string;
    departamento_id?: number;
    estado_interno: string;
}

export interface Duplicado {
    id: number;
    contrato_id_1: number;
    contrato_id_2: number;
    campo_duplicado: string;
    valor_duplicado: string;
    fecha_deteccion: string;
    estado_validacion: string;
    usuario_validador_id?: number;
    fecha_validacion?: string;
    accion_tomada?: string;
    observaciones?: string;
    contrato_1?: Contrato;
    contrato_2?: Contrato;
}

export interface DashboardStats {
    total_contratos: number;
    contratos_por_estado: Record<string, number>;
    pendientes_aprobacion: number;
    total_importe: number;
    ultima_sincronizacion?: string;
    contratos_este_mes: number;
    top_adjudicatarios: Array<{ nombre: string; contratos: number; volumen: number }>;
    contratos_proximos_finalizar: number;
    contratos_posiblemente_finalizados: number;
    total_contratos_menores: number;
    total_importe_menores: number;
}

export interface FiltroOpciones {
    estados: string[];
    tipos_contrato: string[];
    procedimientos: string[];
}

export interface Prorroga {
    id: number;
    contrato_id: number;
    numero_prorroga?: number;
    data_inici_prorroga?: string;
    data_fi_prorroga?: string;
    import_adjudicacio?: number;
    exercici?: number;
    situaci_contractual?: string;
    fecha_sincronizacion?: string;
}

export interface Modificacion {
    id: number;
    contrato_id: number;
    numero_modificacio?: number;
    data_aprovacio_modificacio?: string;
    tipus_modificacio?: string;
    import_modificacio?: number;
    anys_termini_modificacio?: number;
    mesos_termini_modificacio?: number;
    dies_termini_modificacio?: number;
    fecha_sincronizacion?: string;
}

// CPV Schemas
export interface CPV {
    id: number;
    codigo: string;
    descripcion: string;
    nivel: string;
    padre_codigo?: string;
    datos_json?: any;
}

export interface CPVAISuggestion {
    codigo: string;
    descripcion: string;
    score: number;
    justificacion: string;
}

export interface CPVAIResponse {
    suggestions: CPVAISuggestion[];
}

export interface Configuracion {
    id: number;
    clave: string;
    valor: string;
    descripcion?: string;
    updated_at?: string;
}

export interface GlobalSearchResponse {
    results: any[];
    count: number;
    limit: number;
    offset: number;
}

// Adjudicatarios
export interface Adjudicatario {
    nombre: string;
    total_contratos: number;
    total_importe: number;
}

export interface AdjudicatarioListResponse {
    items: Adjudicatario[];
    total: number;
    limit: number;
    offset: number;
}

export interface ContratoAdjudicatario {
    id: number;
    codi_expedient: string;
    descripcion: string;
    importe: number;
    tipo_registro: string;
    fecha: string;
    estado: string;
}

export interface AdjudicatarioDetalleResponse {
    nombre: string;
    nif?: string;
    total_contratos: number;
    total_importe: number;
    contratos: ContratoAdjudicatario[];
}

// API Client
class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    public async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const token = localStorage.getItem('token');
        const viewMode = localStorage.getItem('viewMode') || 'user';
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-View-Mode': viewMode,
            ...(options?.headers as any),
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.dispatchEvent(new Event('unauthorized'));
            }
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `Error HTTP: ${response.status}`);
        }

        return response.json();
    }

    // Auth
    async login(username: string, password: string): Promise<{ access_token: string }> {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });
        
        if (!response.ok) {
            throw new Error('Correu o contrasenya incorrectes');
        }
        return response.json();
    }

    async getMe(): Promise<Empleado> {
        return this.request<Empleado>('/auth/me');
    }

    async getAuditoriaAIAnalysis(custom_prompt?: string): Promise<{ analysis: string }> {
        return this.request<{ analysis: string }>('/auditoria/ai-analysis', {
            method: 'POST',
            body: JSON.stringify({ custom_prompt: custom_prompt || null })
        });
    }

    // Dashboard
    async getDashboardStats(): Promise<DashboardStats> {
        return this.request<DashboardStats>('/contratos/stats');
    }

    // Departamentos
    async getDepartamentos(): Promise<Departamento[]> {
        return this.request<Departamento[]>('/departamentos/');
    }

    async getDepartamento(id: number): Promise<Departamento> {
        return this.request<Departamento>(`/departamentos/${id}`);
    }

    async createDepartamento(data: { codigo: string; nombre: string; descripcion?: string }): Promise<Departamento> {
        return this.request<Departamento>('/departamentos/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateDepartamento(id: number, data: Partial<Departamento>): Promise<Departamento> {
        return this.request<Departamento>(`/departamentos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteDepartamento(id: number): Promise<void> {
        return this.request(`/departamentos/${id}`, { method: 'DELETE' });
    }

    // Empleados
    async getEmpleados(): Promise<Empleado[]> {
        return this.request<Empleado[]>('/empleados/');
    }

    async getEmpleado(id: number): Promise<Empleado> {
        return this.request<Empleado>(`/empleados/${id}`);
    }

    async createEmpleado(data: { nombre: string; email: string; departamento_id?: number; rol?: string; password?: string }): Promise<Empleado> {
        return this.request<Empleado>('/empleados/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateEmpleado(id: number, data: Partial<Empleado> & { password?: string }): Promise<Empleado> {
        return this.request<Empleado>(`/empleados/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteEmpleado(id: number): Promise<void> {
        return this.request(`/empleados/${id}`, { method: 'DELETE' });
    }

    // Contratos
    async getContratos(params?: Record<string, string | number | boolean | undefined>): Promise<ContratoListItem[]> {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    searchParams.append(key, String(value));
                }
            });
        }
        const query = searchParams.toString();
        return this.request<ContratoListItem[]>(`/contratos/${query ? `?${query}` : ''}`);
    }

    async getContrato(id: number): Promise<Contrato> {
        return this.request<Contrato>(`/contratos/${id}`);
    }

    async getContratoLots(id: number): Promise<Contrato[]> {
        return this.request<Contrato[]>(`/contratos/${id}/lots`);
    }

    async getFiltroOpciones(): Promise<FiltroOpciones> {
        return this.request<FiltroOpciones>('/contratos/filtros');
    }

    async getCpvInfo(codes: string[]): Promise<Record<string, string>> {
        if (!codes || codes.length === 0) return {};
        const query = codes.map(c => c.trim()).filter(Boolean).join(',');
        return this.request<Record<string, string>>(`/contratos/cpv-info?codes=${query}`);
    }

    async updateContrato(id: number, data: { departamento_id?: number | null; estado_interno?: string }): Promise<Contrato> {
        return this.request<Contrato>(`/contratos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async asignarMasivoDepartamentos(contratoIds: number[], departamentoId: number | null): Promise<{ message: string }> {
        return this.request<{ message: string }>('/contratos/asignar_masivo', {
            method: 'POST',
            body: JSON.stringify({
                contrato_ids: contratoIds,
                departamento_id: departamentoId
            }),
        });
    }

    async getProrrogues(contratoId: number): Promise<Prorroga[]> {
        return this.request<Prorroga[]>(`/contratos/${contratoId}/prorrogues`);
    }

    async getModificacions(contratoId: number): Promise<Modificacion[]> {
        return this.request<Modificacion[]>(`/contratos/${contratoId}/modificacions`);
    }

    // Contratos Menores
    async getContratosMenores(params?: { skip?: number, limit?: number, search?: string, adjudicatari?: string, exercici?: number, recent?: boolean, departamento_id?: number, estado_interno?: string }): Promise<ContratoMenor[]> {
        const query = new URLSearchParams();
        if (params) {
            if (params.skip !== undefined) query.append('skip', String(params.skip));
            if (params.limit !== undefined) query.append('limit', String(params.limit));
            if (params.search) query.append('search', params.search);
            if (params.adjudicatari) query.append('adjudicatari', params.adjudicatari);
            if (params.exercici) query.append('exercici', String(params.exercici));
            if (params.recent) query.append('recent', 'true');
            if (params.departamento_id) query.append('departamento_id', String(params.departamento_id));
            if (params.estado_interno) query.append('estado_interno', params.estado_interno);
        }
        return this.request<ContratoMenor[]>(`/contratos-menores/?${query.toString()}`);
    }

    async updateContratoMenor(id: number, data: { departamento_id?: number | null; estado_interno?: string }): Promise<ContratoMenor> {
        return this.request<ContratoMenor>(`/contratos-menores/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async asignarMasivoMenores(contratoIds: number[], departamentoId: number | null): Promise<{ message: string }> {
        return this.request<{ message: string }>('/contratos-menores/asignar_masivo', {
            method: 'POST',
            body: JSON.stringify({
                contrato_ids: contratoIds,
                departamento_id: departamentoId
            }),
        });
    }

    async getContratoMenor(id: number): Promise<ContratoMenor> {
        return this.request<ContratoMenor>(`/contratos-menores/${id}`);
    }

    async syncMenores(codi_ine10?: string): Promise<{ message: string; stats: any }> {
        const params = codi_ine10 ? `?codi_ine10=${codi_ine10}` : '';
        return this.request(`/contratos-menores/sincronizar${params}`, { method: 'POST' });
    }

    async syncCpvs(): Promise<{ nuevos: number; actualizados: number; total: number; error?: string }> {
        return this.request('/cpv/sync', { method: 'POST' });
    }

    // Sincronización
    async getSincronizaciones(): Promise<Sincronizacion[]> {
        return this.request<Sincronizacion[]>('/sincronizacion/');
    }

    async getUltimaSincronizacion(): Promise<Sincronizacion | null> {
        return this.request<Sincronizacion | null>('/sincronizacion/ultima');
    }

    async ejecutarSincronizacion(codi_ine10?: string): Promise<{ message: string; sync_id: number }> {
        const params = codi_ine10 ? `?codi_ine10=${codi_ine10}` : '';
        return this.request(`/sincronizacion/ejecutar${params}`, { method: 'POST' });
    }

    async getAdjudicatarios(params?: { limit?: number; offset?: number; search?: string; sort_by?: string; sort_desc?: boolean }): Promise<AdjudicatarioListResponse> {
        const queryParams = new URLSearchParams();
        if (params) {
            if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
            if (params.offset !== undefined) queryParams.append('offset', String(params.offset));
            if (params.search) queryParams.append('search', params.search);
            if (params.sort_by) queryParams.append('sort_by', params.sort_by);
            if (params.sort_desc !== undefined) queryParams.append('sort_desc', String(params.sort_desc));
        }
        return this.request<AdjudicatarioListResponse>(`/adjudicatarios/?${queryParams.toString()}`);
    }

    async getAdjudicatarioDetalle(nombre: string): Promise<AdjudicatarioDetalleResponse> {
        // Encode name to base64url to avoid issues with slashes and strange characters in URLs
        const encodedName = btoa(encodeURIComponent(nombre)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return this.request<AdjudicatarioDetalleResponse>(`/adjudicatarios/${encodedName}`);
    }

    async reloadScheduler(): Promise<{ status: string; message: string }> {
        return this.request<{ status: string; message: string }>('/config/scheduler/reload', {
            method: 'POST',
        });
    }

    startSyncStream(
        codi_ine10: string,
        onMessage: (msg: string, progress: number) => void,
        onError: (err: any) => void,
        onComplete: () => void
    ): EventSource {
        const token = localStorage.getItem('token');
        const source = new EventSource(`${this.baseUrl}/sincronizacion/ejecutar/stream?codi_ine10=${codi_ine10}&token=${encodeURIComponent(token || '')}`);
        
        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.error) {
                    onError(new Error(data.msg));
                    source.close();
                } else if (data.done) {
                    onMessage(data.msg, data.progress);
                    onComplete();
                    source.close();
                } else {
                    onMessage(data.msg, data.progress);
                }
            } catch (err) {
                console.error("Failed to parse SSE", err);
            }
        };

        source.onerror = (err) => {
            onError(err);
            source.close();
        };

        return source;
    }

    async getProxyJson(url: string): Promise<any> {
        return this.request<any>(`/proxy-json?url=${encodeURIComponent(url)}`);
    }

    async getSincronizacion(id: number): Promise<Sincronizacion> {
        return this.request<Sincronizacion>(`/sincronizacion/${id}`);
    }

    // Duplicados
    async getDuplicados(estado?: string): Promise<Duplicado[]> {
        const params = estado ? `?estado=${estado}` : '';
        return this.request<Duplicado[]>(`/sincronizacion/duplicados/${params}`);
    }

    async getDuplicadosCount(): Promise<{ pendientes: number }> {
        return this.request<{ pendientes: number }>('/sincronizacion/duplicados/count');
    }

    async validarDuplicado(id: number, data: { accion_tomada: string; observaciones?: string }): Promise<void> {
        return this.request(`/sincronizacion/duplicados/${id}/validar`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // CPV Suggestions
    async suggestCpvsAI(descripcion: string): Promise<CPVAIResponse> {
        return this.request<CPVAIResponse>('/cpv/suggest-ai', {
            method: 'POST',
            body: JSON.stringify({ descripcion }),
        });
    }

    async searchCpvs(q: string, nivel?: string): Promise<CPV[]> {
        const params = new URLSearchParams({ q });
        if (nivel) params.append('nivel', nivel);
        return this.request<CPV[]>(`/cpv/search?${params.toString()}`);
    }

    // Configuration
    async getConfig(clave: string): Promise<Configuracion> {
        return this.request<Configuracion>(`/config/${clave}`);
    }

    async updateConfig(clave: string, valor: string, descripcion?: string): Promise<Configuracion> {
        return this.request<Configuracion>(`/config/${clave}`, {
            method: 'PUT',
            body: JSON.stringify({ valor, descripcion }),
        });
    }

    async getOllamaModels(): Promise<string[]> {
        return this.request<string[]>('/config/ollama-models');
    }

    // SuperBuscador
    async searchGlobalContracts(params: { q?: string; organisme?: string; objecte?: string; limit?: number; offset?: number }): Promise<GlobalSearchResponse> {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
        if (params.organisme) searchParams.append('organisme', params.organisme);
        if (params.objecte) searchParams.append('objecte', params.objecte);
        if (params.limit) searchParams.append('limit', String(params.limit));
        if (params.offset) searchParams.append('offset', String(params.offset));
        
        return this.request<GlobalSearchResponse>(`/superbuscador/search?${searchParams.toString()}`);
    }

    async getGlobalContractDetail(codi_expedient: string): Promise<any> {
        return this.request<any>(`/superbuscador/contract/${encodeURIComponent(codi_expedient)}`);
    }

    // Favoritos
    async getCarpetasFavoritas(): Promise<CarpetaFavorita[]> {
        return this.request<CarpetaFavorita[]>('/favoritos/carpetas');
    }

    async createCarpetaFavorita(data: { nombre: string; descripcion?: string; color?: string }): Promise<CarpetaFavorita> {
        return this.request<CarpetaFavorita>('/favoritos/carpetas', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getFavoritosPorCarpeta(carpetaId: number): Promise<ContratoFavorito[]> {
        return this.request<ContratoFavorito[]>(`/favoritos/carpetas/${carpetaId}/contratos`);
    }

    async addFavorito(carpetaId: number, contratoId: number, notas?: string): Promise<ContratoFavorito> {
        return this.request<ContratoFavorito>(`/favoritos/carpetas/${carpetaId}/contratos`, {
            method: 'POST',
            body: JSON.stringify({ contrato_id: contratoId, notas }),
        });
    }

    async addFavoritoByExpediente(carpetaId: number, codi_expedient: string, notas?: string): Promise<ContratoFavorito> {
        return this.request<ContratoFavorito>(`/favoritos/carpetas/${carpetaId}/contratos/by-expediente`, {
            method: 'POST',
            body: JSON.stringify({ codi_expedient, notas }),
        });
    }

    async deleteFavorito(carpetaId: number, contratoId: number): Promise<void> {
        return this.request(`/favoritos/carpetas/${carpetaId}/contratos/${contratoId}`, {
            method: 'DELETE',
        });
    }

    async deleteCarpeta(carpetaId: number): Promise<void> {
        return this.request(`/favoritos/carpetas/${carpetaId}`, {
            method: 'DELETE',
        });
    }

    async getTodosFavoritos(): Promise<ContratoFavorito[]> {
        return this.request<ContratoFavorito[]>('/favoritos/todos');
    }
}

export interface CarpetaFavorita {
    id: number;
    nombre: string;
    descripcion?: string;
    color?: string;
    fecha_creacion: string;
}

export interface ContratoFavorito {
    id: number;
    carpeta_id: number;
    contrato_id: number;
    notas?: string;
    fecha_agregado: string;
    contrato?: Contrato;
}

export const api = new ApiClient(API_BASE_URL);
