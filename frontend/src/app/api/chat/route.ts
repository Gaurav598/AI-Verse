import { streamChat, GeminiModel } from "@/lib/gemini";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages, model = "gemini-1.5-flash" } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get('Authorization');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

    // Save user message in background
    if (authHeader) {
      const lastUserMsg = messages[messages.length - 1];
      fetch(`${apiUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ data: { content: lastUserMsg.text, role: 'user' } })
      }).catch(console.error);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulated = "";
          const generator = streamChat(messages, model as GeminiModel);
          for await (const chunk of generator) {
            accumulated += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }
          
          // Save assistant message in background
          if (authHeader) {
            fetch(`${apiUrl}/api/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
              body: JSON.stringify({ data: { content: accumulated, role: 'assistant' } })
            }).catch(console.error);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
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
