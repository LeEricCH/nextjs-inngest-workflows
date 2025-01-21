import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SaveIcon, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { type Workflow } from '@/lib/supabase/types';
import { updateWorkflow, deleteWorkflow, toggleWorkflow } from '@/app/actions';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFlowStore } from '@/lib/flow/store';
import { cn } from '@/lib/utils';

interface SettingsSidebarProps {
  workflow: Workflow;
  onWorkflowUpdate: (workflow: Workflow) => void;
  hasActions?: boolean;
}

export function SettingsSidebar({ workflow, onWorkflowUpdate, hasActions = false }: SettingsSidebarProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [name, setName] = useState(workflow.name || '');
  const [description, setDescription] = useState(workflow.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const { updateWorkflowMeta, getWorkflowData } = useFlowStore();

  const handleToggleEnabled = async (enabled: boolean) => {
    if (enabled && !hasActions) {
      toast.error("Add at least one action before enabling the workflow");
      return;
    }

    try {
      const updatedWorkflow = {
        ...workflow,
        enabled
      };
      await toggleWorkflow(workflow.id, enabled);
      onWorkflowUpdate(updatedWorkflow);
      toast.success(enabled ? "Workflow activated" : "Workflow deactivated");
    } catch (error) {
      toast.error("Failed to toggle workflow");
      console.error("Failed to toggle workflow:", error);
    }
  };

  // Update local state when workflow changes
  useEffect(() => {
    setName(workflow.name || '');
    setDescription(workflow.description || '');
    updateWorkflowMeta({ 
      name: workflow.name || null, 
      description: workflow.description || null 
    }, true);
  }, [workflow, updateWorkflowMeta]);

  // Update store (without saving) when fields change
  useEffect(() => {
    updateWorkflowMeta({ name, description });
  }, [name, description, updateWorkflowMeta]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const workflowData = getWorkflowData();
      await updateWorkflow({
        ...workflow,
        name,
        description,
        workflow: workflowData
      });
      onWorkflowUpdate({
        ...workflow,
        name,
        description
      });
      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteWorkflow(workflow.id);
      router.push("/automation");
    } catch (error) {
      toast.error("Failed to delete workflow");
      console.error("Failed to delete workflow:", error);
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-none p-6 border-b bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure workflow settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shrink-0 font-mono text-xs">
              {workflow.id}
            </Badge>
            <Button 
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <SaveIcon className="h-4 w-4 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Workflow Status</h3>
            <div className="relative">
              <div className={cn(
                "w-full h-14 p-1.5 rounded-lg",
                "bg-muted flex relative",
                (!hasActions && !workflow.enabled) && "opacity-50"
              )}>
                {/* Buttons */}
                <button
                  onClick={() => handleToggleEnabled(false)}
                  disabled={!workflow.enabled || (!hasActions && !workflow.enabled)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-md relative z-10",
                    "text-sm font-medium transition-colors duration-200",
                    !workflow.enabled 
                      ? "bg-red-500 text-white" 
                      : "hover:text-red-500"
                  )}
                >
                  Inactive
                </button>
                <button
                  onClick={() => handleToggleEnabled(true)}
                  disabled={workflow.enabled || (!hasActions && !workflow.enabled)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-md relative z-10",
                    "text-sm font-medium transition-colors duration-200",
                    workflow.enabled 
                      ? "bg-green-500 text-white" 
                      : "hover:text-green-500"
                  )}
                >
                  Active
                </button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter workflow name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter workflow description"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Delete Workflow</h4>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete this workflow and all its data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Workflow
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 