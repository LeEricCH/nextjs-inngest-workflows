import { createClient } from "../supabase/server";
import { type WorkflowData } from "../supabase/types";

export async function loadWorkflow(event: { name: string }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("workflows")
    .select("*", {})
    .eq("trigger", event.name)
    .eq("enabled", true)
    .single();

  if (!data?.workflow) return null;

  const workflowData = data.workflow as WorkflowData;
  
  // Create a map of node IDs to action kinds and input values
  const nodeToKind = new Map(
    workflowData.actions.map(action => [action.id, action.kind])
  );
  const nodeToInputValues = new Map(
    workflowData.actions.map(action => [action.kind, action.inputValues || {}])
  );
  
  // Convert our workflow format to engine format
  const engineWorkflow = {
    // Keep the actions in the same order as defined in the workflow
    actions: workflowData.actions.map(action => ({
      id: action.kind, // Use action kind as ID
      name: action.name,
      kind: action.kind,
      inputValues: action.inputValues || {}, // Include input values
    })),
    // Normalize edges to use action kinds
    edges: workflowData.edges.map(edge => ({
      from: edge.from === 'trigger' ? '$source' : nodeToKind.get(edge.from) || edge.from,
      to: nodeToKind.get(edge.to) || edge.to,
    })),
  };

  console.log("Running workflow:", {
    trigger: event.name,
    actions: engineWorkflow.actions.map(a => ({ kind: a.kind, inputValues: a.inputValues })),
    edges: engineWorkflow.edges
  });
  
  return engineWorkflow;
}
