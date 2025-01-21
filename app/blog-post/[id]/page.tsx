import { notFound } from "next/navigation";
import { BlogPostViewer } from "@/components/blog-post-viewer";
import { loadBlogPost } from "@/lib/loaders/blog-post";

// Remove constant revalidation
// export const revalidate = 0;

// Use dynamic data fetching
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function BlogPost({ params }: { params: { id: string } }) {
  const blogPost = await loadBlogPost(params.id);

  if (!blogPost) {
    return notFound();
  }

  return <BlogPostViewer blogPost={blogPost} />;
}
