import { Engine } from "@inngest/workflow-kit";

import { loadWorkflow } from "../loaders/workflow";
import { inngest } from "./client";
import { actionsWithHandlers } from "./workflowActionHandlers";

// Log available actions
console.log("Available action handlers:", actionsWithHandlers.map(a => a.kind));

const workflowEngine = new Engine({
  actions: actionsWithHandlers,
  loader: loadWorkflow,
});

export default inngest.createFunction(
  { 
    id: "blog-post-workflow",
    cancelOn: [{
      event: "blog-post.reject-ai-suggestions",
      if: "async.data.id == event.data.id",
      timeout: "1d"
    }],
  },
  // Triggers
  // - When a blog post is set to "review"
  // - When a blog post is published (for post-publish actions)
  [
    { event: "blog-post.updated" },
    { event: "blog-post.published" }
  ],
  async ({ event, step }) => {
    try {
      const workflow = await loadWorkflow(event);
      
      if (!workflow) {
        console.log("No workflow found for event:", event.name);
        return;
      }

      if (!workflow.actions || workflow.actions.length === 0) {
        console.log("Workflow has no actions");
        return;
      }
      await workflowEngine.run({ event, step, workflow });
    } catch (error: unknown) {
      console.error("Error running workflow:", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
);
