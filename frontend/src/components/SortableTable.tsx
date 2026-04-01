import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

// ---- Hook ----
export type SortDirection = 'asc' | 'desc' | null;
export type SortConfig = { key: string; direction: SortDirection };

export function useSortableData<T>(items: T[], defaultSort?: SortConfig) {
    const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort || { key: '', direction: null });

    const sortedItems = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return items;

        return [...items].sort((a: any, b: any) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Handle nulls/undefined — push them to the end
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            // Detect and compare dates (ISO strings)
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                const dateA = Date.parse(aVal);
                const dateB = Date.parse(bVal);
                if (!isNaN(dateA) && !isNaN(dateB) && aVal.match(/^\d{4}-/)) {
                    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
                }
            }

            // Numbers
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // Booleans
            if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
                return sortConfig.direction === 'asc'
                    ? (aVal === bVal ? 0 : aVal ? 1 : -1)
                    : (aVal === bVal ? 0 : aVal ? -1 : 1);
            }

            // Strings — case-insensitive
            const strA = String(aVal).toLowerCase();
            const strB = String(bVal).toLowerCase();
            if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

    const requestSort = (key: string) => {
        setSortConfig((prev) => {
            if (prev.key !== key) return { key, direction: 'asc' };
            if (prev.direction === 'asc') return { key, direction: 'desc' };
            return { key: '', direction: null }; // reset
        });
    };

    return { sortedItems, sortConfig, requestSort };
}

// ---- Component ----
interface SortableThProps {
    label: string;
    sortKey: string;
    sortConfig: SortConfig;
    onSort: (key: string) => void;
    className?: string;
}

export function SortableTh({ label, sortKey, sortConfig, onSort, className = '' }: SortableThProps) {
    const isActive = sortConfig.key === sortKey;

    return (
        <th
            className={`px-4 py-3 bg-slate-50 border-b border-slate-100 cursor-pointer select-none group uppercase tracking-wider text-[11px] font-bold text-slate-500 ${className}`}
            onClick={() => onSort(sortKey)}
            title={`Ordenar per ${label}`}
        >
            <div className="flex items-center gap-1.5 justify-start">
                <span>{label}</span>
                <span className={`transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                    {isActive && sortConfig.direction === 'asc' ? (
                        <ArrowUp size={14} className="text-primary-600" />
                    ) : isActive && sortConfig.direction === 'desc' ? (
                        <ArrowDown size={14} className="text-primary-600" />
                    ) : (
                        <ArrowUpDown size={14} />
                    )}
                </span>
            </div>
        </th>
    );
}
