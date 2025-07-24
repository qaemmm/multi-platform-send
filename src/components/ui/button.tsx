import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"

    const variants = {
      default: "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5",
      destructive: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:-translate-y-0.5",
      outline: "border-2 border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5",
      secondary: "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 hover:shadow-md hover:-translate-y-0.5",
      ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:-translate-y-0.5",
      link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700",
    }

    const sizes = {
      default: "h-11 px-6 py-2",
      sm: "h-9 px-4 py-1 text-xs",
      lg: "h-12 px-8 py-3 text-base",
      icon: "h-11 w-11",
    }

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
