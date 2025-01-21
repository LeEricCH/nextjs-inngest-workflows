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

type StatsCardProps = { 
  icon: LucideIcon;
  label: string;
  count: number;
  color: string;
};

const StatsCard = ({ 
  icon: Icon,
  label,
  count,
  color
}: StatsCardProps) => (
  <div 
    className={cn(
      "relative overflow-hidden rounded-xl bg-card border transition-all duration-200",
      "hover:shadow-md hover:-translate-y-0.5"
    )}
  >
    <div className="flex items-center gap-4 p-6">
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
        color === "blue" && "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        color === "yellow" && "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
        color === "orange" && "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
        color === "green" && "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
      )}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold tracking-tight">
          {count}
        </p>
      </div>
    </div>
  </div>
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
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b shadow-sm">
        <div className="px-8 py-8">
          <div className="flex flex-col gap-10 max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">
                  Blog Posts
                </h1>
                <p className="text-muted-foreground text-lg">
                  {blogPosts.length} posts in total
                </p>
              </div>
              <Button size="lg" className="gap-2 shadow-sm">
                <PlusIcon className="h-5 w-5" />
                Create New Post
              </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
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
                  />
                  <StatsCard
                    icon={ClockIcon}
                    label="Needs Review"
                    count={stats.needsApproval}
                    color="yellow"
                  />
                  <StatsCard
                    icon={RocketIcon}
                    label="Under Review"
                    count={stats.underReview}
                    color="orange"
                  />
                  <StatsCard
                    icon={CheckCircleIcon}
                    label="Published"
                    count={stats.published}
                    color="green"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-8 py-10">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {isLoading ? (
              <>
                <BlogPostItemSkeleton />
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
                  <div className="text-center py-16 col-span-2">
                    <div className="text-muted-foreground text-lg">No posts found matching your criteria</div>
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
      className="h-full group"
    >
      <Link 
        href={`/blog-post/${blogPost.id}`}
        className="block h-full"
      >
        <div className="relative h-full bg-card rounded-xl border transition-all duration-200 
          hover:shadow-lg hover:-translate-y-0.5 group-hover:border-primary/20">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 transition-opacity 
            group-hover:opacity-5 dark:group-hover:opacity-10"
            style={{
              backgroundImage: `linear-gradient(to right, ${
                blogPost.status === "published" ? '#22c55e' : 
                blogPost.status === "needs approval" ? '#eab308' : 
                blogPost.status === "under review" ? '#f97316' : '#3b82f6'
              }, #3b82f6)`
            }}
          />
          
          {/* Main Content */}
          <div className="relative p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <Badge 
                className={cn(
                  status.className,
                  "px-3 py-1.5 text-sm font-medium transition-colors border",
                  blogPost.status === "published" && "group-hover:bg-green-100 dark:group-hover:bg-green-900/70",
                  blogPost.status === "needs approval" && "group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/70",
                  blogPost.status === "under review" && "group-hover:bg-orange-100 dark:group-hover:bg-orange-900/70",
                  blogPost.status === "draft" && "group-hover:bg-blue-100 dark:group-hover:bg-blue-900/70",
                  blogPost.status === "processing" && "group-hover:bg-purple-100 dark:group-hover:bg-purple-900/70"
                )}
              >
                <StatusIcon className="w-3.5 h-3.5 mr-2" />
                {status.label}
              </Badge>
              {blogPost.ai_publishing_recommendations && (
                <Badge 
                  className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 
                    border-blue-200 px-3 py-1.5 text-sm font-medium transition-colors
                    group-hover:bg-blue-100 dark:group-hover:bg-blue-900/70"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-ping" />
                  AI
                </Badge>
              )}
            </div>

            <div className="flex-grow">
              <h3 className="text-xl font-semibold text-foreground transition-colors mb-3 group-hover:text-primary">
                {blogPost.title}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-2 mb-6">
                {blogPost.subtitle}
              </p>
            </div>

            {/* Meta Info */}
            <div className="border-t pt-4">
              <div className="flex justify-end items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{new Date(blogPost.created_at!).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircleIcon className="h-4 w-4" />
                  <span>0 comments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
