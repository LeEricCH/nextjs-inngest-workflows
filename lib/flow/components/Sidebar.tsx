"use client";

import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { nanoid } from 'nanoid';
import { Plus, Boxes } from 'lucide-react';

import { actions } from '@/lib/inngest/workflowActions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NODE_TYPES, NODE_HEIGHT } from '../utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function Sidebar() {
  const { getNodes, addNodes } = useReactFlow();

  const onDragStart = useCallback((event: React.DragEvent, action: typeof actions[0]) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(action));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const addAction = useCallback(
    (action: typeof actions[0]) => {
      const nodes = getNodes();
      const position = {
        x: 0,
        y: (nodes.length) * NODE_HEIGHT,
      };

      // Initialize input values with defaults
      const inputValues: Record<string, string | number> = {};
      if (action.inputs) {
        Object.entries(action.inputs).forEach(([key, input]) => {
          if (input.default !== undefined) {
            if (input.type === 'boolean') {
              inputValues[key] = String(input.default);
            } else {
              inputValues[key] = input.default;
            }
          }
        });
      }

      const newNode = {
        id: nanoid(),
        type: NODE_TYPES.action,
        position,
        data: {
          ...action,
          inputValues,
        },
      };

      addNodes(newNode);
    },
    [getNodes, addNodes]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Actions</h2>
            <p className="text-sm text-muted-foreground">
              Build your workflow
            </p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {actions.length} Available
          </Badge>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <h4 className="text-md font-semibold">General Actions</h4>
          {actions.filter(action => !['apply_changes', 'wait_for_approval'].includes(action.kind)).map((action) => (
            <div
              key={action.kind}
              draggable
              onDragStart={(event) => onDragStart(event, action)}
              className="group flex flex-col bg-card/50 hover:bg-accent rounded-lg px-4 py-3 cursor-move transition-colors border border-border/50"
            >
              <div className="flex items-center mb-1">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-primary/10 p-2 rounded-lg ring-1 ring-primary/10">
                    <Boxes className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{action.name}</p>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => addAction(action)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-11">{action.description}</p>
            </div>
          ))}
          <h4 className="text-md font-semibold">End Actions</h4>
          {actions.filter(action => ['apply_changes', 'wait_for_approval'].includes(action.kind)).map((action) => (
            <div
              key={action.kind}
              draggable
              onDragStart={(event) => onDragStart(event, action)}
              className="group flex flex-col bg-card/50 hover:bg-accent rounded-lg px-4 py-3 cursor-move transition-colors border border-border/50"
            >
              <div className="flex items-center mb-1">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-primary/10 p-2 rounded-lg ring-1 ring-primary/10">
                    <Boxes className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{action.name}</p>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => addAction(action)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-11">{action.description}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 