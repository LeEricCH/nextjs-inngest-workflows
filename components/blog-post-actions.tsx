"use client";

import { Button } from "@/components/ui/button";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface BlogPostActionsProps {
  id: string;
  onApprove?: () => void;
}

export function BlogPostActions({ id, onApprove }: BlogPostActionsProps) {
  const handleReject = async () => {
    try {
      const response = await fetch(`/api/blog-posts/${id}/reject`, {
        method: 'POST',
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to reject post:', error);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="gap-2"
        onClick={handleReject}
      >
        <XCircleIcon className="h-5 w-5" />
        Publish Original
      </Button>
      <Button
        size="lg"
        className="gap-2"
        onClick={onApprove}
      >
        <CheckCircleIcon className="h-5 w-5" />
        Approve & Publish
      </Button>
    </>
  );
}
