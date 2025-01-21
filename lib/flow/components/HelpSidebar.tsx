import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Shortcut {
  key: string;
  description: string;
  mac?: string;
}

const KEYBOARD_SHORTCUTS: Shortcut[] = [
  { key: 'Ctrl + Click', description: 'Multi-select nodes', mac: '⌘ + Click' },
  { key: 'Ctrl + A', description: 'Select all nodes', mac: '⌘ + A' },
  { key: 'Ctrl + C', description: 'Copy selected nodes', mac: '⌘ + C' },
  { key: 'Ctrl + V', description: 'Paste copied nodes', mac: '⌘ + V' },
  { key: 'Backspace', description: 'Delete selected nodes' },
  { key: 'Ctrl + Drag', description: 'Pan canvas', mac: '⌘ + Drag' },
  { key: 'Mouse Wheel', description: 'Zoom in/out' },
  { key: 'Click + Drag', description: 'Move node' },
];

export function HelpSidebar() {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-none p-6 border-b bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Help</h2>
            <p className="text-sm text-muted-foreground">
              Keyboard shortcuts and tips
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 font-mono text-xs">
            {KEYBOARD_SHORTCUTS.length} Shortcuts
          </Badge>
        </div>
      </div>

      {/* Help Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Keyboard Shortcuts</h3>
            <div className="space-y-1">
              {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/10 transition-colors"
                >
                  <span className="text-sm text-muted-foreground">
                    {shortcut.description}
                  </span>
                  <kbd className="ml-2 px-2 py-0.5 bg-muted border rounded text-[10px] font-mono text-muted-foreground">
                    {isMac && shortcut.mac ? shortcut.mac : shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium mb-2">Pro Tips</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-foreground">•</span>
                Hold Ctrl/⌘ while dragging to pan the canvas
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-foreground">•</span>
                Double-click a node to edit its properties
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-foreground">•</span>
                Use the mouse wheel to zoom in and out
              </li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
} 