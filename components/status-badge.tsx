"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  size?: "default" | "sm";
  showChevron?: boolean;
  isLoading?: boolean;
}

export function StatusBadge({ 
  status, 
  size = "default",
  showChevron = false,
  isLoading = false
}: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'text-green-500 dark:text-green-400';
      case 'draft':
        return 'text-yellow-500 dark:text-yellow-400';
      case 'processing':
        return 'text-blue-500 dark:text-blue-400';
      case 'needs approval':
        return 'text-purple-500 dark:text-purple-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'bg-green-500 dark:bg-green-400';
      case 'draft':
        return 'bg-yellow-500 dark:bg-yellow-400';
      case 'processing':
        return 'bg-blue-500 dark:bg-blue-400';
      case 'needs approval':
        return 'bg-purple-500 dark:bg-purple-400';
      default:
        return 'bg-muted-foreground';
    }
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-2 font-medium",
      getStatusColor(status),
      size === "sm" ? "text-xs" : "text-sm"
    )}>
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <div className={cn(
          "h-2 w-2 rounded-full",
          getStatusDot(status)
        )} />
      )}
      <span className="capitalize">
        {status}
      </span>
    </div>
  );
} 