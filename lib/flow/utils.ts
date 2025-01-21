import { Node, Edge, Connection } from 'reactflow';
import { nanoid } from 'nanoid';

import { type Workflow } from '@/lib/supabase/types';
import { actions } from '@/lib/inngest/workflowActions';

export const NODE_TYPES = {
  trigger: 'trigger',
  action: 'action',
} as const;

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 150;

export function createTriggerNode(trigger: string, position?: { x: number; y: number }): Node {
  return {
    id: 'trigger',
    type: NODE_TYPES.trigger,
    position: position || { x: 0, y: 0 },
    data: { name: trigger },
  };
}

export function createActionNode(
  action: typeof actions[0], 
  index: number,
  position?: { x: number; y: number }
): Node {
  return {
    id: nanoid(),
    type: NODE_TYPES.action,
    position: position || { x: 0, y: (index + 1) * NODE_HEIGHT },
    data: action,
  };
}

export function workflowToFlow(workflow: Workflow): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [createTriggerNode(workflow.trigger || '', workflow.workflow?.triggerPosition)];
  const edges: Edge[] = [];

  if (workflow.workflow?.actions) {
    // Create nodes first
    workflow.workflow.actions.forEach((action, index) => {
      const matchingAction = actions.find((a) => a.kind === action.kind);
      if (matchingAction) {
        // Convert input values to the correct type based on the input definition
        const inputValues: Record<string, string | number> = {};
        if (action.inputValues && matchingAction.inputs) {
          Object.entries(action.inputValues).forEach(([key, value]) => {
            const input = matchingAction.inputs?.[key];
            if (input?.type === 'boolean') {
              inputValues[key] = String(value);
            } else {
              inputValues[key] = value as string | number;
            }
          });
        }

        const node = createActionNode(
          {
            ...matchingAction,
            inputValues,
          },
          index,
          action.position
        );
        nodes.push(node);
      }
    });

    // Then create edges using action kinds
    if (workflow.workflow.edges) {
      workflow.workflow.edges.forEach((edge) => {
        if (edge.from && edge.to) {
          const targetNode = edge.to === 'trigger' ? nodes[0] : nodes.find(n => n.data.kind === edge.to);
          const sourceNode = edge.from === 'trigger' ? nodes[0] : nodes.find(n => n.data.kind === edge.from);
          
          if (targetNode && sourceNode) {
            edges.push({
              id: nanoid(),
              source: sourceNode.id,
              target: targetNode.id,
              type: 'smoothstep',
            });
          }
        }
      });
    }
  }

  return { nodes, edges };
}

export function hasDuplicateConnection(edges: Edge[], newEdge: Edge | Connection, nodes: Node[]): boolean {
  // First filter out any edges that reference non-existent nodes
  const validEdges = edges.filter(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    return sourceNode && targetNode;
  });

  // Check if source node already has an outgoing connection
  const hasOutgoingConnection = validEdges.some(edge => 
    edge.source === newEdge.source
  );

  // Check if target node already has an incoming connection
  const hasIncomingConnection = validEdges.some(edge => 
    edge.target === newEdge.target
  );

  return hasOutgoingConnection || hasIncomingConnection;
}

export function flowToWorkflow(nodes: Node[], edges: Edge[]) {
  const actionNodes = nodes.filter((node) => node.type === NODE_TYPES.action);
  const triggerNode = nodes.find(node => node.type === NODE_TYPES.trigger);
  
  return {
    actions: actionNodes.map((node) => {
      // Convert any boolean values to strings
      const values = node.data.inputValues || {};
      const inputValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          typeof value === 'boolean' ? (value ? 'true' : 'false') : value
        ])
      ) as Record<string, string | number>;

      return {
        id: node.id,
        kind: node.data.kind,
        name: node.data.name,
        description: node.data.description,
        position: node.position,
        inputs: node.data.inputs,
        inputValues,
      };
    }),
    edges: edges.map((edge) => ({
      from: edge.source === 'trigger' ? 'trigger' : nodes.find(n => n.id === edge.source)?.data.kind || edge.source,
      to: nodes.find(n => n.id === edge.target)?.data.kind || edge.target,
    })),
    triggerPosition: triggerNode?.position,
  };
}

export function isValidEndAction(nodes: Node[]): boolean {
  const lastNode = nodes[nodes.length - 1];
  return lastNode && ['apply_changes', 'wait_for_approval'].includes(lastNode.data.kind);
} 