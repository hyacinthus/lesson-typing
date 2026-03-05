export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
    <img
        src="/favicon.png"
        alt="Lesson Typing Logo"
        className={`block ${className}`}
    />
);
