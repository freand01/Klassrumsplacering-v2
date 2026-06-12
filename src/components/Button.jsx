import React from 'react';

const Button = ({
  onClick,
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  title = '',
  ariaLabel,
  type = 'button'
}) => {
  const baseStyle = "px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 print:hidden justify-center active:scale-[0.99] relative overflow-hidden select-none disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "text-white shadow-glow " +
      "bg-[linear-gradient(135deg,rgb(var(--primary)/0.95),rgb(var(--accent)/0.55),rgb(var(--primary-2)/0.75))] " +
      "hover:brightness-110",
    secondary:
      "glass text-text hover:bg-white/10 border border-border/60",
    danger:
      "text-white bg-[linear-gradient(135deg,rgb(var(--danger)/0.95),rgb(var(--accent)/0.55))] shadow-lg hover:brightness-110",
    outline:
      "border border-border/70 text-text bg-transparent hover:bg-white/6",
    ghost:
      "bg-transparent text-muted hover:text-text hover:bg-white/6"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || title}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

export default Button;
