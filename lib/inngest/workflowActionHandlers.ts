import { type EngineAction, type WorkflowAction as InngestWorkflowAction } from "@inngest/workflow-kit";
import OpenAI from "openai";

import { type BlogPost } from "../supabase/types";
import { type WorkflowAction } from "./workflowActions";

import { loadBlogPost } from "../loaders/blog-post";
import { createClient } from "../supabase/server";

// Type assertion function to safely cast Inngest workflow action to our type
function asWorkflowAction(action: InngestWorkflowAction): WorkflowAction {
  return action as unknown as WorkflowAction;
}


// helper to check if this is the final step before approval/completion
function isFinalStep(step: unknown, workflowAction: InngestWorkflowAction) {
  const typedStep = step as { workflow?: { edges: Array<{ from: string; to: string }> } };
  try {
    // Get workflow data from the step's workflow property
    const edges = typedStep?.workflow?.edges || [];
    
    // Get outgoing edges from this step
    const outgoingEdges = edges.filter((edge) => edge.from === workflowAction.kind);
    
    // If there are no outgoing edges, or the only outgoing edge is to wait_for_approval,
    // this is considered a final step
    return outgoingEdges.length === 0 || 
           (outgoingEdges.length === 1 && outgoingEdges[0].to === 'wait_for_approval');
  } catch (error) {
    console.error('Error checking if final step:', error);
    return true; // Treat as final step on error
  }
}

// helper to ensure that each step of the workflow use
//  the original content or current AI revision
function getAIworkingCopy(
  workflowAction: InngestWorkflowAction, 
  blogPost: BlogPost, 
  step: unknown
) {
  const typedStep = step as { event?: { data?: { revision?: string } } };
  try {
    // First check if there's an intermediate revision from a previous step
    const intermediateRevision = typedStep?.event?.data?.revision;
    
    // Use intermediate revision if available, otherwise fallback to AI revision or original
    return intermediateRevision || blogPost.markdown_ai_revision || blogPost.markdown;
  } catch (error) {
    console.error('Error getting AI working copy:', error);
    return blogPost.markdown; // Fallback to original on error
  }
}

// helper to ensure that each step of the workflow use
//  the original content or current AI revision
function addAiPublishingSuggestion(
  workflowAction: InngestWorkflowAction,
  blogPost: BlogPost,
  additionalSuggestion: string
) {
  return blogPost.ai_publishing_recommendations
    ? blogPost.ai_publishing_recommendations + `<br/ >` + additionalSuggestion
    : additionalSuggestion;
}

