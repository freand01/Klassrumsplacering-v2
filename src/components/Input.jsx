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
    className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all duration-200 bg-white hover:border-gray-300 placeholder:text-gray-400 ${className}`}
  />
);

export default Input;