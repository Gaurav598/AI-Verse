import { streamContent } from "@/lib/gemini";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const VIDEO_SYSTEM = `You are a professional video producer, screenwriter, and content strategist.
When creating video content:
- Write engaging scripts with clear scene descriptions
- Include timing estimates for each scene
- Suggest B-roll footage ideas
- Add voiceover/narration text
- Include visual direction notes
- Format output clearly with sections for Hook, Problem, Solution, CTA
- Keep the audience engaged throughout`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, type = "script" } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
    }

    const fullPrompt =
      type === "storyboard"
        ? `Create a detailed storyboard for this video concept: ${prompt}\n\nFormat as numbered scenes with visual description, dialogue, and duration.`
        : type === "hooks"
        ? `Write 5 powerful video hooks (opening lines) for this topic: ${prompt}\n\nEach hook should grab attention in the first 3 seconds.`
        : `Write a complete video script for: ${prompt}\n\nInclude: Hook, Introduction, Main Content (3-5 sections), Call to Action. Add timing and visual notes.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulated = "";
          for await (const chunk of streamContent(fullPrompt, VIDEO_SYSTEM)) {
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
                  type: 'video', 
                  content: accumulated.trim(), 
                  metadata: { originalPrompt: prompt, type: type }
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
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
