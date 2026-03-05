export default function Card({ children, className = '', onClick, elevated = false, ...props }) {
    return (
        <div
            className={`${elevated ? 'card-elevated' : 'card'} ${onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.98] transition-all' : ''} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
}
