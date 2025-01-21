"use client";
import { ReactFlow, Background, Controls, ReactFlowProvider, Panel, useReactFlow, Node, NodeMouseHandler, Connection, OnConnectStartParams, XYPosition, NodeChange, useOnSelectionChange, SelectionMode, ConnectionMode } from 'reactflow';
import { SaveIcon, TrashIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { nanoid } from 'nanoid';
import { cn } from "@/lib/utils";

import { type Workflow } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { updateWorkflow, deleteWorkflow } from "@/app/actions";
import { useFlowStore } from "@/lib/flow/store";
import ActionNode from "@/lib/flow/nodes/ActionNode";
import TriggerNode from "@/lib/flow/nodes/TriggerNode";
import { NODE_TYPES, hasDuplicateConnection } from "@/lib/flow/utils";
import { SidebarWrapper } from "@/lib/flow/components/SidebarWrapper";
import { type WorkflowAction } from "@/lib/inngest/workflowActions";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2Icon } from "lucide-react";

import 'reactflow/dist/style.css';
import "@/styles/workflow-theme.css";
import { ActionSelectionPopover } from '@/lib/flow/components/ActionSelectionPopover';

// Node types for ReactFlow
const nodeTypes = {
  [NODE_TYPES.action]: ActionNode,
  [NODE_TYPES.trigger]: TriggerNode,
};

