import { type PublicEngineAction, type WorkflowAction as InngestWorkflowAction } from "@inngest/workflow-kit";

export interface ActionInput {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
  default?: any;
}

// Extend the Inngest WorkflowAction type with our additional properties
export interface WorkflowAction extends Omit<InngestWorkflowAction, 'inputValues'> {
  inputs?: Record<string, ActionInput>;
  inputValues?: Record<string, string | number>;
  // Make required fields non-optional
  name: string;
  kind: string;
  description: string;
  id: string;
}

// Actions
//   - Review actions
//     - Add ToC to the article
//     - Add grammar suggestions
//     - [Apply changes]
//     - [Apply changes after approval]
//   - Post-publish actions
//     - Get Tweet verbatim
//     - Get LinkedIn verbatim
//     - SEO optimization
//     - Code block enhancement
// Required actions at the end of a workflow
export const requiredEndActions = ['apply_changes', 'wait_for_approval'];

export const actions: WorkflowAction[] = [
  {
    id: "add_toc",
    kind: "add_toc",
    name: "Add a Table of Contents",
    description: "Add an AI-generated ToC",
    inputs: {
      maxDepth: {
        name: "maxDepth",
        type: "number",
        description: "Maximum heading depth to include",
        default: 3,
      },
      includeIntroduction: {
        name: "includeIntroduction",
        type: "boolean",
        description: "Include an introduction section",
        default: true,
      }
    }
  },
  {
    id: "grammar_review",
    kind: "grammar_review",
    name: "Perform a grammar review",
    description: "Use OpenAI for grammar fixes",
    inputs: {
      style: {
        name: "style",
        type: "string",
        description: "Writing style to enforce",
        default: "professional",
      },
      strictness: {
        name: "strictness",
        type: "number",
        description: "How strict the grammar check should be (1-5)",
        default: 3,
      }
    }
  },
  {
    id: "wait_for_approval",
    kind: "wait_for_approval",
    name: "Apply changes after approval",
    description: "Request approval for changes",
  },
  {
    id: "apply_changes",
    kind: "apply_changes",
    name: "Apply changes",
    description: "Save the AI revisions",
  },
  {
    id: "generate_linkedin_post",
    kind: "generate_linkedin_post",
    name: "Generate LinkedIn posts",
    description: "Generate LinkedIn posts",
    inputs: {
      tone: {
        name: "tone",
        type: "string",
        description: "Tone of the post",
        default: "professional",
      },
      numberOfVariants: {
        name: "numberOfVariants",
        type: "number",
        description: "Number of post variants to generate",
        default: 3,
      }
    }
  },
  {
    id: "generate_tweet_post",
    kind: "generate_tweet_post",
    name: "Generate Twitter posts",
    description: "Generate Twitter posts",
    inputs: {
      tone: {
        name: "tone",
        type: "string",
        description: "Tone of the tweets",
        default: "casual",
      },
      numberOfVariants: {
        name: "numberOfVariants",
        type: "number",
        description: "Number of tweet variants to generate",
        default: 3,
      }
    }
  },
  {
    id: "seo_optimization",
    kind: "seo_optimization",
    name: "SEO Optimization",
    description: "Optimize content for search engines",
    inputs: {
      targetKeywords: {
        name: "targetKeywords",
        type: "string",
        description: "Comma-separated target keywords",
        default: "",
      },
      seoStrictness: {
        name: "seoStrictness",
        type: "number",
        description: "How strict the SEO optimization should be (1-5)",
        default: 3,
      },
      optimizeMeta: {
        name: "optimizeMeta",
        type: "boolean",
        description: "Whether to optimize meta description",
        default: true,
      },
      suggestInternalLinks: {
        name: "suggestInternalLinks",
        type: "boolean",
        description: "Suggest internal linking opportunities",
        default: true,
      }
    }
  },
  {
    id: "code_block_enhancement",
    kind: "code_block_enhancement",
    name: "Code Block Enhancement",
    description: "Improve code examples in technical content",
    inputs: {
      languages: {
        name: "languages",
        type: "string",
        description: "Comma-separated programming languages to focus on",
        default: "javascript,typescript",
      },
      docStyle: {
        name: "docStyle",
        type: "string",
        description: "Documentation style (inline/block)",
        default: "block",
      },
      addErrorHandling: {
        name: "addErrorHandling",
        type: "boolean",
        description: "Add error handling to code examples",
        default: true,
      },
      addExampleOutput: {
        name: "addExampleOutput",
        type: "boolean",
        description: "Add example outputs as comments",
        default: true,
      }
    }
  }
];
