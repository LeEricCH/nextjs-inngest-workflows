"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/theme-switch";
import { FileTextIcon, ZapIcon, MenuIcon, PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { useFlowStore } from "@/lib/flow/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AdminPanelLayoutProps {
  children: React.ReactNode;
}

export default function AdminPanelLayout({ children }: AdminPanelLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r",
          "transition-all duration-300 ease-in-out",
          !isSidebarOpen && "md:w-20",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="border-b px-3 py-3">
            <div className={cn(
              "flex items-center",
              isSidebarOpen ? "justify-between" : "justify-center"
            )}>
              <h2 className={cn(
                "text-xl font-bold transition-opacity duration-200",
                !isSidebarOpen && "md:hidden"
              )}>
                Dashboard
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex -mr-2"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <PanelLeftIcon className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  !isSidebarOpen && "rotate-180"
                )} />
              </Button>
            </div>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto">
            <nav className="grid gap-1 p-2 pt-3">
              <Button
                variant={pathname === "/" || pathname.startsWith("/blog-post") ? "secondary" : "ghost"}
                className={cn(
                  "w-full h-10 px-3",
                  isSidebarOpen ? "justify-start" : "justify-center"
                )}
                onClick={() => router.push("/")}
              >
                <FileTextIcon className={cn("h-4 w-4", isSidebarOpen && "mr-3")} />
                <span className={cn(
                  "text-sm transition-opacity duration-200",
                  !isSidebarOpen && "md:hidden"
                )}>
                  Posts
                </span>
              </Button>
              <Button
                variant={pathname.startsWith("/automation") ? "secondary" : "ghost"}
                className={cn(
                  "w-full h-10 px-3",
                  isSidebarOpen ? "justify-start" : "justify-center"
                )}
                onClick={() => router.push("/automation")}
              >
                <ZapIcon className={cn("h-4 w-4", isSidebarOpen && "mr-3")} />
                <span className={cn(
                  "text-sm transition-opacity duration-200",
                  !isSidebarOpen && "md:hidden"
                )}>
                  Automation
                </span>
              </Button>
            </nav>
          </div>

          {/* Sidebar footer */}
          <div className="border-t p-3">
            <div className={cn(
              "flex items-center",
              isSidebarOpen ? "justify-end" : "justify-center"
            )}>
              <ThemeSwitch />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-40 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <MenuIcon className="h-4 w-4" />
      </Button>

      {/* Main content */}
      <main className={cn(
        "flex-1 min-h-screen",
        "transition-all duration-300 ease-in-out",
        isSidebarOpen ? "md:ml-64" : "md:ml-20"
      )}>
        <div className="h-full px-6 py-4">
          {children}
        </div>
      </main>
    </div>
  );
}
