export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
    <img
        src="/favicon.png"
        alt="LessonTyping Logo"
        className={`block ${className}`}
    />
);
