"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { 
  CalendarIcon, RocketIcon, PlusIcon,
  FileTextIcon, ClockIcon, CheckCircleIcon, 
  MessageCircleIcon, Loader2Icon
} from "lucide-react";
import { type BlogPost } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetcher, cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type StatusType = "all" | "draft" | "needs approval" | "under review" | "published" | "processing";

const StatsCard = ({ 
  icon: Icon,
  label,
  count,
  color,
  isSelected,
  onClick
}: { 
  icon: LucideIcon;
  label: string;
  count: number;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button 
    onClick={onClick}
    className={cn(
      "group relative overflow-hidden rounded-xl p-6 text-left transition-all hover:shadow-md",
      isSelected 
        ? `bg-${color}-100 dark:bg-${color}-900/20 ring-1 ring-${color}-500/30` 
        : "bg-white hover:bg-gray-50 dark:bg-muted dark:hover:bg-muted/80",
    )}
  >
    <div className={cn(
      "absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 transform",
      `text-${color}-100 dark:text-${color}-900/20`
    )}>
      <Icon className="h-24 w-24" />
    </div>
    <div className="space-y-2">
      <div className={cn(
        "flex items-center gap-2 text-sm font-medium",
        `text-${color}-600 dark:text-${color}-400`
      )}>
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={cn(
        "text-3xl font-bold",
        `text-${color}-600 dark:text-${color}-300`
      )}>
        {count}
      </div>
    </div>
  </button>
);

const StatsCardSkeleton = () => (
  <div className="rounded-xl p-6 bg-white dark:bg-muted">
    <div className="space-y-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-10 w-16" />
    </div>
  </div>
);

const BlogPostItemSkeleton = () => (
  <div className="py-8">
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className="flex justify-end gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  </div>
);

export const BlogPostList = () => {
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("all");
  
  const { data, isLoading } = useSWR<{ blogPosts: BlogPost[] }>(
    "/api/blog-posts",
    fetcher,
    {
      refreshInterval: (data) => {
        const hasActiveProcesses = data?.blogPosts?.some(
          post => post.status === "processing" || post.status === "needs approval"
        );
        return hasActiveProcesses ? 2000 : 30000;
      }
    }
  );

  const blogPosts = data?.blogPosts || [];
  
  const filteredPosts = useMemo(() => {
    return blogPosts.filter(post => selectedStatus === "all" || post.status === selectedStatus);
  }, [blogPosts, selectedStatus]);

  const stats = {
    needsApproval: blogPosts.filter(post => post.status === "needs approval").length,
    drafts: blogPosts.filter(post => post.status === "draft").length,
    underReview: blogPosts.filter(post => post.status === "under review").length,
    published: blogPosts.filter(post => post.status === "published").length
  };

  const handleStatusClick = (status: StatusType) => {
    setSelectedStatus(currentStatus => currentStatus === status ? "all" : status);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b">
        <div className="px-6 py-6">
          <div className="flex flex-col gap-8 max-w-[2000px] mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  Blog Posts
                </h1>
                <p className="text-muted-foreground text-lg">
                  {blogPosts.length} posts in total
                </p>
              </div>
              <Button size="lg" className="gap-2">
                <PlusIcon className="h-5 w-5" />
                Create New Post
              </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoading ? (
                <>
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                </>
              ) : (
                <>
                  <StatsCard
                    icon={FileTextIcon}
                    label="Drafts"
                    count={stats.drafts}
                    color="blue"
                    isSelected={selectedStatus === "draft"}
                    onClick={() => handleStatusClick("draft")}
                  />
                  <StatsCard
                    icon={ClockIcon}
                    label="Needs Review"
                    count={stats.needsApproval}
                    color="yellow"
                    isSelected={selectedStatus === "needs approval"}
                    onClick={() => handleStatusClick("needs approval")}
                  />
                  <StatsCard
                    icon={RocketIcon}
                    label="Under Review"
                    count={stats.underReview}
                    color="orange"
                    isSelected={selectedStatus === "under review"}
                    onClick={() => handleStatusClick("under review")}
                  />
                  <StatsCard
                    icon={CheckCircleIcon}
                    label="Published"
                    count={stats.published}
                    color="green"
                    isSelected={selectedStatus === "published"}
                    onClick={() => handleStatusClick("published")}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-6 py-8">
        <div className="max-w-[2000px] mx-auto">
          <div className="divide-y divide-border [&>*]:py-8">
            {isLoading ? (
              <>
                <BlogPostItemSkeleton />
                <BlogPostItemSkeleton />
                <BlogPostItemSkeleton />
              </>
            ) : (
              <>
                {filteredPosts.map((blogPost, index) => (
                  <BlogPostItem key={blogPost.id} blogPost={blogPost} index={index} />
                ))}
                {filteredPosts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground">No posts found matching your criteria</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BlogPostItem = ({ blogPost, index }: { blogPost: BlogPost; index: number }) => {
  const statusConfig = {
    draft: {
      icon: FileTextIcon,
      className: "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
      label: "Draft"
    },
    "needs approval": {
      icon: ClockIcon,
      className: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200",
      label: "Needs Review"
    },
    "under review": {
      icon: RocketIcon,
      className: "bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200",
      label: "Under Review"
    },
    "processing": {
      icon: Loader2Icon,
      className: "bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
      label: "Processing"
    },
    published: {
      icon: CheckCircleIcon,
      className: "bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-200",
      label: "Published"
    }
  };

  const defaultStatus = blogPost.published ? statusConfig.published : {
    icon: FileTextIcon,
    className: "bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-200",
    label: "Unknown Status"
  };

  const status = statusConfig[blogPost.status as keyof typeof statusConfig] || defaultStatus;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="group relative">
        <div className="absolute -inset-x-6 -inset-y-4 z-0 scale-95 bg-muted opacity-0 transition group-hover:scale-100 group-hover:opacity-100 sm:rounded-2xl" />
        <Link 
          href={`/blog-post/${blogPost.id}`}
          className="relative z-10 flex flex-col gap-4"
        >
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={status.className}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              {blogPost.ai_publishing_recommendations && (
                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 animate-ping" />
                  AI
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {blogPost.title}
            </h3>
            <p className="text-muted-foreground line-clamp-2 mt-1">
              {blogPost.subtitle}
            </p>
          </div>

          {/* Meta Info */}
          <div className="flex justify-end items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              <span>{new Date(blogPost.created_at!).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircleIcon className="h-4 w-4" />
              <span>0 comments</span>
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
};
