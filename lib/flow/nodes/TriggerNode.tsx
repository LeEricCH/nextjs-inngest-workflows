"use client";

import { Handle, Position } from '@reactflow/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";
import { NodeProps } from '@reactflow/core';

export type TriggerNodeData = {
  name: string;
  description?: string;
  isSelected?: boolean;
};

export default function TriggerNode({ data, isConnectable, selected, dragging }: NodeProps<TriggerNodeData>) {
  return (
    <div className={cn(
      selected && "ring-2 ring-primary ring-offset-2",
      dragging && "opacity-50"
    )}>
      <Card className={cn(
        "w-[280px] shadow-md transition-all hover:shadow-lg border border-border/50 bg-card/80 backdrop-blur-sm overflow-visible relative",
        selected && "border-primary shadow-lg",
        !selected && "hover:ring-1 hover:ring-primary/50"
      )}>
        <div className="flex flex-col items-center pt-4 pb-2 px-4">
          <div className="mb-3">
            <div className="bg-primary rounded-lg p-2.5 ring-2 ring-primary/20">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium leading-none tracking-tight">
              {data.name}
            </h3>
            <div className="flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </div>
          </div>
        </div>
        <div className="px-3.5 pb-3.5">
          <div className="bg-primary/10 rounded-md border border-primary/20 shadow-sm">
            <div className="px-3 py-2.5 text-xs font-medium text-muted-foreground leading-relaxed flex items-center justify-center text-center">
              Workflow Trigger
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary via-primary/50 to-primary" />
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="!bg-primary !w-3 !h-3 !-right-1.5 !border-2 !border-background !z-50"
        />
      </Card>
    </div>
  );
} 