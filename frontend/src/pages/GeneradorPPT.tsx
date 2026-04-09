import { useState, useEffect } from 'react';
import { usePPTCart } from '../context/PPTContext';
import { FileText, Trash2, ArrowRight, Save, LayoutTemplate, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import ReactMarkdown from 'react-markdown';

export default function GeneradorPPT() {
    const { documents, removeDocument, clearDocuments } = usePPTCart();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [indexGenerated, setIndexGenerated] = useState<any[]>([]);
    
    // Drafts
    const [drafts, setDrafts] = useState<any[]>([]);
    const [draftTitle, setDraftTitle] = useState("");
    const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);

    useEffect(() => {
        loadDraftsList();
    }, []);

    const loadDraftsList = async () => {
        try {
            const data = await api.getPPTDrafts();
            setDrafts(data);
        } catch (e) {
            console.error("Error carregant esborranys", e);
        }
    };

    const handleSaveDraft = async () => {
        if (!draftTitle.trim()) { alert("Introdueix un títol per l'esborrany"); return; }
        if (indexGenerated.length === 0) { alert("L'índex està buit!"); return; }
        setIsSavingDraft(true);
        try {
            const contingutJSON = JSON.stringify(indexGenerated);
            if (activeDraftId) {
                await api.updatePPTDraft(activeDraftId, { titol: draftTitle, contingut_json: contingutJSON });
            } else {
                const res = await api.savePPTDraft({ titol: draftTitle, contingut_json: contingutJSON });
                setActiveDraftId(res.id);
            }
            alert("Esborrany guardat amb èxit!");
            loadDraftsList();
        } catch (e) {
            console.error(e);
            alert("Error guardant l'esborrany.");
        } finally {
            setIsSavingDraft(false);
        }
    };

    const loadDraftData = async (id: number) => {
        try {
            const data = await api.getPPTDraft(id);
            setActiveDraftId(data.id);
            setDraftTitle(data.titol);
            setIndexGenerated(JSON.parse(data.contingut_json));
        } catch (e) {
            console.error(e);
            alert("S'ha produït un error al carregar l'esborrany.");
        }
    };

    const deleteDraft = async (id: number) => {
        if (!confirm("Vols eliminar aquest esborrany?")) return;
        try {
            await api.deletePPTDraft(id);
            if (activeDraftId === id) {
                setActiveDraftId(null);
                setDraftTitle("");
                setIndexGenerated([]);
            }
            loadDraftsList();
        } catch (e) {
            console.error(e);
        }
    };

    const handleGenerateIndex = async () => {
        if (documents.length === 0) return;
        setLoading(true);
        try {
            const urls = documents.map(d => d.url);
            const generated = await api.generatePPTIndex(urls);
            setIndexGenerated(generated.map(g => ({ 
                title: g.title, 
                content: "", 
                processing: false, 
                instructions: "", 
                isPreview: false 
            })));
        } catch (e) {
            console.error(e);
            alert("S'ha produït un error al connectar amb la IA. Revisa l'apartat de Configuració.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSection = async (idx: number) => {
        const item = indexGenerated[idx];
        if (!item) return;

        const updated = [...indexGenerated];
        updated[idx].processing = true;
        setIndexGenerated(updated);

        try {
            const urls = documents.map(d => d.url);
            const ctxText = item.instructions || "Redacta el contingut d'aquest apartat de manera adient.";
            const content = await api.generatePPTSection(item.title, ctxText, urls);
            
            const newIndex = [...indexGenerated];
            newIndex[idx].content = content;
            newIndex[idx].processing = false;
            newIndex[idx].isPreview = true; // Auto enable preview so user sees formatting straight away
            setIndexGenerated(newIndex);
        } catch (e) {
            console.error(e);
            alert("Error al generar la secció.");
            const resetIndex = [...indexGenerated];
            resetIndex[idx].processing = false;
            setIndexGenerated(resetIndex);
        }
    };

    const handleExportWord = () => {
        if (indexGenerated.length === 0) return;
        
        let htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
        <head><meta charset='utf-8'></head><body>`;
        
        indexGenerated.forEach((item, idx) => {
            htmlContent += `<h1>${idx + 1}. ${item.title}</h1>`;
            const contentFormatted = (item.content || "").replace(/\\n\\n/g, '<p></p>').replace(/\\n/g, '<br/>');
            htmlContent += `<div>${contentFormatted}</div>`;
        });
        htmlContent += `</body></html>`;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Document_PPT.doc';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // No early return anymore, let's incorporate it in the render

    const startEmptyDraft = () => {
        if (indexGenerated.length > 0 && !confirm("Vols descartar els canvis actuals i començar en blanc?")) return;
        setIndexGenerated([{ title: "1. Nova Secció", content: "", processing: false, instructions: "", isPreview: false }]);
        setDraftTitle("Nou Document Sense Títol");
        setActiveDraftId(null);
    };

    const addSection = () => {
        setIndexGenerated([...indexGenerated, { title: `${indexGenerated.length + 1}. Nova Secció`, content: "", processing: false, instructions: "", isPreview: false }]);
    };

    const removeSection = (idx: number) => {
        if (!confirm("Segur que vols eliminar aquesta secció?")) return;
        const newVal = [...indexGenerated];
        newVal.splice(idx, 1);
        setIndexGenerated(newVal);
    };

    const handleTitleChange = (idx: number, newTitle: string) => {
        const newVal = [...indexGenerated];
        newVal[idx].title = newTitle;
        setIndexGenerated(newVal);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Layers size={24} className="text-primary-600" />
                        Generador de PPT / Informes
                    </h1>
                    <p className="text-slate-500 mt-1">Crea nous documents combinant intel·ligència artificial amb els teus referents històrics.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={startEmptyDraft} className="btn btn-outline-primary text-sm">
                        + Nou Document Buit
                    </button>
                    <button 
                        onClick={clearDocuments}
                        className="btn btn-secondary text-red-600 hover:text-red-700"
                    >
                        <Trash2 size={16} /> Buidar Cartipàs
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="glass-card p-4">
                        <h3 className="font-semibold text-slate-700 mb-3">Documents Base ({documents.length})</h3>
                        {documents.length === 0 ? (
                            <div className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                                <p>Sense documents seleccionats.</p>
                                <button className="text-primary-600 font-medium hover:underline mt-1" onClick={() => navigate('/contratos')}>Anar a cercar referències</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents.map(doc => (
                                    <div key={doc.id} className="flex flex-col p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-800 line-clamp-2">
                                                <FileText size={14} className="text-primary-500 shrink-0"/>
                                                {doc.titol}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{doc.expedient}</span>
                                            <button onClick={() => removeDocument(doc.id)} className="text-red-500 hover:text-red-700 p-1">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        className={`btn w-full ${documents.length > 0 ? (indexGenerated.length > 0 ? 'btn-secondary' : 'btn-primary') : 'bg-slate-100 text-slate-400 cursor-not-allowed'} gap-2`}
                        onClick={handleGenerateIndex}
                        disabled={loading || documents.length === 0}
                    >
                        {loading && <div className="loading-spinner w-4 h-4"></div>}
                        {!loading && <ArrowRight size={16} />}
                        {indexGenerated.length > 0 ? "Regenerar Índex de Plantilla" : "Analitzar i Generar Índex"}
                    </button>

                    <div className="glass-card p-4 mt-6">
                        <h3 className="font-semibold text-slate-700 mb-3">Els meus Esborranys</h3>
                        {drafts.length === 0 ? <p className="text-sm text-slate-500 text-center py-2">Sense esborranys guardats.</p> : (
                            <ul className="space-y-2">
                                {drafts.map(d => (
                                    <li key={d.id} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-slate-100 shadow-sm cursor-pointer hover:border-primary-300">
                                        <div onClick={() => loadDraftData(d.id)} className="flex-1 truncate font-medium text-slate-700">
                                            {d.titol}
                                        </div>
                                        <button onClick={() => deleteDraft(d.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="glass-card p-6 min-h-[400px]">
                         {indexGenerated.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                                 <LayoutTemplate size={48} className="mb-4 text-slate-200" />
                                 <p className="mb-4">Construeix l'índex amb IA a l'esquerra, o comença'n un des de zero.</p>
                                 <button onClick={startEmptyDraft} className="btn bg-white border border-primary-200 text-primary-600 hover:bg-primary-50">
                                     Començar Document en Blanc
                                 </button>
                             </div>
                         ) : (
                             <div className="space-y-6">
                                 <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-[250px]">
                                        <h3 className="text-lg font-bold text-slate-800">Estructura</h3>
                                        <input 
                                            type="text" 
                                            placeholder="Escriu un títol per guardar..." 
                                            className="input input-sm flex-1 font-normal bg-white"
                                            value={draftTitle}
                                            onChange={(e) => setDraftTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveDraft} disabled={isSavingDraft || indexGenerated.length === 0} className="btn btn-primary text-xs p-2">
                                            {isSavingDraft ? <div className="loading-spinner w-4 h-4"></div> : <Save size={14} className="mr-1"/>}
                                            Guardar Esborrany
                                        </button>
                                        <button onClick={handleExportWord} className="btn btn-secondary text-xs p-2">Exportar Word</button>
                                    </div>
                                 </div>
                                 <div className="space-y-4">
                                     {indexGenerated.map((idxItem, idx) => (
                                         <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                                             <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-3">
                                                 <div className="flex justify-between w-full border-b border-slate-100 pb-2 flex-wrap sm:flex-nowrap gap-2">
                                                     <input 
                                                         type="text" 
                                                         className="font-semibold text-slate-800 bg-transparent border-0 border-b border-dashed border-slate-200 hover:border-primary-400 focus:border-primary-500 focus:ring-0 px-0 flex-1 min-w-[200px]"
                                                         value={idxItem.title}
                                                         onChange={(e) => handleTitleChange(idx, e.target.value)}
                                                     />
                                                     <button onClick={() => removeSection(idx)} className="btn btn-sm btn-ghost text-red-400 hover:text-red-500 hover:bg-red-50 px-2 py-0 h-8 self-center">
                                                         <Trash2 size={14}/>
                                                     </button>
                                                 </div>
                                                 <div className="flex justify-between items-center flex-wrap gap-2 pt-2">
                                                     <input 
                                                         type="text" 
                                                         placeholder="Instruccions / context per a la IA (opcional)..." 
                                                         className="input input-sm flex-1 lg:max-w-md font-normal text-slate-600 bg-slate-50 border-slate-200"
                                                         value={idxItem.instructions || ""}
                                                         onChange={(e) => {
                                                             const newVal = [...indexGenerated];
                                                             newVal[idx].instructions = e.target.value;
                                                             setIndexGenerated(newVal);
                                                         }}
                                                     />
                                                     <button 
                                                         onClick={() => handleGenerateSection(idx)}
                                                         disabled={idxItem.processing}
                                                         className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1 shrink-0"
                                                     >
                                                         {idxItem.processing ? <div className="loading-spinner w-3 h-3"></div> : <LayoutTemplate size={12}/> }
                                                         {idxItem.processing ? "Generant..." : "Generar IA"}
                                                     </button>
                                                 </div>
                                             </div>
                                             
                                             <div className="p-3">
                                                <div className="flex justify-end gap-2 mb-2">
                                                    <button 
                                                        onClick={() => {
                                                            const newVal = [...indexGenerated];
                                                            newVal[idx].isPreview = false;
                                                            setIndexGenerated(newVal);
                                                        }} 
                                                        className={`text-xs px-2 py-1 rounded transition-colors ${!idxItem.isPreview ? 'bg-primary-100 text-primary-700 font-bold' : 'text-slate-500 hover:bg-slate-200'}`}
                                                    >
                                                        Edició
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const newVal = [...indexGenerated];
                                                            newVal[idx].isPreview = true;
                                                            setIndexGenerated(newVal);
                                                        }} 
                                                        className={`text-xs px-2 py-1 rounded transition-colors ${idxItem.isPreview ? 'bg-primary-100 text-primary-700 font-bold' : 'text-slate-500 hover:bg-slate-200'}`}
                                                    >
                                                        Previsualització
                                                    </button>
                                                </div>

                                                {idxItem.isPreview ? (
                                                    <div className="prose prose-sm prose-slate max-w-none p-4 rounded-lg bg-white border border-slate-200 min-h-[8rem]">
                                                        <ReactMarkdown>{idxItem.content || "*Sense contingut*"}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <textarea 
                                                        value={idxItem.content || ""}
                                                        onChange={(e) => {
                                                            const newVal = [...indexGenerated];
                                                            newVal[idx].content = e.target.value;
                                                            setIndexGenerated(newVal);
                                                        }}
                                                        className="w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-700 p-4 h-32 focus:ring-primary-500 focus:border-primary-500 font-mono" 
                                                        placeholder="Vols redactar tu mateix el text? Pots fer-ho aquí directament, utilitzant sintaxi Markdown..."
                                                    ></textarea>
                                                )}
                                             </div>
                                         </div>
                                     ))}
                                     <button onClick={addSection} className="btn w-full btn-outline-primary border-dashed border-2 py-4">
                                         + Afegir Secció Manualment
                                     </button>
                                 </div>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
}
