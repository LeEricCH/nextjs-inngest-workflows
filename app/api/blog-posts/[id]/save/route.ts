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
        markdown,
        status: "processing",
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) throw error;

    // Trigger the blog-post.updated workflow
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
    console.error("Error saving post:", error);
    return NextResponse.json(
      { error: "Failed to save post" },
      { status: 500 }
    );
  }
} 