function Flow({ workflow }: { workflow: Workflow }) {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<{ openSettings: () => void }>(null);
  const [workflowDraft, updateWorkflowDraft] = useState<typeof workflow>(workflow);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectStart, setConnectStart] = useState<OnConnectStartParams | null>(null);
  const [connectEnd, setConnectEnd] = useState<XYPosition | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const [copiedNodesOriginalPositions, setCopiedNodesOriginalPositions] = useState<{ x: number, y: number }[]>([]);
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  const [isMouseOverFlow, setIsMouseOverFlow] = useState(false);

  const { addNodes, project, getNode, getViewport, setViewport } = useReactFlow();
  
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect: originalOnConnect,
    updateFromWorkflow,
    updateWorkflowMeta,
    getWorkflowData,
    workflowMeta,
  } = useFlowStore();

  // Get the selected node
  const selectedNode = selectedNodeId ? getNode(selectedNodeId) as Node<WorkflowAction> | null : null;

  // Handle selection changes
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      // Filter out trigger nodes from selection
      const filteredNodes = selectedNodes.filter(node => node.type !== NODE_TYPES.trigger);
      
      // Update our selection state
      setSelectedNodes(filteredNodes);
      if (filteredNodes.length === 1) {
        setSelectedNodeId(filteredNodes[0].id);
      } else if (filteredNodes.length === 0) {
        setSelectedNodeId(null);
      }

      // Force update ReactFlow's selection state to match our filtered selection
      const changes: NodeChange[] = nodes.map(node => ({
        type: 'select',
        id: node.id,
        selected: filteredNodes.some(n => n.id === node.id)
      }));
      onNodesChange(changes);
    },
  });

  // Handle node selection from click
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    // Prevent trigger node selection
    if (node.type === NODE_TYPES.trigger) {
      return;
    }
    
    // Handle multi-selection with CTRL/CMD key
    if (event.ctrlKey || event.metaKey) {
      const isSelected = selectedNodes.some(n => n.id === node.id);
      let newSelectedNodes;
      
      if (isSelected) {
        // If already selected, remove it from selection
        newSelectedNodes = selectedNodes.filter(n => n.id !== node.id);
      } else {
        // If not selected, add it to selection
        newSelectedNodes = [...selectedNodes, node];
      }
      
      setSelectedNodes(newSelectedNodes);
      setSelectedNodeId(newSelectedNodes.length === 1 ? newSelectedNodes[0].id : null);

      // Update ReactFlow's selection state
      const changes: NodeChange[] = nodes.map(n => ({
        type: 'select',
        id: n.id,
        selected: newSelectedNodes.some(sn => sn.id === n.id)
      }));
      onNodesChange(changes);
    } else {
      // Single selection without CTRL/CMD
      const newSelectedNodes = [node];
      setSelectedNodes(newSelectedNodes);
      setSelectedNodeId(node.id);

      // Update ReactFlow's selection state
      const changes: NodeChange[] = nodes.map(n => ({
        type: 'select',
        id: n.id,
        selected: n.id === node.id
      }));
      onNodesChange(changes);
    }
  }, [selectedNodes, nodes, onNodesChange]);

  // Handle node selection from properties sidebar
  const onNodeSelect = useCallback((nodeId: string) => {
    const node = getNode(nodeId);
    if (!node) return;

    // Allow trigger node to be viewed but not selected in ReactFlow
    setSelectedNodeId(nodeId);
    if (node.type !== NODE_TYPES.trigger) {
      setSelectedNodes([node]);
      const changes: NodeChange[] = nodes.map(n => ({
        type: 'select',
        id: n.id,
        selected: n.id === nodeId
      }));
      onNodesChange(changes);
    } else {
      setSelectedNodes([]);
      const changes: NodeChange[] = nodes.map(n => ({
        type: 'select',
        id: n.id,
        selected: false
      }));
      onNodesChange(changes);
    }

    // Pan to the selected node
    const viewport = getViewport();
    const minZoom = 1;
    const targetZoom = Math.max(viewport.zoom, minZoom);
    
    // Calculate the center position, accounting for the sidebar width (400px) and node dimensions
    const sidebarWidth = 400;
    const nodeWidth = 300; // Width of our nodes
    const nodeHeight = 150; // Height of our nodes
    const availableWidth = window.innerWidth - sidebarWidth;
    
    setViewport(
      { 
        x: -(node.position.x + nodeWidth / 2) * targetZoom + availableWidth / 2,
        y: -(node.position.y + nodeHeight / 2) * targetZoom + window.innerHeight / 2,
        zoom: targetZoom
      },
      { duration: 800 }
    );
  }, [getNode, getViewport, setViewport, nodes, onNodesChange]);

  // Clear selection when clicking canvas
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodes([]);
  }, []);

  // Initialize flow when component mounts
  useEffect(() => {
    updateFromWorkflow(workflow);
  }, [workflow, updateFromWorkflow]);

  const handleWorkflowUpdate = useCallback((updatedWorkflow: Workflow) => {
    updateWorkflowDraft(updatedWorkflow);
    updateWorkflowMeta({
      name: updatedWorkflow.name,
      description: updatedWorkflow.description
    });
  }, [updateWorkflowMeta]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const actionData = event.dataTransfer.getData('application/reactflow');
      
      try {
        const action = JSON.parse(actionData) as WorkflowAction;
        const position = project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        // Initialize input values with defaults
        const inputValues: Record<string, string | number> = {};
        if (action.inputs) {
          Object.entries(action.inputs).forEach(([key, input]) => {
            if (input.default !== undefined) {
              if (input.type === 'boolean') {
                inputValues[key] = String(input.default);
              } else if (input.type === 'number') {
                inputValues[key] = Number(input.default) || 0;
              } else {
                inputValues[key] = String(input.default || '');
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
      } catch (err) {
        console.error('Failed to add node:', err);
      }
    },
    [addNodes, project]
  );

  const onSaveWorkflow = async () => {
    try {
      setIsSaving(true);
      const workflowData = getWorkflowData();
      await updateWorkflow({
        ...workflowDraft,
        name: workflowMeta.name || workflowDraft.name,
        description: workflowMeta.description || workflowDraft.description,
        workflow: workflowData
      });
      toast.success("Workflow saved successfully");
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteWorkflow(workflowDraft.id);
      router.push("/automation");
    } catch (error) {
      toast.error("Failed to delete workflow");
      console.error("Failed to delete workflow:", error);
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const onConnectStart = useCallback((event: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
    setConnectStart(params);
  }, []);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      const targetIsNode = (event.target as Element).closest('.react-flow__node');
      
      if (!targetIsNode && connectStart?.nodeId) {
        // If we're not dropping on a node, show the action selection popover
        setConnectEnd({
          x: event.clientX,
          y: event.clientY
        });
      } else {
        // Reset connection state if dropping on a node or no valid connection
        setConnectStart(null);
        setConnectEnd(null);
      }
    }
  }, [connectStart]);

  const onPopoverClose = useCallback(() => {
    setConnectStart(null);
    setConnectEnd(null);
  }, []);

  // Wrap onConnect to check for duplicates
  const onConnect = useCallback((connection: Connection) => {
    if (hasDuplicateConnection(edges, connection, nodes)) {
      toast.error("Each node can only have one connection");
      return;
    }
    originalOnConnect(connection);
  }, [edges, nodes, originalOnConnect]);

  // Handle node deletion
  const handleDeleteSelected = useCallback(() => {
    if (selectedNodes.length === 0) return;
    
    const changes: NodeChange[] = selectedNodes.map(node => ({
      type: 'remove',
      id: node.id,
    }));
    onNodesChange(changes);
  }, [selectedNodes, onNodesChange]);

  // Add mouse position tracking
  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      setMousePosition(position);
    }
  }, [project]);

  // Add mouse enter/leave handlers
  const onMouseEnter = useCallback(() => {
    setIsMouseOverFlow(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsMouseOverFlow(false);
  }, []);

  // Update paste logic in onKeyDown
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts if we're in an input or textarea
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable) {
      return;
    }

    // Select all (except trigger node)
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      const changes: NodeChange[] = nodes.map(node => ({
        type: 'select',
        id: node.id,
        selected: node.type !== NODE_TYPES.trigger
      }));
      onNodesChange(changes);
    }

    // Copy
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      event.preventDefault();
      const nodesToCopy = selectedNodes.filter(node => node.type !== NODE_TYPES.trigger);
      if (nodesToCopy.length > 0) {
        setCopiedNodes(nodesToCopy);
        // Store original positions when copying
        setCopiedNodesOriginalPositions(nodesToCopy.map(node => ({ ...node.position })));
        toast.success(`Copied ${nodesToCopy.length} node${nodesToCopy.length > 1 ? 's' : ''}`);
      }
    }

    // Paste
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
      event.preventDefault();
      if (copiedNodes.length > 0 && copiedNodesOriginalPositions.length > 0) {
        // Calculate paste position
        let pastePosition = { x: 0, y: 0 };
        
        if (mousePosition && isMouseOverFlow) {
          // If mouse is in the flow, use its position
          pastePosition = mousePosition;
        } else {
          // Otherwise, offset from the original position
          pastePosition = {
            x: copiedNodesOriginalPositions[0].x + 50,
            y: copiedNodesOriginalPositions[0].y + 50
          };
        }

        // Calculate offset from first node's original position
        const offsetX = pastePosition.x - copiedNodesOriginalPositions[0].x;
        const offsetY = pastePosition.y - copiedNodesOriginalPositions[0].y;

        const newNodes = copiedNodes.map((node, index) => ({
          ...node,
          id: nanoid(),
          position: {
            x: copiedNodesOriginalPositions[index].x + offsetX,
            y: copiedNodesOriginalPositions[index].y + offsetY
          },
          selected: false,
          data: { ...node.data }
        }));
        
        addNodes(newNodes);
        toast.success(`Pasted ${newNodes.length} node${newNodes.length > 1 ? 's' : ''}`);
      }
    }

    // Delete
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      handleDeleteSelected();
    }
  }, [nodes, selectedNodes, copiedNodes, copiedNodesOriginalPositions, onNodesChange, addNodes, handleDeleteSelected, mousePosition, isMouseOverFlow]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b">
        <div className="px-6 py-6">
          <div className="flex flex-col gap-4 max-w-[2000px] mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  {workflowMeta.name || workflow.name}
                </h1>
                <p className="text-muted-foreground text-lg">
                  {workflowMeta.description || workflow.description}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2 font-medium",
                    workflowDraft.enabled ? "text-green-500 hover:text-green-600" : "text-red-500 hover:text-red-600"
                  )}
                  onClick={() => {
                    if (sidebarRef.current) {
                      sidebarRef.current.openSettings();
                    }
                  }}
                >
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    workflowDraft.enabled ? "bg-green-500" : "bg-red-500"
                  )} />
                  {workflowDraft.enabled ? "Active" : "Inactive"}
                </Button>
                <Button 
                  size="lg" 
                  onClick={onSaveWorkflow} 
                  disabled={isSaving}
                  className="gap-2"
                >
                  <SaveIcon className="h-5 w-5" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Section */}
      <div className="px-6 py-8">
        <div className="max-w-[2000px] mx-auto">
          <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="h-[calc(100vh-250px)] relative flex overflow-hidden" ref={reactFlowWrapper}>
              <div className="flex-1 min-w-0">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onConnectStart={onConnectStart}
                  onConnectEnd={onConnectEnd}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  nodeTypes={nodeTypes}
                  onNodeClick={onNodeClick}
                  onPaneClick={onPaneClick}
                  fitView
                  className="bg-muted/50"
                  multiSelectionKeyCode={["Control", "Meta"]}
                  selectionMode={SelectionMode.Full}
                  selectionKeyCode={null}
                  deleteKeyCode={null}
                  proOptions={{ hideAttribution: true }}
                  panOnDrag={true}
                  panOnScroll={false}
                  zoomOnScroll={true}
                  zoomOnPinch={true}
                  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                  minZoom={0.1}
                  maxZoom={4}
                  elementsSelectable={true}
                  nodesDraggable={true}
                  nodesConnectable={true}
                  connectOnClick={false}
                  connectionMode={ConnectionMode.Loose}
                  onMouseMove={onMouseMove}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  selectNodesOnDrag={false}
                  onSelectionDragStart={(event, nodes) => {
                    // Filter out trigger nodes from drag selection
                    const filteredNodes = nodes.filter(node => node.type !== NODE_TYPES.trigger);
                    setSelectedNodes(filteredNodes);
                    if (filteredNodes.length === 1) {
                      setSelectedNodeId(filteredNodes[0].id);
                    } else if (filteredNodes.length === 0) {
                      setSelectedNodeId(null);
                    }
                  }}
                >
                  <Background />
                  <Controls>
                  </Controls>
                  {/* <MiniMap
                    className="!bottom-2 !right-2"
                    nodeColor="#666"
                    maskColor="rgb(0, 0, 0, 0.1)"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '0.5rem',
                    }}
                    zoomable
                    pannable
                  /> */}
                  {/* Selection Bar */}
                  {selectedNodes.length > 0 && (
                    <Panel 
                      position="bottom-center" 
                      className="bg-background/80 backdrop-blur-sm p-3 rounded-lg border shadow-sm flex items-center gap-3 mb-4"
                    >
                      <span className="text-sm font-medium">
                        {selectedNodes.length} node{selectedNodes.length > 1 ? 's' : ''} selected
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                        className="h-8"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </Panel>
                  )}
                  <Panel position="top-right" className="bg-background/80 backdrop-blur-sm p-4 rounded-lg border shadow-sm">
                    <div className="text-sm font-medium">
                      {nodes.length - 1} Actions
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {edges.length} Connections
                    </div>
                  </Panel>
                  {connectStart && connectEnd && (
                    <ActionSelectionPopover
                      position={connectEnd}
                      sourceNodeId={connectStart.nodeId!}
                      onClose={onPopoverClose}
                    />
                  )}
                </ReactFlow>
              </div>
              <div className="w-[400px] flex-none">
                <SidebarWrapper
                  ref={sidebarRef}
                  selectedNode={selectedNode}
                  onNodeSelect={onNodeSelect}
                  workflow={workflowDraft}
                  onWorkflowUpdate={handleWorkflowUpdate}
                  nodes={nodes}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2Icon className="h-6 w-6" />
              Workflow Activated
            </DialogTitle>
            <DialogDescription>
              Your workflow is now active and will run automatically when triggered. You can monitor its execution in the workflow history.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AutomationEditor({ workflow }: { workflow: Workflow }) {
  return (
    <ReactFlowProvider>
      <Flow workflow={workflow} />
    </ReactFlowProvider>
  );
}
