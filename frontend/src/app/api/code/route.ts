import { streamContent } from "@/lib/gemini";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const CODE_SYSTEM = `You are an expert software engineer and coding assistant. 
When asked to write code:
- Always use proper syntax and best practices
- Add helpful comments explaining key parts
- Format code cleanly
- Provide explanations before and after code blocks
- Use appropriate language-specific idioms
- When debugging, explain what went wrong and why`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, language, action = "generate" } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fullPrompt =
      action === "debug"
        ? `Debug this ${language || "code"} and explain the issues:\n\n${prompt}`
        : action === "explain"
        ? `Explain this ${language || "code"} step by step:\n\n${prompt}`
        : action === "optimize"
        ? `Optimize this ${language || "code"} for performance and readability:\n\n${prompt}`
        : language
        ? `Write ${language} code for: ${prompt}`
        : prompt;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulated = "";
          for await (const chunk of streamContent(fullPrompt, CODE_SYSTEM)) {
            accumulated += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
          const authHeader = req.headers.get('Authorization');

          if (authHeader) {
            fetch(`${apiUrl}/api/generated-outputs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
              body: JSON.stringify({ 
                data: { 
                  type: 'code', 
                  content: accumulated.trim(), 
                  metadata: { originalPrompt: prompt, language, action }
                } 
              })
            }).catch(console.error);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
