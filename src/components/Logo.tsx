export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
    <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="LessonTyping Logo"
    >
        {/* Background Square */}
        <rect width="100" height="100" rx="20" fill="#90caf9" />

        {/* L Shape */}
        <path
            d="M25 25V75H50"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
        />

        {/* T Shape */}
        <path
            d="M60 25H90M75 25V75"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);
