import React from 'react'
import { cn } from '../../lib/utils'
import { DivideIcon as LucideIcon } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'wellness-button inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-wellness-sage-600 text-white hover:bg-wellness-sage-700 focus:ring-wellness-sage-500',
    secondary: 'bg-wellness-eucalyptus-100 text-wellness-eucalyptus-800 hover:bg-wellness-eucalyptus-200 focus:ring-wellness-eucalyptus-500',
    outline: 'border border-wellness-sage-300 text-wellness-sage-700 hover:bg-wellness-sage-50 focus:ring-wellness-sage-500',
    ghost: 'text-wellness-sage-700 hover:bg-wellness-sage-50 focus:ring-wellness-sage-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  }

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </>
      )}
    </button>
  )
}