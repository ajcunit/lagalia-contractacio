import { useSearchParams } from 'react-router-dom';
import Contratos from './Contratos';
import ContratosMenores from './ContratosMenores';

export default function Contratacion() {
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'ordinarios';

    return (
        <div className="flex flex-col h-full space-y-2 overflow-hidden">
            {/* Unified Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'ordinarios' ? (
                    <Contratos hideHeader={false} />
                ) : (
                    <ContratosMenores hideHeader={false} />
                )}
            </div>
        </div>
    );
}
