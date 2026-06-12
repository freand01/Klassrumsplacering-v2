import React from 'react';

const Input = ({
  value,
  onChange,
  placeholder,
  className = '',
  autoFocus = false,
  type = 'text',
  ariaLabel,
  id,
  name
}) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    autoFocus={autoFocus}
    id={id}
    name={name}
    aria-label={ariaLabel || placeholder}
    className={`w-full px-4 py-2.5 rounded-xl outline-none transition-all duration-200 placeholder:text-muted/80 text-text bg-panel/60 border border-border/60 hover:border-border focus:border-ring/70 focus:ring-2 focus:ring-ring/30 ${className}`}
  />
);

export default Input;