"use server";
import { inngest } from "@/lib/inngest/client";
import { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { type Workflow } from "@/lib/supabase/types";
import { revalidatePath } from "next/cache";

export const sendBlogPostToReview = async (id: string) => {
  const supabase = createClient();
  await supabase
    .from("blog_posts")
    .update({
      status: "under review",
      markdown_ai_revision: null,
    })
    .eq("id", id);

  // Load the workflow data
  const { data: workflow } = await supabase
    .from("workflows")
    .select("workflow")
    .eq("trigger", "blog-post.updated")
    .eq("enabled", true)
    .single();

  await inngest.send({
    name: "blog-post.updated",
    data: {
      id,
      workflow: workflow?.workflow || null
    },
  });
};

export const approveBlogPostAiSuggestions = async (id: string) => {
  await inngest.send({
    name: "blog-post.approve-ai-suggestions",
    data: {
      id,
    },
  });
};

export const publishBlogPost = async (id: string) => {
  const supabase = createClient();
  await supabase
    .from("blog_posts")
    .update({
      status: "published",
      markdown_ai_revision: null,
    })
    .eq("id", id);

  await inngest.send({
    name: "blog-post.published",
    data: {
      id,
    },
  });
};

export const updateWorkflow = async (workflow: Workflow) => {
  const supabase = createClient();
  await supabase
    .from("workflows")
    .update({
      name: workflow.name,
      description: workflow.description,
      workflow: workflow.workflow as unknown as Json,
    })
    .eq("id", workflow.id);
};

export const toggleWorkflow = async (workflowId: number, enabled: boolean) => {
  const supabase = createClient();
  await supabase
    .from("workflows")
    .update({
      enabled,
    })
    .eq("id", workflowId)
    .select("*");
};

export async function createWorkflow(workflow: Omit<Workflow, "id" | "created_at" | "updated_at">) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("workflows")
    .insert({
      name: workflow.name,
      description: workflow.description,
      trigger: workflow.trigger,
      enabled: workflow.enabled,
      workflow: workflow.workflow,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating workflow:", error);
    throw error;
  }

  revalidatePath("/automation");
  return data;
}

export async function deleteWorkflow(id: number) {
  const supabase = createClient();

  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting workflow:", error);
    throw error;
  }

  revalidatePath("/automation");
}
