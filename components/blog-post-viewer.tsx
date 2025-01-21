"use client";

import { useTheme } from "next-themes";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from "next/dynamic";
import { SendIcon, SaveIcon, EyeIcon, EyeOffIcon, PencilIcon, XCircleIcon, CheckCircleIcon, Settings2Icon, TrashIcon, AlertCircleIcon, ChevronDownIcon } from "lucide-react";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { type BlogPost } from "@/lib/supabase/types";
import { Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlogPostStore } from '@/lib/flow/store';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full border rounded-lg bg-background p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }
);

interface BlogPostViewerProps {
  blogPost: BlogPost;
}

export function BlogPostViewer({ blogPost }: BlogPostViewerProps) {
  const { resolvedTheme } = useTheme();
  const [showPreview, setShowPreview] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [localMarkdown, setLocalMarkdown] = useState(blogPost.markdown || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(blogPost.status || "draft");
  
  // Refs for scroll containers
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const {
    blogPost: currentBlogPost,
    isProcessing,
    isSaving,
    hasNewAIRecommendations,
    updateBlogPost,
    setSaving,
    setHasNewAIRecommendations,
    initializeRealtime,
  } = useBlogPostStore();

  // Initialize real-time subscription and update store
  useEffect(() => {
    if (!blogPost?.id) return;
    updateBlogPost(blogPost);
    const cleanup = initializeRealtime(blogPost.id.toString());
    
    // Set loading to false after a short delay to allow data to be fetched
    const timer = setTimeout(() => setIsLoading(false), 500);
    
    return () => {
      cleanup();
      clearTimeout(timer);
    };
  }, [blogPost?.id]);

  // Update local markdown when currentBlogPost changes
  useEffect(() => {
    if (!currentBlogPost?.markdown || isSaving) return;
    setLocalMarkdown(currentBlogPost.markdown);
  }, [currentBlogPost?.markdown, isSaving]);

  // Effect to check for AI recommendations on initial load and updates
  useEffect(() => {
    const currentStatus = currentBlogPost?.status || "draft";
    
    if (currentBlogPost?.markdown_ai_revision && 
        !isProcessing && 
        currentStatus === "needs approval") {
      setHasNewAIRecommendations(true);
    } else {
      setHasNewAIRecommendations(false);
    }
    // Update previous status
    setPreviousStatus(currentStatus);
  }, [currentBlogPost?.markdown_ai_revision, currentBlogPost?.status, isProcessing, previousStatus]);

  // Handle scroll position when switching modes
  const handleModeSwitch = (toPreview: boolean) => {
    // Save current scroll position
    const currentContainer = toPreview ? editorRef.current?.querySelector('.w-md-editor-text-input') : previewRef.current;
    if (currentContainer) {
      setScrollPosition(currentContainer.scrollTop);
    }

    // Switch mode
    setShowPreview(toPreview);

    // Restore scroll position after mode switch
    requestAnimationFrame(() => {
      if (toPreview) {
        const previewContainer = previewRef.current;
        if (previewContainer) {
          previewContainer.scrollTop = scrollPosition;
        }
      } else {
        const editorContainer = editorRef.current?.querySelector('.w-md-editor-text-input');
        if (editorContainer) {
          editorContainer.scrollTop = scrollPosition;
        }
      }
    });
  };

  // Action Handlers
  const handleSave = async () => {
    if (!currentBlogPost?.id || isProcessing) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/blog-posts/${currentBlogPost.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: localMarkdown }),
      });
      
      if (!response.ok) throw new Error('Failed to save changes');
      
      const result = await response.json();
      if (result.success) {
        // Only update local state, let realtime handle the rest
        toast.success('Changes saved');
      } else if (result.id) {
        updateBlogPost(result);
      }
    } catch (error) {
      console.error('Failed to save post:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!currentBlogPost?.id || isProcessing) return;
    
    setIsStatusChanging(true);
    try {
      const response = await fetch(
        `/api/blog-posts/${currentBlogPost.id}/${currentBlogPost.published ? 'make-draft' : 'publish'}`,
        { method: 'POST' }
      );
      
      if (!response.ok) throw new Error('Failed to update post status');
      
      // Let realtime handle the state update
      toast.success(currentBlogPost.published ? 'Moving to drafts...' : 'Publishing...');
    } catch (error) {
      console.error('Failed to toggle publish state:', error);
      toast.error('Failed to update post status');
    } finally {
      // Add a small delay before removing loading state to ensure smooth transition
      setTimeout(() => setIsStatusChanging(false), 500);
    }
  };

  const applyAIChanges = async () => {
    if (!currentBlogPost?.id || isProcessing) return;
    
    setIsApplyingChanges(true);
    
    try {
      const response = await fetch(`/api/blog-posts/${currentBlogPost.id}/approve`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to apply AI suggestions');
      
      const newText = currentBlogPost?.markdown_ai_revision || "";
      
      // Create a temporary div for the animation
      const editorElement = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
      if (editorElement) {
        editorElement.style.transition = 'opacity 0.3s ease';
        editorElement.style.opacity = '0';
        
        setTimeout(() => {
          setLocalMarkdown(newText);
          setHasNewAIRecommendations(false);
          
          requestAnimationFrame(() => {
            editorElement.style.opacity = '1';
            editorElement.style.backgroundColor = 'rgba(126, 231, 135, 0.1)';
            
            setTimeout(() => {
              editorElement.style.backgroundColor = 'transparent';
              setIsApplyingChanges(false);
              setShowAIRecommendations(false);
            }, 1000);
          });
        }, 300);
      } else {
        // Fallback if we can't find the editor
        setLocalMarkdown(newText);
        setHasNewAIRecommendations(false);
        setIsApplyingChanges(false);
        setShowAIRecommendations(false);
      }
      toast.success('AI suggestions applied');
    } catch (error) {
      console.error('Failed to apply AI suggestions:', error);
      toast.error('Failed to apply AI suggestions');
      setIsApplyingChanges(false);
    }
  };

  const handleRejectAIReview = async () => {
    if (!currentBlogPost?.id || isProcessing) return;
    
    setShowAIRecommendations(false);
    
    try {
      const response = await fetch(`/api/blog-posts/${currentBlogPost.id}/reject`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to reject AI suggestions');
      
      const result = await response.json();
      if (result.success) {
        setHasNewAIRecommendations(false);
        toast.success('AI suggestions rejected');
      }
    } catch (error) {
      console.error('Failed to reject AI suggestions:', error);
      toast.error('Failed to reject AI suggestions');
      setShowAIRecommendations(true); // Reopen dialog on error
    }
  };

  const handleUpdateMetadata = async () => {
    if (!currentBlogPost?.id || isProcessing) return;
    
    setIsUpdatingMetadata(true);
    try {
      const response = await fetch(`/api/blog-posts/${currentBlogPost.id}/update-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editTitle,
          subtitle: editSubtitle 
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update metadata');
      
      toast.success('Post details updated');
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to update metadata:', error);
      toast.error('Failed to update post details');
    } finally {
      setIsUpdatingMetadata(false);
    }
  };

  const handleDelete = async () => {
    if (!currentBlogPost?.id || isProcessing || !isConfirmingDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/blog-posts/${currentBlogPost.id}/delete`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete post');
      
      toast.success('Post deleted');
      // Redirect to posts list
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  // UI Components
  const StatusIndicator = () => {
    const getStatus = (): string => {
      // First try to use the prop directly, then fall back to store
      const post = currentBlogPost || blogPost;

      if (isProcessing) return "processing";
      
      if (post?.published) {
        return "published";
      }
      if (post?.status && post.status.trim() !== '') {
        return post.status;
      }
      return "draft";
    };

    const status = getStatus();

    if (isLoading) {
      return (
        <div className="flex items-center">
          <Skeleton className="h-4 w-[70px]" />
        </div>
      );
    }

    return (
      <StatusBadge 
        status={status} 
        size="default"
        showChevron={false}
        isLoading={isStatusChanging || isProcessing}
      />
    );
  };

  // Move getStatus outside of StatusIndicator so we can use it in the dropdown
  const getStatus = (): string => {
    // First try to use the prop directly, then fall back to store
    const post = currentBlogPost || blogPost;

    if (isProcessing) return "processing";
    
    if (post?.published) {
      return "published";
    }
    if (post?.status && post.status.trim() !== '') {
      return post.status;
    }
    return "draft";
  };

  const AIButton = () => {
    // Only show button when we have AI changes and status is "needs approval"
    if (!hasNewAIRecommendations || currentBlogPost?.status !== "needs approval") {
      return null;
    }
    
    return (
      <Button
        onClick={() => setShowAIRecommendations(true)}
        variant="default"
        className="relative pl-9 pr-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <span className="absolute left-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary-foreground/40 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-foreground" />
        </span>
        <span className="font-medium">View AI Suggestions</span>
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-[300px] mb-1" />
                <Skeleton className="h-5 w-[200px]" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold">{currentBlogPost?.title}</h1>
                <p className="text-muted-foreground">{currentBlogPost?.subtitle}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={isProcessing || isLoading}>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 px-3 gap-2 font-normal"
                >
                  <StatusIndicator />
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {getStatus() === "needs approval" ? (
                  <DropdownMenuItem 
                    onClick={() => setShowAIRecommendations(true)}
                    className="flex items-center gap-2 py-2.5"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Check AI Suggestions</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    onClick={handlePublishToggle}
                    className="flex items-center gap-2 py-2.5"
                  >
                    {currentBlogPost?.published ? (
                      <>
                        <PencilIcon className="h-4 w-4" />
                        <span>Move to Draft</span>
                      </>
                    ) : (
                      <>
                        <SendIcon className="h-4 w-4" />
                        <span>Publish</span>
                      </>
                    )}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditTitle(currentBlogPost?.title || "");
                setEditSubtitle(currentBlogPost?.subtitle || "");
                setShowSettings(true);
                setIsConfirmingDelete(false);
              }}
              disabled={isProcessing || isLoading}
              className="h-9 gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2Icon className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={(open) => {
        setShowSettings(open);
        if (!open) {
          setIsConfirmingDelete(false);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Post Settings</DialogTitle>
            <DialogDescription>
              Update your blog post details or manage the post
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter post title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="Enter post subtitle"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium leading-none text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Permanently delete this post and all of its contents.
                  </p>
                </div>
                {!isConfirmingDelete ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="border-destructive/50 hover:border-destructive hover:bg-destructive/10 hover:text-destructive text-destructive"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Post
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <AlertCircleIcon className="h-4 w-4" />
                        Confirm Delete
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSettings(false);
                setIsConfirmingDelete(false);
              }}
              disabled={isUpdatingMetadata}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMetadata}
              disabled={isUpdatingMetadata}
              className="gap-2"
            >
              {isUpdatingMetadata ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 p-6">
        <div className="h-full flex flex-col rounded-lg border bg-background overflow-hidden relative">
          {showPreview ? (
            <>
              <div ref={previewRef} className="absolute inset-0 overflow-y-auto pb-[68px]">
                <div className="prose dark:prose-invert max-w-none p-6">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {localMarkdown || ""}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between gap-2 p-4 bg-background/80 backdrop-blur-sm border-t">
                <div className="flex gap-2">
                  <AIButton />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleModeSwitch(false)}
                    variant="outline"
                    className="gap-2"
                  >
                    <EyeOffIcon className="h-4 w-4" />
                    Hide Preview
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    variant="outline" 
                    className="gap-2"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SaveIcon className="h-4 w-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div ref={editorRef} className="absolute inset-0 pb-[68px]">
                <MDEditor
                  value={localMarkdown}
                  onChange={(val) => setLocalMarkdown(val || "")}
                  preview="edit"
                  className={cn(
                    "w-full !bg-background !border-0 [&_.w-md-editor-text]:!text-foreground [&_.w-md-editor-text-pre]:!text-foreground [&_.w-md-editor-text-pre>code]:!text-foreground [&_.w-md-editor-preview]:!text-foreground [&_[data-role='h1']]:!text-foreground [&_[data-role='h2']]:!text-foreground [&_[data-role='h3']]:!text-foreground [&_[data-role='h4']]:!text-foreground [&_[data-role='h5']]:!text-foreground [&_[data-role='h6']]:!text-foreground [&_.wmde-markdown-color]:!text-foreground [&_.wmde-markdown]:!text-foreground [&_.wmde-markdown-var]:!text-foreground dark:[&_.w-md-editor-text]:!text-foreground dark:[&_.w-md-editor-preview]:!text-foreground",
                    "transition-all duration-500"
                  )}
                  visibleDragbar={false}
                  hideToolbar={false}
                  enableScroll={true}
                  height="100%"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    height: '100%',
                    color: 'inherit'
                  }}
                  textareaProps={{
                    style: {
                      backgroundColor: 'transparent',
                      padding: '1rem',
                      color: 'inherit'
                    }
                  }}
                  previewOptions={{
                    style: {
                      color: 'inherit',
                      backgroundColor: 'transparent'
                    }
                  }}
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between gap-2 p-4 bg-background/80 backdrop-blur-sm border-t">
                <div className="flex gap-2">
                  <AIButton />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleModeSwitch(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <EyeIcon className="h-4 w-4" />
                    Show Preview
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    variant="outline" 
                    className="gap-2"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SaveIcon className="h-4 w-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Recommendations Dialog */}
      <Dialog 
        open={showAIRecommendations && currentBlogPost?.status === "needs approval"} 
        onOpenChange={(open) => {
          // Only allow opening if status is "needs approval"
          if (open && currentBlogPost?.status !== "needs approval") return;
          setShowAIRecommendations(open);
        }}
      >
        <DialogContent className="max-w-[90vw] w-[1200px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">AI Recommendations</DialogTitle>
            <DialogDescription>
              Review and apply the AI-suggested changes to your content
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 mt-4 relative">
            {isApplyingChanges ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-2">
                    <div className="w-full h-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-primary/20" />
                  </div>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">Applying AI Changes</p>
                  <p className="text-sm text-muted-foreground">Please wait while we update your content...</p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 overflow-auto">
                <ReactDiffViewer
                  oldValue={localMarkdown || ""}
                  newValue={currentBlogPost?.markdown_ai_revision || ""}
                  splitView={false}
                  hideLineNumbers
                  showDiffOnly={false}
                  leftTitle="Changes suggested by AI"
                  disableWordDiff={false}
                  useDarkTheme={resolvedTheme === "dark"}
                  styles={{
                    variables: {
                      dark: {
                        diffViewerBackground: "transparent",
                        diffViewerColor: "hsl(var(--foreground))",
                        addedBackground: "#1b3329",
                        addedColor: "#7ee787",
                        removedBackground: "#311c1c",
                        removedColor: "#ffa198",
                        wordAddedBackground: "#2b553b",
                        wordRemovedBackground: "#5d2121",
                        addedGutterBackground: "#1b3329",
                        removedGutterBackground: "#311c1c",
                        gutterBackground: "transparent",
                        gutterBackgroundDark: "transparent",
                        codeFoldBackground: "transparent",
                        emptyLineBackground: "transparent",
                        gutterColor: "hsl(var(--muted-foreground))",
                        addedGutterColor: "#7ee787",
                        removedGutterColor: "#ffa198",
                        codeFoldContentColor: "hsl(var(--muted-foreground))",
                        diffViewerTitleBackground: "transparent",
                        diffViewerTitleColor: "hsl(var(--foreground))",
                        diffViewerTitleBorderColor: "hsl(var(--border))",
                      },
                      light: {
                        diffViewerBackground: "transparent",
                        diffViewerColor: "hsl(var(--foreground))",
                        addedBackground: "#e6ffec",
                        addedColor: "#1a7f37",
                        removedBackground: "#ffebe9",
                        removedColor: "#cf222e",
                        wordAddedBackground: "#ccffd8",
                        wordRemovedBackground: "#ffd7d5",
                        addedGutterBackground: "#e6ffec",
                        removedGutterBackground: "#ffebe9",
                        gutterBackground: "transparent",
                        gutterBackgroundDark: "transparent",
                        codeFoldBackground: "transparent",
                        emptyLineBackground: "transparent",
                        gutterColor: "hsl(var(--muted-foreground))",
                        addedGutterColor: "#1a7f37",
                        removedGutterColor: "#cf222e",
                        codeFoldContentColor: "hsl(var(--muted-foreground))",
                        diffViewerTitleBackground: "transparent",
                        diffViewerTitleColor: "hsl(var(--foreground))",
                        diffViewerTitleBorderColor: "hsl(var(--border))",
                      },
                    },
                    contentText: {
                      fontFamily: "var(--font-geist-mono)",
                      fontSize: "0.9rem",
                    },
                    titleBlock: {
                      padding: "1rem",
                      borderBottom: "1px solid hsl(var(--border))",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    },
                    line: {
                      padding: "0.25rem 0.75rem",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    },
                  }}
                  compareMethod={DiffMethod.WORDS_WITH_SPACE}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button
              onClick={handleRejectAIReview}
              variant="outline"
              className="gap-2"
              disabled={isProcessing || isApplyingChanges}
            >
              <XCircleIcon className="h-4 w-4" />
              Reject Changes
            </Button>
            <Button
              onClick={applyAIChanges}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={isProcessing || isApplyingChanges}
            >
              {isApplyingChanges ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying Changes...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  Apply Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 