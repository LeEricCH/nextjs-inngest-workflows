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
        color === "green" && "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        color === "orange" && "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
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
    { refreshInterval: 15000 }
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
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b shadow-sm">
        <div className="px-8 py-8">
          <div className="flex flex-col gap-10 max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="space-y-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
      <div className="px-8 py-10">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {isLoading ? (
              <>
                <WorkflowItemSkeleton />
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
                  <div className="text-center py-16 col-span-2 rounded-xl border bg-card p-8">
                    <div className="text-muted-foreground text-lg">No workflows configured yet</div>
                    <p className="text-sm text-muted-foreground mt-2">Create your first workflow to get started</p>
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
      className="h-full group"
    >
      <Link 
        href={`/automation/${workflow.id}`}
        className="block h-full"
      >
        <div className="relative h-full bg-card rounded-xl border transition-all duration-200 
          hover:shadow-lg hover:-translate-y-0.5 group-hover:border-primary/20">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 transition-opacity 
            group-hover:opacity-5 dark:group-hover:opacity-10"
            style={{
              backgroundImage: `linear-gradient(to right, ${workflow.enabled ? '#22c55e' : '#f97316'}, #3b82f6)`
            }}
          />
          
          {/* Main Content */}
          <div className="relative p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <Badge 
                variant={workflow.enabled ? "default" : "secondary"}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  workflow.enabled 
                    ? "bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-200 border-green-200 group-hover:bg-green-100 dark:group-hover:bg-green-900/70"
                    : "bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200 border-orange-200 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/70"
                )}
              >
                {workflow.enabled ? (
                  <><PowerIcon className="w-3.5 h-3.5 mr-2" /> Active</>
                ) : (
                  <><PauseCircleIcon className="w-3.5 h-3.5 mr-2" /> Inactive</>
                )}
              </Badge>
              <Badge 
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  actions.length > 0
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/70"
                    : "bg-gray-50 text-gray-600 dark:bg-gray-900/50 dark:text-gray-300 border-gray-200 group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
                )}
              >
                <ActivityIcon className="w-3.5 h-3.5 mr-2" />
                {actions.length > 0 
                  ? `${actions.length} Action${actions.length > 1 ? 's' : ''}`
                  : 'No Actions'
                }
              </Badge>
            </div>

            <div className="flex-grow">
              <h3 className="text-xl font-semibold text-foreground transition-colors mb-3 group-hover:text-primary">
                {workflow.name || "Untitled Workflow"}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-2 mb-6">
                {workflow.description || "No description provided"}
              </p>
            </div>

            {/* Actions List */}
            <div className="border-t pt-4">
              <div className="flex flex-wrap gap-2">
                {actions.length > 0 ? (
                  actions.map((action, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="text-xs px-2.5 py-1 bg-background/80 transition-colors
                        hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary-foreground"
                    >
                      <Settings2Icon className="w-3 h-3 mr-1.5 text-muted-foreground" />
                      {action.name || action.kind}
                    </Badge>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PlusIcon className="w-4 h-4" />
                    <span>Click to add your first action</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
