import { Edge, Node, OnNodesChange, OnEdgesChange, OnConnect, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { createClient } from '@supabase/supabase-js';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { toast } from 'sonner';

import { type Workflow, type BlogPost } from '@/lib/supabase/types';
import { workflowToFlow, flowToWorkflow, NODE_TYPES } from './utils';

// Blog Post Store Types
type BlogPostState = {
  blogPost: BlogPost | null;
  isProcessing: boolean;
  isSaving: boolean;
  hasNewAIRecommendations: boolean;
};

type BlogPostActions = {
  updateBlogPost: (post: Partial<BlogPost> | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setHasNewAIRecommendations: (hasNew: boolean) => void;
  initializeRealtime: (postId: string) => () => void;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Create the store with middleware
export const useBlogPostStore = create<BlogPostState & BlogPostActions>()(
  subscribeWithSelector(
    devtools(
      (set, get) => ({
        // Initial state
        blogPost: null,
        isProcessing: false,
        isSaving: false,
        hasNewAIRecommendations: false,

        // Actions
        updateBlogPost: (post) => {
          if (post === null) {
            set({ 
              blogPost: null, 
              isProcessing: false, 
              isSaving: false,
              hasNewAIRecommendations: false 
            });
            return;
          }

          set((state) => {
            const currentPost = state.blogPost;
            if (!currentPost) return { blogPost: post as BlogPost };

            const updatedPost = {
              ...currentPost,
              ...post,
              // Ensure published field is properly copied over
              published: post.published ?? currentPost.published
            };

            // Handle state updates based on the post status
            const newState: Partial<BlogPostState> = { blogPost: updatedPost };

            // Update processing state based on status
            if (post.status === 'processing') {
              newState.isProcessing = true;
            } else if (post.status) {
              newState.isProcessing = false;
            }

            // Check for new AI recommendations
            if (post.markdown_ai_revision && 
                (!currentPost.markdown_ai_revision || 
                 post.markdown_ai_revision !== currentPost.markdown_ai_revision)) {
              newState.hasNewAIRecommendations = true;
              newState.isProcessing = false;
            }

            return newState;
          });
        },

        setProcessing: (isProcessing) => set({ isProcessing }),
        setSaving: (isSaving) => set({ isSaving }),
        setHasNewAIRecommendations: (hasNew) => set({ hasNewAIRecommendations: hasNew }),

        initializeRealtime: (postId: string) => {
          console.log('Setting up realtime subscription for post:', postId);
          
          // First, fetch the initial state with all fields
          supabase
            .from("blog_posts")
            .select("id, title, subtitle, markdown_ai_revision, created_at, status, markdown, ai_publishing_recommendations, published, published_at")
            .eq("id", postId)
            .single()
            .then(({ data }) => {
              if (data) {
                get().updateBlogPost(data);
              }
            });
          
          const channel = supabase
            .channel(`blog-post-${postId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'blog_posts',
                filter: `id=eq.${postId}`,
              },
              (payload) => {
                console.log('Received realtime update:', payload);
                
                if (payload.eventType === 'DELETE') {
                  set({ 
                    blogPost: null, 
                    isProcessing: false, 
                    isSaving: false,
                    hasNewAIRecommendations: false 
                  });
                  return;
                }

                const newData = payload.new as BlogPost;
                get().updateBlogPost(newData);
              }
            )
            .subscribe((status) => {
              console.log(`Realtime subscription status for post ${postId}:`, status);
            });

          return () => {
            console.log('Cleaning up realtime subscription');
            supabase.removeChannel(channel);
          };
        },
      })
    )
  )
);

// Selector hooks for better performance
export const useBlogPost = () => useBlogPostStore((state) => state.blogPost);
export const useProcessingState = () => useBlogPostStore((state) => state.isProcessing);
export const useSavingState = () => useBlogPostStore((state) => state.isSaving);
export const useAIRecommendations = () => 
  useBlogPostStore(
    (state) => ({
      hasNewAIRecommendations: state.hasNewAIRecommendations,
      aiRevision: state.blogPost?.markdown_ai_revision
    })
  );

// Flow Store
export type FlowState = {
  nodes: Node[];
  edges: Edge[];
  workflowMeta: {
    name: string | null;
    description: string | null;
  };
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  updateFromWorkflow: (workflow: Workflow) => void;
  updateWorkflowMeta: (meta: { name: string | null; description: string | null }, isInitial?: boolean) => void;
  getWorkflowData: () => ReturnType<typeof flowToWorkflow>;
  updateWorkflowStatus: (enabled: boolean) => void;
};

const validateWorkflow = (nodes: Node[]): boolean => {
  const lastNode = nodes[nodes.length - 1];
  return lastNode && ['apply_changes', 'wait_for_approval'].includes(lastNode.data.kind);
};

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  workflowMeta: {
    name: null,
    description: null
  },
  onNodesChange: (changes) => {
    // Filter out selection changes for trigger nodes
    const filteredChanges = changes.filter(change => {
      if (change.type === 'select') {
        const node = get().nodes.find(n => n.id === change.id);
        if (node?.type === NODE_TYPES.trigger) {
          return false; // Skip trigger node selection changes
        }
      }
      return true;
    });

    const newNodes = applyNodeChanges(filteredChanges, get().nodes);
    set({ nodes: newNodes });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges)
    });
  },
  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;
    
    const edge: Edge = {
      id: nanoid(),
      source: connection.source,
      target: connection.target,
      type: 'smoothstep',
    };
    set({
      edges: [...get().edges, edge]
    });
  },
  updateFromWorkflow: (workflow) => {
    const { nodes: newNodes, edges: newEdges } = workflowToFlow(workflow);
    set({ 
      nodes: newNodes, 
      edges: newEdges,
      workflowMeta: {
        name: workflow.name || null,
        description: workflow.description || null
      }
    });
  },
  updateWorkflowMeta: (meta) => {
    set({ workflowMeta: meta });
  },
  updateWorkflowStatus: (enabled: boolean) => {
    const nodes = get().nodes;
    if (enabled && !validateWorkflow(nodes)) {
      toast.error("Workflow must end with either 'Apply Changes' or 'Wait for Approval' action.");
      return;
    }
    set((state) => ({ ...state }));
  },
  getWorkflowData: () => {
    const { nodes, edges } = get();
    return flowToWorkflow(nodes, edges);
  }
})); 