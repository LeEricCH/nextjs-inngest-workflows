import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { nanoid } from 'nanoid';
import { Boxes } from 'lucide-react';
import { actions } from '@/lib/inngest/workflowActions';
import { NODE_TYPES, hasDuplicateConnection } from '../utils';
import { toast } from 'sonner';

interface ActionSelectionPopoverProps {
  position: { x: number; y: number };
  sourceNodeId: string;
  onClose: () => void;
}

export function ActionSelectionPopover({ position, sourceNodeId, onClose }: ActionSelectionPopoverProps) {
  const { addNodes, addEdges, project, getNodes, getEdges } = useReactFlow();

  const handleActionSelect = useCallback((action: typeof actions[0]) => {
    const edges = getEdges();
    const nodes = getNodes();
    
    const newNodeId = nanoid();
    const newEdge = {
      id: `${sourceNodeId}-${newNodeId}`,
      source: sourceNodeId,
      target: newNodeId,
      type: 'smoothstep',
    };

    // Check if source node exists
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) {
      toast.error("Source node not found");
      onClose();
      return;
    }

    // Check for duplicate connections
    if (hasDuplicateConnection(edges, newEdge, nodes)) {
      const existingOutgoing = edges.some(edge => edge.source === sourceNodeId);
      if (existingOutgoing) {
        toast.error("Source node already has an outgoing connection");
      } else {
        toast.error("Target node already has an incoming connection");
      }
      onClose();
      return;
    }

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

    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const flowPosition = project({
      x: position.x - reactFlowBounds.left,
      y: position.y - reactFlowBounds.top
    });

    const newNode = {
      id: newNodeId,
      type: NODE_TYPES.action,
      position: flowPosition,
      data: {
        ...action,
        inputValues,
      },
    };

    addNodes(newNode);
    addEdges(newEdge);
    onClose();
  }, [position, sourceNodeId, addNodes, addEdges, onClose, project, getEdges, getNodes]);

  // Calculate position to keep popover in viewport
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  
  const POPOVER_WIDTH = 256; // w-64 = 16rem = 256px
  const POPOVER_HEIGHT = 400;
  const MARGIN = 16;

  let x = position.x - POPOVER_WIDTH / 2;
  let y = position.y;

  // Ensure popover stays within viewport bounds
  x = Math.min(Math.max(MARGIN, x), viewportWidth - POPOVER_WIDTH - MARGIN);
  y = Math.min(Math.max(MARGIN, y), viewportHeight - POPOVER_HEIGHT - MARGIN);

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onMouseDown={onClose}
        style={{ cursor: 'default' }}
      />
      <div
        className="fixed z-50 w-64 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg overflow-hidden"
        style={{ 
          left: x,
          top: y,
          maxHeight: POPOVER_HEIGHT
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b bg-background/95 backdrop-blur-sm">
          <h3 className="text-sm font-semibold">Select Action</h3>
        </div>
        <div 
          className="overflow-y-auto overflow-x-hidden"
          style={{ 
            maxHeight: POPOVER_HEIGHT - 40,
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--muted-foreground)) transparent',
          }}
        >
          <div className="py-1">
            <h3 className="text-md font-semibold">General Actions</h3>
            {actions.filter(action => !['apply_changes', 'wait_for_approval'].includes(action.kind)).map((action, index) => (
              <div key={action.kind}>
                <button
                  onClick={() => handleActionSelect(action)}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                >
                  <div className="shrink-0 mt-0.5">
                    <div className="bg-primary/10 p-1 rounded-md">
                      <Boxes className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm leading-none truncate">{action.name}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-1.5">{action.description}</p>
                  </div>
                </button>
                {index < actions.length - 1 && (
                  <div className="mx-3 border-t border-border/40" />
                )}
              </div>
            ))}
            <h3 className="text-md font-semibold">End Actions</h3>
            {actions.filter(action => ['apply_changes', 'wait_for_approval'].includes(action.kind)).map((action, index) => (
              <div key={action.kind}>
                <button
                  onClick={() => handleActionSelect(action)}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                >
                  <div className="shrink-0 mt-0.5">
                    <div className="bg-primary/10 p-1 rounded-md">
                      <Boxes className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm leading-none truncate">{action.name}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-1.5">{action.description}</p>
                  </div>
                </button>
                {index < actions.length - 1 && (
                  <div className="mx-3 border-t border-border/40" />
                )}
              </div>
            ))}
          </div>
        </div>

        <style jsx global>{`
          .overflow-y-auto::-webkit-scrollbar {
            width: 6px;
          }
          .overflow-y-auto::-webkit-scrollbar-track {
            background: transparent;
          }
          .overflow-y-auto::-webkit-scrollbar-thumb {
            background-color: hsl(var(--muted-foreground) / 0.3);
            border-radius: 3px;
          }
          .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background-color: hsl(var(--muted-foreground) / 0.5);
          }
        `}</style>
      </div>
    </>
  );
} 