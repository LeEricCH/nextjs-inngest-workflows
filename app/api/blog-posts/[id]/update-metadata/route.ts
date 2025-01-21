import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { title, subtitle } = await request.json();
    const supabase = createClient();
    
    const { error } = await supabase
      .from("blog_posts")
      .update({ 
        title,
        subtitle,
      })
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating blog post metadata:", error);
    return NextResponse.json(
      { error: "Failed to update blog post metadata" },
      { status: 500 }
    );
  }
} 