
import React from 'react';
import { SpinnerIcon } from '../Icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  icon, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-blue-700 shadow-md focus:ring-primary",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-md focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md focus:ring-green-500",
    outline: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
    ghost: "bg-transparent text-gray-500 hover:text-primary hover:bg-blue-50",
  };

  const sizes = {
    sm: "py-1.5 px-3 text-xs",
    md: "py-2 px-4 text-sm",
    lg: "py-3 px-6 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <SpinnerIcon className="h-4 w-4 mr-2 animate-spin" />}
      {!isLoading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
