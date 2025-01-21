import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from("blog_posts")
      .update({
        published: false,
        published_at: null,
        status: "draft",
      })
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error making blog post draft:", error);
    return NextResponse.json({ error: "Error making blog post draft" }, { status: 500 });
  }
} 