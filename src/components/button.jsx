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
  const baseStyle = "px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 print:hidden justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 relative overflow-hidden group";

  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 focus:ring-indigo-500 hover:scale-105",
    secondary: "bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 disabled:bg-gray-50 focus:ring-indigo-500 hover:scale-105 shadow-sm",
    danger: "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 border-0 focus:ring-red-500 shadow-lg shadow-red-500/30 hover:shadow-xl hover:scale-105",
    outline: "border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 focus:ring-indigo-500 hover:scale-105",
    ghost: "bg-transparent text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 focus:ring-indigo-500"
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
      {variant === 'primary' && !disabled && (
        <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></span>
      )}
    </button>
  );
};

export default Button;