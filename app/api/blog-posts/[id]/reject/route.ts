import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // Update the post to clear AI suggestions
  await supabase
    .from("blog_posts")
    .update({
      markdown_ai_revision: null,
      status: "draft", // Set back to draft instead of published
    })
    .eq("id", params.id)
    .select("*");

  // Send rejection event to cancel current workflow
  await inngest.send({
    name: "blog-post.reject-ai-suggestions",
    data: {
      id: params.id
    }
  });

  return NextResponse.json({ success: true });
} 