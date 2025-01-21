import { Database as SourceDatabase } from "./database.types";

// Define the workflow action type with position
export type WorkflowAction = {
  id: string;
  kind: string;
  name: string;
  description: string;
  position?: { x: number; y: number };
  inputValues?: Record<string, string | number | boolean>;
};

// Define the workflow data type
export type WorkflowData = {
  actions: WorkflowAction[];
  edges: {
    from: string;
    to: string;
  }[];
  triggerPosition?: { x: number; y: number };
};

// typing `workflows.workflow` Json field
export type Database = {
  public: {
    Tables: Omit<SourceDatabase["public"]["Tables"], "workflows"> & {
      workflows: Omit<
        SourceDatabase["public"]["Tables"]["workflows"],
        "Row"
      > & {
        Row: Omit<
          SourceDatabase["public"]["Tables"]["workflows"]["Row"],
          "workflow"
        > & {
          workflow: WorkflowData;
        };
      };
    };
  };
};

export type Workflow = Database["public"]["Tables"]["workflows"]["Row"];
export type BlogPost = {
  id: number;
  created_at: string;
  title: string | null;
  subtitle: string | null;
  markdown: string | null;
  markdown_ai_revision: string | null;
  ai_publishing_recommendations: string | null;
  status: string | null;
  published: boolean;
  published_at: string | null;
};

export type BlogPostStatus = 
  | "draft"
  | "under review"
  | "processing"
  | "needs approval"
  | "published";
