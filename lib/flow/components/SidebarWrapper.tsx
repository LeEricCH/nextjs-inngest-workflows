import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Boxes, Settings2, HelpCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Node } from 'reactflow';
import { WorkflowAction } from '@/lib/inngest/workflowActions';
import { Workflow } from '@/lib/supabase/types';
import { Sidebar } from './Sidebar';
import { PropertiesSidebar } from './PropertiesSidebar';
import { SettingsSidebar } from './SettingsSidebar';
import { HelpSidebar } from './HelpSidebar';

interface SidebarWrapperProps {
  selectedNode: Node<WorkflowAction> | null;
  onNodeSelect: (nodeId: string) => void;
  workflow: Workflow;
  onWorkflowUpdate: (workflow: Workflow) => void;
  nodes: Node<WorkflowAction>[];
}

export const SidebarWrapper = forwardRef<{ openSettings: () => void }, SidebarWrapperProps>(
  ({ selectedNode, onNodeSelect, workflow, onWorkflowUpdate, nodes }, ref) => {
    const [activeView, setActiveView] = useState<'actions' | 'properties' | 'help' | 'settings'>('actions');
    const [isCollapsed, setIsCollapsed] = useState(false);

    useImperativeHandle(ref, () => ({
      openSettings: () => {
        setActiveView('settings');
        setIsCollapsed(false);
      }
    }));

    // Update view when a node is selected from the flow editor
    useEffect(() => {
      if (selectedNode) {
        setActiveView('properties');
        setIsCollapsed(false);
      }
    }, [selectedNode]);

    const handleNodeSelect = (nodeId: string) => {
      onNodeSelect(nodeId);
      if (nodeId) {
        setActiveView('properties');
        setIsCollapsed(false);
      }
    };

    const toggleView = (view: 'actions' | 'properties' | 'help' | 'settings') => {
      if (activeView === view && !isCollapsed) {
        setIsCollapsed(true);
      } else {
        setActiveView(view);
        setIsCollapsed(false);
      }
    };

    return (
      <div className="h-full w-[400px] flex-none flex" data-sidebar-wrapper>
        {/* Sidebar Content - Slides in/out */}
        <div 
          className={cn(
            "relative flex-1 border-l bg-background/80 backdrop-blur-xl overflow-hidden",
            "transition-transform duration-300",
            isCollapsed ? "translate-x-full" : "translate-x-0"
          )}
        >
          {activeView === 'actions' && <Sidebar />}
          {activeView === 'properties' && (
            <PropertiesSidebar
              selectedNode={selectedNode}
              onNodeSelect={handleNodeSelect}
            />
          )}
          {activeView === 'help' && <HelpSidebar />}
          {activeView === 'settings' && (
            <SettingsSidebar 
              workflow={workflow} 
              onWorkflowUpdate={onWorkflowUpdate}
              hasActions={nodes.length > 1}
            />
          )}
        </div>

        {/* Toggle buttons - Always visible */}
        <div className="w-16 border-l bg-background/80 backdrop-blur-xl z-10">
          <div className="flex flex-col items-center py-6 gap-3 h-full">
            <div className="flex-1 flex flex-col items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg hover:bg-accent",
                  activeView === 'actions' && !isCollapsed && "bg-accent text-accent-foreground shadow-sm"
                )}
                onClick={() => toggleView('actions')}
              >
                <Boxes className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg hover:bg-accent",
                  activeView === 'properties' && !isCollapsed && "bg-accent text-accent-foreground shadow-sm"
                )}
                onClick={() => toggleView('properties')}
              >
                <Settings2 className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg hover:bg-accent",
                  activeView === 'help' && !isCollapsed && "bg-accent text-accent-foreground shadow-sm"
                )}
                onClick={() => toggleView('help')}
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg hover:bg-accent",
                  activeView === 'settings' && !isCollapsed && "bg-accent text-accent-foreground shadow-sm"
                )}
                onClick={() => toggleView('settings')}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
); 