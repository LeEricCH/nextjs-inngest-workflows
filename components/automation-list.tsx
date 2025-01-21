"use client";
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWR from "swr";
import Link from "next/link";
import { 
  PlusIcon, ZapIcon, 
  PowerIcon, PlayCircleIcon, PauseCircleIcon,
  Settings2Icon, ActivityIcon, FileTextIcon, RocketIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { type Workflow } from "@/lib/supabase/types";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { fetcher } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createWorkflow } from "@/app/actions";

type StatsCardProps = {
  icon: LucideIcon;
  label: string;
  count: number;
  color: string;
  isSelected?: boolean;
  onClick?: () => void;
};

const StatsCard = ({ 
  icon: Icon,
  label,
  count,
  color,
  isSelected,
  onClick
}: StatsCardProps) => (
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

const WorkflowItemSkeleton = () => (
  <div className="py-8">
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-28" />
      </div>
    </div>
  </div>
);

const TRIGGER_OPTIONS = [
  {
    id: "blog-post.updated",
    name: "Blog Post Updated",
    description: "Triggered when a blog post is updated",
    icon: FileTextIcon,
  },
  {
    id: "blog-post.published",
    name: "Blog Post Published",
    description: "Triggered when a blog post is published",
    icon: RocketIcon,
  },
] as const;

type TriggerOption = typeof TRIGGER_OPTIONS[number];

const TriggerOptionCard = ({ 
  option,
  onClick,
}: { 
  option: TriggerOption;
  onClick: () => void;
}) => {
  const Icon = option.icon;
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl p-6 text-left transition-all hover:shadow-md bg-white hover:bg-gray-50 dark:bg-muted dark:hover:bg-muted/80 w-full"
    >
      <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 transform text-blue-100 dark:text-blue-900/20">
        <Icon className="h-24 w-24" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
          <Icon className="h-4 w-4" />
          {option.name}
        </div>
        <div className="text-sm text-muted-foreground">
          {option.description}
        </div>
      </div>
    </button>
  );
};

const CreateWorkflowDialog = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleTriggerSelect = async (trigger: TriggerOption) => {
    try {
      const workflow = await createWorkflow({
        name: "Untitled Workflow",
        description: "",
        trigger: trigger.id,
        enabled: false,
        workflow: {
          actions: [],
          edges: []
        }
      });
      setOpen(false);
      router.push(`/automation/${workflow.id}`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <PlusIcon className="h-5 w-5" />
          Create Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
          <DialogDescription>
            Choose a trigger to start building your workflow
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {TRIGGER_OPTIONS.map((option) => (
            <TriggerOptionCard
              key={option.id}
              option={option}
              onClick={() => handleTriggerSelect(option)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AutomationList = () => {
  const { data, isLoading } = useSWR<{ workflows: Workflow[] }>(
    "/api/workflows",
    fetcher,
    { refreshInterval: 500 }
  );

  const workflows = data?.workflows || [];
  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.enabled).length,
    inactive: workflows.filter(w => !w.enabled).length,
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
                  Automations
                </h1>
                <p className="text-muted-foreground text-lg">
                  {stats.total} workflows configured
                </p>
              </div>
              <CreateWorkflowDialog />
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {isLoading ? (
                <>
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                </>
              ) : (
                <>
                  <StatsCard
                    icon={ZapIcon}
                    label="Total Workflows"
                    count={stats.total}
                    color="blue"
                  />
                  <StatsCard
                    icon={PlayCircleIcon}
                    label="Active"
                    count={stats.active}
                    color="green"
                  />
                  <StatsCard
                    icon={PauseCircleIcon}
                    label="Inactive"
                    count={stats.inactive}
                    color="orange"
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
                <WorkflowItemSkeleton />
                <WorkflowItemSkeleton />
                <WorkflowItemSkeleton />
              </>
            ) : (
              <>
                {workflows.map((workflow, index) => (
                  <WorkflowItem key={workflow.id} workflow={workflow} index={index} />
                ))}
                {workflows.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground">No workflows configured yet</div>
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

const WorkflowItem = ({ workflow, index }: { workflow: Workflow; index: number }) => {
  const actions: any[] = (workflow.workflow as any)?.actions || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="group relative">
        <div className="absolute -inset-x-6 -inset-y-4 z-0 scale-95 bg-muted opacity-0 transition group-hover:scale-100 group-hover:opacity-100 sm:rounded-2xl" />
        <Link 
          href={`/automation/${workflow.id}`}
          className="relative z-10 flex flex-col gap-4"
        >
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge 
                variant={workflow.enabled ? "default" : "secondary"}
                className={cn(
                  workflow.enabled 
                    ? "bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-200"
                    : "bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200"
                )}
              >
                {workflow.enabled ? (
                  <><PowerIcon className="w-3 h-3 mr-1" /> Active</>
                ) : (
                  <><PauseCircleIcon className="w-3 h-3 mr-1" /> Inactive</>
                )}
              </Badge>
              {actions.length > 0 && (
                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                  <ActivityIcon className="w-3 h-3 mr-1" />
                  {actions.length} Action{actions.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {workflow.name}
            </h3>
            <p className="text-muted-foreground line-clamp-2 mt-1">
              {workflow.description}
            </p>
          </div>

          {/* Actions List */}
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((action, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <Settings2Icon className="w-3 h-3 mr-1" />
                  {action.name || action.kind}
                </Badge>
              ))}
            </div>
          )}
        </Link>
      </div>
    </motion.div>
  );
};
