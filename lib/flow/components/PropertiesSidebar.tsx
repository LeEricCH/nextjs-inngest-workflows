import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow, Node } from 'reactflow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Boxes, HelpCircle, Trash2, Zap } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from '@/lib/utils';
import { NODE_TYPES } from '../utils';
import { type WorkflowAction } from '@/lib/inngest/workflowActions';
import { Button } from '@/components/ui/button';

type InputValue = string | number | boolean;
interface NodeInput {
  name: string;
  type: string;
  description: string;
  default?: InputValue;
  required?: boolean;
  isAdvanced?: boolean;
}

interface PropertiesSidebarProps {
  selectedNode: Node<WorkflowAction> | null;
  onNodeSelect: (nodeId: string) => void;
}

// Controlled input component that manages its own state
function ControlledInput({ 
  type, 
  initialValue, 
  onSave,
  nodeId,
  inputKey 
}: { 
  type: string;
  initialValue: string | number | boolean;
  onSave: (nodeId: string, key: string, value: string | number | boolean) => void;
  nodeId: string;
  inputKey: string;
}) {
  const [value, setValue] = useState(String(initialValue));
  
  // Update local state when initialValue changes
  useEffect(() => {
    setValue(String(initialValue));
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValue(e.target.value);
  };

  const handleSave = () => {
    let finalValue: string | number | boolean = value;
    if (type === 'number' && value !== '') {
      finalValue = Number(value);
    } else if (type === 'boolean') {
      finalValue = value === 'true';
    }
    onSave(nodeId, inputKey, finalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (type === 'boolean') {
    return (
      <select
        value={value}
        onChange={handleChange}
        onBlur={handleSave}
        className="w-full h-8 px-2 rounded-md bg-muted/50 text-xs border-0 ring-1 ring-border/50 focus:ring-2 focus:ring-primary"
      >
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }

  return (
    <input
      type={type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={handleChange}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="w-full h-8 px-2 rounded-md bg-muted/50 text-xs border-0 ring-1 ring-border/50 focus:ring-2 focus:ring-primary"
    />
  );
}

export function PropertiesSidebar({ selectedNode, onNodeSelect }: PropertiesSidebarProps) {
  const { getNodes, setNodes, deleteElements, getEdges } = useReactFlow();
  const [nodes, setLocalNodes] = useState(getNodes());
  const selectedNodeRef = useRef<HTMLDivElement>(null);

  // Keep local nodes in sync with React Flow nodes
  useEffect(() => {
    const nodes = getNodes();
    setLocalNodes(nodes);
    // If the selected node was deleted, clear the selection
    if (selectedNode && !nodes.find(n => n.id === selectedNode.id)) {
      onNodeSelect('');
    }
  }, [getNodes, selectedNode, onNodeSelect]);

  const handleInputChange = useCallback((nodeId: string, inputKey: string, value: InputValue) => {
    setNodes(nodes => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              inputValues: {
                ...node.data.inputValues,
                [inputKey]: value
              }
            }
          };
        }
        return node;
      });
    });
  }, [setNodes]);

  // Get node order based on connections
  const getNodeOrder = useCallback((nodeId: string): number => {
    const edges = getEdges();
    const allNodes = getNodes();
    
    // Find trigger node (it's always first)
    const triggerNode = allNodes.find(n => n.type === NODE_TYPES.trigger);
    if (!triggerNode) return 0;
    if (nodeId === triggerNode.id) return 1;

    // Build a map of connections
    const connections = new Map<string, string>();
    edges.forEach(edge => {
      connections.set(edge.source, edge.target);
    });

    // Follow the path from trigger to find position
    let currentId = triggerNode.id;
    let position = 1;

    while (currentId) {
      const nextId = connections.get(currentId);
      if (!nextId) break;
      position++;
      if (nextId === nodeId) return position;
      currentId = nextId;
    }

    return 0;
  }, [getEdges, getNodes]);

  useEffect(() => {
    if (selectedNode && selectedNodeRef.current) {
      selectedNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedNode]);

  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      // First clear the selection
      onNodeSelect('');
      // Then delete the node
      deleteElements({
        nodes: [selectedNode],
        edges: []
      });
      // Update local nodes immediately
      const updatedNodes = getNodes().filter(node => node.id !== selectedNode.id);
      setLocalNodes(updatedNodes);
    }
  }, [selectedNode, deleteElements, onNodeSelect, getNodes]);

  const renderInput = (key: string, input: NodeInput, nodeId: string) => {
    // Ensure we always have a valid value by providing empty string as fallback
    const currentValue = selectedNode?.data.inputValues?.[key] ?? input.default ?? '';
    return (
      <ControlledInput
        type={input.type}
        initialValue={currentValue}
        onSave={handleInputChange}
        nodeId={nodeId}
        inputKey={key}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-none p-6 border-b bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Properties</h2>
            <p className="text-sm text-muted-foreground truncate">
              Configure selected node
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 font-mono text-xs">
            {nodes.length} Nodes
          </Badge>
        </div>
      </div>

      {/* Node Selection List - 50% Height */}
      <div className="flex-1 min-h-0 border-b bg-background/80 backdrop-blur-xl">
        <div className="h-full flex flex-col">
          <div className="flex-none py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Flow Nodes</h3>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {nodes.length}
              </Badge>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-4 py-2 space-y-2">
              {nodes
                .map((node) => ({
                  node,
                  order: getNodeOrder(node.id)
                }))
                .sort((a, b) => a.order - b.order)
                .map(({ node, order }) => (
                  <div
                    key={node.id}
                    ref={selectedNode?.id === node.id ? selectedNodeRef : null}
                    onClick={() => onNodeSelect(node.id)}
                    className={cn(
                      "group flex items-center bg-card/50 hover:bg-accent rounded-md px-3 py-2 cursor-pointer transition-colors border border-border/50",
                      selectedNode?.id === node.id && "ring-1 ring-primary bg-accent"
                    )}
                  >
                    <div className="shrink-0 mr-2">
                      <div className={cn(
                        "p-1.5 rounded-md",
                        node.type === NODE_TYPES.trigger ? "bg-primary" : "bg-primary/10"
                      )}>
                        {node.type === NODE_TYPES.trigger ? (
                          <Zap className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <Boxes className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {node.data.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {node.type === NODE_TYPES.trigger ? 'Trigger' : node.data.kind}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] font-medium ml-2">
                      #{order}
                    </Badge>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Properties Content - 50% Height */}
      <div className="flex-1 min-h-0 bg-background/80 backdrop-blur-xl">
        <div className="h-full flex flex-col">
          <div className="flex-none px-6 py-2.5 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Node Properties</h3>
              {selectedNode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={handleDeleteNode}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {selectedNode ? (
                <>
                  {selectedNode.type === NODE_TYPES.action && selectedNode.data.inputs && 
                   Object.keys(selectedNode.data.inputs).length > 0 ? (
                    <div className="space-y-6">
                      {/* Regular Inputs */}
                      {Object.entries(selectedNode.data.inputs)
                        .filter(([, input]) => !input.isAdvanced)
                        .map(([key, input]) => (
                          <div key={key}>
                            <div className="flex items-baseline justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <label className="text-sm font-medium text-foreground" htmlFor={key}>
                                  {input.name}
                                  {input.required && <span className="text-destructive">*</span>}
                                </label>
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1 rounded">
                                  {input.type}
                                </span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{input.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            {renderInput(key, input, selectedNode.id)}
                          </div>
                        ))}

                      {/* Advanced Inputs */}
                      {Object.entries(selectedNode.data.inputs).some(([, input]) => input.isAdvanced) && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="advanced-options">
                            <AccordionTrigger className="text-sm font-medium">
                              Advanced Options
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-6 pt-4">
                                {Object.entries(selectedNode.data.inputs)
                                  .filter(([, input]) => input.isAdvanced)
                                  .map(([key, input]) => (
                                    <div key={key}>
                                      <div className="flex items-baseline justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <label className="text-sm font-medium text-foreground" htmlFor={key}>
                                            {input.name}
                                            {input.required && <span className="text-destructive">*</span>}
                                          </label>
                                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1 rounded">
                                            {input.type}
                                          </span>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="text-xs">{input.description}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                      </div>
                                      {renderInput(key, input, selectedNode.id)}
                                    </div>
                                  ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-sm text-muted-foreground">
                      {selectedNode.type === NODE_TYPES.trigger 
                        ? 'Trigger nodes have no configurable properties'
                        : 'This action has no configurable inputs'}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-3 text-center text-sm text-muted-foreground">
                  Select a node to view its properties
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
} 