import React from 'react'
import { cn } from '../../lib/utils'
import { CheckCircle } from 'lucide-react'

interface Step {
  id: number
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  steps: Step[]
}

export function ProgressBar({ currentStep, totalSteps, steps }: ProgressBarProps) {
  return (
    <div className="w-full">
      {/* Desktop Progress Bar */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep
            const isUpcoming = stepNumber > currentStep
            
            return (
              <div key={step.id} className="flex items-center">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                      isCompleted && 'bg-wellness-sage-500 border-wellness-sage-500 text-white',
                      isCurrent && 'bg-white border-wellness-sage-500 text-wellness-sage-600 shadow-lg',
                      isUpcoming && 'bg-gray-100 border-gray-300 text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  
                  {/* Step Info */}
                  <div className="mt-3 text-center">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        (isCompleted || isCurrent) && 'text-gray-900',
                        isUpcoming && 'text-gray-500'
                      )}
                    >
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        'text-xs mt-1',
                        (isCompleted || isCurrent) && 'text-gray-600',
                        isUpcoming && 'text-gray-400'
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
                
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-4 transition-all duration-300',
                      stepNumber < currentStep && 'bg-wellness-sage-500',
                      stepNumber >= currentStep && 'bg-gray-300'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Mobile Progress Bar */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-wellness-sage-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        
        <div className="mt-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {steps[currentStep - 1]?.title}
          </h3>
          <p className="text-sm text-gray-600">
            {steps[currentStep - 1]?.description}
          </p>
        </div>
      </div>
    </div>
  )
}