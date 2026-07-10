export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
    <svg
        viewBox="0 0 48 48"
        role="img"
        aria-label="Lesson Typing Logo"
        className={`block ${className}`}
    >
        {/* Keycap base */}
        <rect x="1.5" y="1.5" width="45" height="45" rx="11" fill="#007FFF" />
        {/* Keycap top face */}
        <rect x="6.5" y="5" width="35" height="33" rx="8" fill="#ffffff" fillOpacity="0.22" />
        <text
            x="24"
            y="31"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="24"
            fontWeight="800"
            fill="#ffffff"
        >
            A
        </text>
    </svg>
);
