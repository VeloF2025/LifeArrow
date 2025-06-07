import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// South African specific utilities
export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatSADate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'dd/MM/yyyy')
}

export function formatSADateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'dd/MM/yyyy HH:mm')
}

export function calculateVAT(amount: number, vatRate: number = 0.15): number {
  return amount * vatRate
}

export function generateClientCode(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `LA${timestamp}${random}`
}

export function validateSAPhoneNumber(phone: string): boolean {
  const saPhoneRegex = /^(\+27|0)[6-8][0-9]{8}$/
  return saPhoneRegex.test(phone.replace(/\s/g, ''))
}

export function formatSAPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('27')) {
    return `+${cleaned}`
  }
  if (cleaned.startsWith('0')) {
    return `+27${cleaned.slice(1)}`
  }
  return phone
}

export function getWellnessStatus(score: number): {
  status: string
  color: string
  description: string
} {
  if (score >= 85) {
    return {
      status: 'Excellent',
      color: 'text-green-600',
      description: 'Outstanding cellular health'
    }
  }
  if (score >= 70) {
    return {
      status: 'Good',
      color: 'text-blue-600',
      description: 'Good cellular wellness'
    }
  }
  if (score >= 55) {
    return {
      status: 'Fair',
      color: 'text-yellow-600',
      description: 'Room for improvement'
    }
  }
  return {
    status: 'Needs Attention',
    color: 'text-red-600',
    description: 'Requires focused attention'
  }
}