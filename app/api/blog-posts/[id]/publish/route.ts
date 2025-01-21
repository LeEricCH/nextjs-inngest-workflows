import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from("blog_posts")
      .update({
        published: true,
        published_at: new Date().toISOString()
      })
      .eq("id", params.id);

    if (error) throw error;

    // Trigger the blog-post.published workflow
    await inngest.send({
      name: "blog-post.published",
      data: {
        blogPostId: parseInt(params.id),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error publishing blog post:", error);
    return NextResponse.json({ error: "Error publishing blog post" }, { status: 500 });
  }
} 