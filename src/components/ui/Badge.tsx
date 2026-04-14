import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export default function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        {
          "bg-gray-700 text-gray-300": variant === "default",
          "bg-emerald-900/50 text-emerald-400 border border-emerald-800/50":
            variant === "success",
          "bg-yellow-900/50 text-yellow-400 border border-yellow-800/50":
            variant === "warning",
          "bg-red-900/50 text-red-400 border border-red-800/50":
            variant === "danger",
          "bg-blue-900/50 text-blue-400 border border-blue-800/50":
            variant === "info",
        },
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
