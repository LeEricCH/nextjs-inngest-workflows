import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get the current blog post state
    const { data: blogPost } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!blogPost) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    // If there are AI changes, apply them
    if (blogPost.markdown_ai_revision) {
      await supabase
        .from("blog_posts")
        .update({
          markdown: blogPost.markdown_ai_revision,
          markdown_ai_revision: null,
          ai_publishing_recommendations: null,
          status: "draft"
        })
        .eq("id", params.id);
    }

    // Send approval event for any waiting workflow
    await inngest.send({
      name: "blog-post.approve-ai-suggestions",
      data: {
        id: params.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error approving post:", error);
    return NextResponse.json(
      { error: "Failed to approve post" },
      { status: 500 }
    );
  }
} 