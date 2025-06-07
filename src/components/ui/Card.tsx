import React from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'sage' | 'rose' | 'eucalyptus' | 'minimal'
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({
  className,
  variant = 'default',
  padding = 'md',
  hover = true,
  children,
  ...props
}: CardProps) {
  const baseClasses = 'rounded-xl border transition-all duration-300'
  
  const variants = {
    default: 'bg-white border-gray-100 shadow-sm',
    sage: 'bg-wellness-sage-50 border-wellness-sage-100',
    rose: 'bg-wellness-rose-50 border-wellness-rose-100',
    eucalyptus: 'bg-wellness-eucalyptus-50 border-wellness-eucalyptus-100',
    minimal: 'bg-white border-gray-50',
  }
  
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  
  const hoverClasses = hover ? 'hover:shadow-md hover:-translate-y-0.5' : ''

  return (
    <div
      className={cn(
        baseClasses,
        variants[variant],
        paddings[padding],
        hoverClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function CardHeader({
  className,
  title,
  description,
  action,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)} {...props}>
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm text-gray-600">
            {description}
          </p>
        )}
        {children}
      </div>
      {action && (
        <div className="ml-4">
          {action}
        </div>
      )}
    </div>
  )
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-6 pt-6 border-t border-gray-100', className)} {...props}>
      {children}
    </div>
  )
}