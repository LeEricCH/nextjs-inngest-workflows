import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { markdown } = await request.json();
    const supabase = createClient();
    
    const { error } = await supabase
      .from("blog_posts")
      .update({ 
        status: "processing",
        markdown,
        markdown_ai_revision: null // Clear any previous AI revisions
      })
      .eq("id", params.id);

    if (error) throw error;

    // Trigger the Inngest workflow
    await inngest.send({
      name: "blog-post.updated",
      data: {
        id: params.id,
        status: "processing",
        markdown
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending post to review:", error);
    return NextResponse.json(
      { error: "Failed to send post to review" },
      { status: 500 }
    );
  }
} 