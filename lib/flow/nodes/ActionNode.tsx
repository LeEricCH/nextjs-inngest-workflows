"use client";

import { Handle, Position } from '@reactflow/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Boxes } from "lucide-react";
import { type ActionInput } from "@/lib/inngest/workflowActions";
import { NodeProps } from '@reactflow/core';

export type ActionNodeData = {
  kind: string;
  name: string;
  description: string;
  isSelected?: boolean;
  inputs?: Record<string, ActionInput>;
  inputValues?: Record<string, string | number>;
};

export default function ActionNode({ data, isConnectable, selected, dragging }: NodeProps<ActionNodeData>) {
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
        <div className="flex items-start p-4">
          <div className="flex-shrink-0 mr-3.5">
            <div className="bg-primary/10 rounded-lg p-2 ring-2 ring-primary/5">
              <Boxes className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <h3 className="text-sm font-medium leading-none tracking-tight mb-2 truncate">
              {data.name}
            </h3>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {data.kind}
            </p>
          </div>
        </div>
        <div className="px-3.5 pb-3.5">
          <div className="bg-background/80 rounded-md border shadow-sm">
            <div className="px-3 py-2.5 text-xs text-foreground/90 leading-relaxed flex items-center justify-center text-center">
              {data.description}
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10" />
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="!bg-primary !w-3 !h-3 !-left-1.5 !border-2 !border-background !z-50"
        />
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