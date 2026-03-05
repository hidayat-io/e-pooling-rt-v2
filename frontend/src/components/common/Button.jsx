import { Loader2 } from 'lucide-react';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon: Icon,
    className = '',
    ...props
}) {
    const variants = {
        primary: 'btn-primary',
        outline: 'btn-outline',
        danger: 'btn-danger',
        success: 'btn-success',
        ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium py-2 px-4 rounded-xl transition-all',
    };

    const sizes = {
        sm: 'text-sm py-2 px-4',
        md: 'text-base py-3 px-6',
        lg: 'text-lg py-4 px-8',
    };

    return (
        <button
            className={`${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : Icon ? (
                <Icon className="w-5 h-5" />
            ) : null}
            {children}
        </button>
    );
}