export const actionsWithHandlers: EngineAction[] = [
  {
    kind: "add_toc",
    name: "Add a Table of Contents",
    description: "Add an AI-generated ToC",
    handler: async ({ event, step, workflowAction }) => {
      // Skip review steps for published posts
      if (event.name === "blog-post.published") return;

      const supabase = createClient();
      const action = asWorkflowAction(workflowAction);

      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRevision = await step.run("add-toc-to-article", async () => {
        const openai = new OpenAI({
          apiKey: process.env["OPENAI_API_KEY"],
        });

        const maxDepth = action.inputValues?.maxDepth ?? 3;
        const includeIntroduction = action.inputValues?.includeIntroduction ?? true;

        const prompt = `
        Please update the below markdown article by adding a Table of Content under the h1 title. 
        Maximum heading depth: ${maxDepth}
        Include introduction: ${includeIntroduction}
        Return only the complete updated article in markdown without the wrapping "\`\`\`".

        Here is the text wrapped with "\`\`\`":
        \`\`\`
        ${getAIworkingCopy(workflowAction, blogPost, step)}
        \`\`\`
        `;

        const response = await openai.chat.completions.create({
          model: process.env["OPENAI_MODEL"] || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an AI that make text editing changes.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        return response.choices[0]?.message?.content || "";
      });

      // Only save to DB if this is the final step before approval
      if (isFinalStep(step, workflowAction)) {
        await step.run("save-ai-revision", async () => {
          await supabase
            .from("blog_posts")
            .update({
              markdown_ai_revision: aiRevision,
              status: "processing", // Keep as processing until wait_for_approval step
            })
            .eq("id", event.data.id)
            .select("*");
        });
      } else {
        // Pass the revision to the next step via step data
        await step.sendEvent("intermediate-revision", {
          name: "blog-post.intermediate-revision",
          data: {
            id: event.data.id,
            revision: aiRevision,
            step: workflowAction.kind // Pass the current step for debugging
          }
        });
      }
    },
  },
  {
    kind: "grammar_review",
    name: "Perform a grammar review",
    description: "Use OpenAI for grammar fixes",
    handler: async ({ event, step, workflowAction }) => {
      // Skip review steps for published posts
      if (event.name === "blog-post.published") return;

      const supabase = createClient();
      const action = asWorkflowAction(workflowAction);

      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRevision = await step.run("get-ai-grammar-fixes", async () => {
        const openai = new OpenAI({
          apiKey: process.env["OPENAI_API_KEY"],
        });

        const style = action.inputValues?.style ?? 'professional';
        const strictness = action.inputValues?.strictness ?? 3;
        console.log('\n🔍 ACTION INPUT VALUES 🔍\n', action.inputValues, '\n');

        const prompt = `
        You are my "Hemmingway editor" AI. Please update the below article with grammar fixes.
        Writing style: ${style}
        Strictness level (1-5): ${strictness}
        Return only the complete updated article in markdown without the wrapping "\`\`\`".

        Here is the text wrapped with "\`\`\`":
        \`\`\`
        ${getAIworkingCopy(workflowAction, blogPost, step)}
        \`\`\`
        `;

        const response = await openai.chat.completions.create({
          model: process.env["OPENAI_MODEL"] || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an AI that make text editing changes.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        return response.choices[0]?.message?.content || "";
      });

      // Only save to DB if this is the final step before approval
      if (isFinalStep(step, workflowAction)) {
        await step.run("save-ai-revision", async () => {
          await supabase
            .from("blog_posts")
            .update({
              markdown_ai_revision: aiRevision,
              status: "processing", // Keep as processing until wait_for_approval step
            })
            .eq("id", event.data.id)
            .select("*");
        });
      } else {
        // Pass the revision to the next step via step data
        await step.sendEvent("intermediate-revision", {
          name: "blog-post.intermediate-revision",
          data: {
            id: event.data.id,
            revision: aiRevision,
            step: workflowAction.kind // Pass the current step for debugging
          }
        });
      }
    },
  },
  {
    kind: "wait_for_approval",
    name: "Apply changes after approval",
    description: "Request approval for changes",
    handler: async ({ event, step }) => {
      // Skip review steps for published posts
      if (event.name === "blog-post.published") return;

      const supabase = createClient();

      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      // Now we can set the status to needs approval
      await step.run("update-blog-post-status", async () => {
        await supabase
          .from("blog_posts")
          .update({
            status: "needs approval",
          })
          .eq("id", event.data.id)
          .select("*");
      });

      // wait for the user to approve the AI suggestions
      const approval = await step.waitForEvent(
        "wait-for-approval",
        {
          event: "blog-post.approve-ai-suggestions",
          timeout: "10min",
          match: "data.id",
        }
      );

      // If no approval received (timeout), just end the workflow
      // The post will stay in "needs approval" state with AI changes saved
      if (!approval) {
        return;
      }

      // Handle approval - apply AI revision
      await step.run("apply-ai-revision", async () => {
        await supabase
          .from("blog_posts")
          .update({
            markdown: blogPost.markdown_ai_revision,
            markdown_ai_revision: null,
            ai_publishing_recommendations: null,
            status: "draft"
          })
          .eq("id", event.data.id)
          .select("*");
      });
    },
  },
  {
    kind: "apply_changes",
    name: "Apply changes",
    description: "Save the AI revisions",
    handler: async ({ event, step }) => {
      // Skip review steps for published posts
      if (event.name === "blog-post.published") return;

      const supabase = createClient();

      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      await step.run("apply-ai-revision", async () => {
        await supabase
          .from("blog_posts")
          .update({
            markdown: blogPost.markdown_ai_revision,
            markdown_ai_revision: null,
            ai_publishing_recommendations: null,
            status: "draft"
          })
          .eq("id", blogPost.id)
          .select("*");
      });
    },
  },
  {
    kind: "generate_linkedin_post",
    name: "Generate LinkedIn posts",
    description: "Generate LinkedIn posts",
    handler: async ({ event, step, workflowAction }) => {
      const supabase = createClient();
      const action = asWorkflowAction(workflowAction);

      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRecommendations = await step.run(
        "generate-linked-posts",
        async () => {
          const openai = new OpenAI({
            apiKey: process.env["OPENAI_API_KEY"],
          });

          const tone = action.inputValues?.tone ?? 'professional';
          const numberOfVariants = action.inputValues?.numberOfVariants ?? 3;

          const prompt = `
          Generate ${numberOfVariants} comprehensive LinkedIn posts to promote this blog post. The posts should:
          1. Be ${tone} and engaging
          2. Highlight key takeaways or insights
          3. Include relevant hashtags
          4. Be between 150-200 words
          5. End with a clear call-to-action

          Format the response as:
          Title: [Post Title]
          Content: [Post Content]
          Hashtags: [Relevant hashtags]

          Here is the blog post text:
          Title: ${blogPost.title}
          Subtitle: ${blogPost.subtitle}
          Content:
          ${getAIworkingCopy(workflowAction, blogPost, step)}
          `;

          const response = await openai.chat.completions.create({
            model: process.env["OPENAI_MODEL"] || "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are a Developer Marketing expert specializing in LinkedIn content.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          });

          return response.choices[0]?.message?.content || "";
        }
      );

      await step.run("save-ai-recommendations", async () => {
        await supabase
          .from("blog_posts")
          .update({
            ai_publishing_recommendations: addAiPublishingSuggestion(
              workflowAction,
              blogPost,
              `## LinkedIn Post\n${aiRecommendations}`
            ),
          })
          .eq("id", event.data.id)
          .select("*");
      });
    },
  },
  {
    kind: "generate_tweet_post",
    name: "Generate Twitter posts",
    description: "Generate Twitter posts",
    handler: async ({ event, step, workflowAction }) => {
      const supabase = createClient();
      const action = asWorkflowAction(workflowAction);

      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRecommendations = await step.run("generate-tweets", async () => {
        const openai = new OpenAI({
          apiKey: process.env["OPENAI_API_KEY"],
        });

        const tone = action.inputValues?.tone ?? 'casual';
        const numberOfVariants = action.inputValues?.numberOfVariants ?? 3;

        const prompt = `
        Generate ${numberOfVariants} engaging tweets to promote this blog post. For each tweet:
        1. Be ${tone} and impactful
        2. Include emojis where appropriate
        3. Use bullet points for key takeaways if relevant
        4. Include a hook that makes people want to read more
        5. Leave room for the URL (about 30 characters)

        Format each tweet as:
        Tweet:
        Hook: [Attention-grabbing opening]
        Content: [Main message]
        Emojis: [Suggested emojis to use]

        Here is the blog post text:
        Title: ${blogPost.title}
        Subtitle: ${blogPost.subtitle}
        Content:
        ${blogPost.markdown}
        `;

        const response = await openai.chat.completions.create({
          model: process.env["OPENAI_MODEL"] || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a Developer Marketing expert specializing in Twitter content.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        return response.choices[0]?.message?.content || "";
      });

      await step.run("save-ai-recommendations", async () => {
        await supabase
          .from("blog_posts")
          .update({
            ai_publishing_recommendations: addAiPublishingSuggestion(
              workflowAction,
              blogPost,
              `## Twitter Thread\n${aiRecommendations}`
            ),
          })
          .eq("id", event.data.id)
          .select("*");
      });
    },
  },
  {
    kind: "seo_optimization",
    name: "SEO Optimization",
    description: "Optimize content for search engines",
    handler: async ({ event, step, workflowAction }) => {
      // Skip review steps for published posts
      if (event.name === "blog-post.published") return;

      const supabase = createClient();
      const action = asWorkflowAction(workflowAction);

      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRevision = await step.run("optimize-seo", async () => {
        const openai = new OpenAI({
          apiKey: process.env["OPENAI_API_KEY"],
        });

        const targetKeywords = action.inputValues?.targetKeywords ?? '';
        const seoStrictness = action.inputValues?.seoStrictness ?? 3;
        const optimizeMeta = action.inputValues?.optimizeMeta ?? true;
        const suggestInternalLinks = action.inputValues?.suggestInternalLinks ?? true;

        const prompt = `
        You are an SEO expert. Please optimize this blog post for search engines.
        Target keywords: ${targetKeywords}
        SEO strictness level (1-5): ${seoStrictness}
        ${optimizeMeta ? 'Please suggest an optimized meta description.' : ''}
        ${suggestInternalLinks ? 'Please suggest internal linking opportunities.' : ''}

        Guidelines:
        1. Optimize heading structure (H1, H2, H3)
        2. Ensure proper keyword density without keyword stuffing
        3. Suggest image alt text improvements
        4. Check content length and structure
        5. Verify meta description length (150-160 characters)

        Return the optimized article in markdown format, followed by SEO recommendations.
        
        Here is the blog post:
        Title: ${blogPost.title}
        Subtitle: ${blogPost.subtitle}
        Content:
        ${getAIworkingCopy(workflowAction, blogPost, step)}
        `;

        const response = await openai.chat.completions.create({
          model: process.env["OPENAI_MODEL"] || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an SEO expert that optimizes technical blog content.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        return response.choices[0]?.message?.content || "";
      });

      // Only save to DB if this is the final step before approval
      if (isFinalStep(step, workflowAction)) {
        await step.run("save-ai-revision", async () => {
          await supabase
            .from("blog_posts")
            .update({
              markdown_ai_revision: aiRevision,
              status: "processing",
            })
            .eq("id", event.data.id)
            .select("*");
        });
      } else {
        await step.sendEvent("intermediate-revision", {
          name: "blog-post.intermediate-revision",
          data: {
            id: event.data.id,
            revision: aiRevision,
            step: workflowAction.kind
          }
        });
      }
    },
  },
  {
    kind: "code_block_enhancement",
    name: "Code Block Enhancement",
    description: "Improve code examples in technical content",
    handler: async ({ event, step, workflowAction }) => {
      // Skip review steps for published posts
      if (event.name === "blog-post.published") return;

      const supabase = createClient();
      const action = asWorkflowAction(workflowAction);

      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRevision = await step.run("enhance-code-blocks", async () => {
        const openai = new OpenAI({
          apiKey: process.env["OPENAI_API_KEY"],
        });

        const languages = action.inputValues?.languages ?? 'javascript,typescript';
        const docStyle = action.inputValues?.docStyle ?? 'block';
        const addErrorHandling = action.inputValues?.addErrorHandling ?? true;
        const addExampleOutput = action.inputValues?.addExampleOutput ?? true;

        const prompt = `
        You are a technical documentation expert. Please enhance the code blocks in this blog post.
        Focus on these languages: ${languages}
        Documentation style: ${docStyle}
        ${addErrorHandling ? 'Add appropriate error handling to code examples.' : ''}
        ${addExampleOutput ? 'Add example outputs as comments where relevant.' : ''}

        Guidelines:
        1. Ensure proper syntax highlighting markers
        2. Add comprehensive ${docStyle} style comments
        3. Follow language-specific best practices
        4. Maintain consistent code style
        5. Add error handling where appropriate
        6. Include example outputs as comments

        Return the enhanced article in markdown format.
        
        Here is the blog post:
        Title: ${blogPost.title}
        Subtitle: ${blogPost.subtitle}
        Content:
        ${getAIworkingCopy(workflowAction, blogPost, step)}
        `;

        const response = await openai.chat.completions.create({
          model: process.env["OPENAI_MODEL"] || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a technical documentation expert that improves code examples.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        return response.choices[0]?.message?.content || "";
      });

      // Only save to DB if this is the final step before approval
      if (isFinalStep(step, workflowAction)) {
        await step.run("save-ai-revision", async () => {
          await supabase
            .from("blog_posts")
            .update({
              markdown_ai_revision: aiRevision,
              status: "processing",
            })
            .eq("id", event.data.id)
            .select("*");
        });
      } else {
        await step.sendEvent("intermediate-revision", {
          name: "blog-post.intermediate-revision",
          data: {
            id: event.data.id,
            revision: aiRevision,
            step: workflowAction.kind
          }
        });
      }
    },
  },
  {
    kind: "ai_rewrite",
    name: "AI Rewrite",
    description: "Rewrite content using AI with custom style and tone",
    handler: async ({ event, step, workflowAction }) => {
      // Skip review steps for published posts
      if (event.name === "blog-post.published") return;

      const supabase = createClient();
      const action = asWorkflowAction(workflowAction);

      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRevision = await step.run("rewrite-content", async () => {
        const openai = new OpenAI({
          apiKey: process.env["OPENAI_API_KEY"],
        });

        const style = action.inputValues?.style ?? 'professional';
        const tone = action.inputValues?.tone ?? 'friendly';
        const rewriteLevel = action.inputValues?.rewriteLevel ?? 3;
        const preserveKeywords = action.inputValues?.preserveKeywords ?? true;
        const systemPrompt = action.inputValues?.systemPrompt ?? 
          "You are an expert content writer who excels at maintaining the original meaning while improving clarity and engagement.";
        const temperature = action.inputValues?.temperature ?? 0.7;
        const maxTokens = action.inputValues?.maxTokens ?? 2000;

        const prompt = `
        Please rewrite the following article while:
        1. Using a ${style} writing style
        2. Maintaining a ${tone} tone
        3. Applying a rewrite level of ${rewriteLevel} (1=light editing, 5=complete rewrite)
        ${preserveKeywords ? '4. Preserving important keywords and technical terms' : ''}

        Return only the rewritten article in markdown format.

        Here is the article to rewrite:
        Title: ${blogPost.title}
        Subtitle: ${blogPost.subtitle}
        Content:
        ${getAIworkingCopy(workflowAction, blogPost, step)}
        `;

        const response = await openai.chat.completions.create({
          model: process.env["OPENAI_MODEL"] || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: String(systemPrompt),
            },
            {
              role: "user",
              content: String(prompt),
            },
          ],
          temperature: Number(temperature),
          max_tokens: Number(maxTokens),
        });

        return response.choices[0]?.message?.content || "";
      });

      // Only save to DB if this is the final step before approval
      if (isFinalStep(step, workflowAction)) {
        await step.run("save-ai-revision", async () => {
          await supabase
            .from("blog_posts")
            .update({
              markdown_ai_revision: aiRevision,
              status: "processing",
            })
            .eq("id", event.data.id)
            .select("*");
        });
      } else {
        await step.sendEvent("intermediate-revision", {
          name: "blog-post.intermediate-revision",
          data: {
            id: event.data.id,
            revision: aiRevision,
            step: workflowAction.kind
          }
        });
      }
    },
  },
];
