import { useMemo } from 'react';

interface Props {
    password: string;
}

export default function PasswordStrength({ password }: Props) {
    const strength = useMemo(() => {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    }, [password]);

    const labels = ['', 'Molt feble', 'Feble', 'Acceptable', 'Forta', 'Molt forta', 'Excel·lent'];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500',
                    'bg-lime-500', 'bg-green-500', 'bg-emerald-500'];

    if (!password) return null;

    return (
        <div className="mt-2 space-y-1">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300
                            ${i <= strength ? colors[strength] : 'bg-slate-200 dark:bg-slate-700'}`}
                    />
                ))}
            </div>
            <p className={`text-xs font-medium ${
                strength <= 2 ? 'text-red-500' : 'text-green-600 dark:text-green-400'
            }`}>
                {labels[strength]}
            </p>
        </div>
    );
}
