import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        default: "h-8 w-8",
        sm: "h-4 w-4",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

// ★★★ 修正箇所(1): className を受け取れるように型定義を拡張 ★★★
interface LoadingSpinnerProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

// ★★★ 修正箇所(2): コンポーネントが className と size を受け取るようにする ★★★
const LoadingSpinner = ({
  className,
  size,
  ...props
}: LoadingSpinnerProps) => {
  return (
    // ★★★ 修正箇所(3): 受け取った className を外側の div に適用する ★★★
    <div className={cn("flex justify-center items-center", className)} {...props}>
      <Loader2 className={cn(spinnerVariants({ size }))} />
    </div>
  )
}

export { LoadingSpinner, spinnerVariants };