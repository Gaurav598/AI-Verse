import { streamChat, GeminiModel, getModel } from "@/lib/gemini";
import { rateLimit, getTieredLimit } from "@/lib/rateLimit";
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

    // Note: Assuming a mocked or extracted plan from auth token for demonstration.
    // In production, fetch this from the User/Workspace database record.
    const userPlan = "free"; // or "pro"
    const { limit, window } = getTieredLimit(userPlan);
    const identifier = req.headers.get("x-forwarded-for") || "anonymous_ip";
    
    const rlResult = await rateLimit(identifier, limit, window);
    if (!rlResult.success) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please upgrade your plan." }), { status: 429 });
    }

    const authHeader = req.headers.get('Authorization');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

    // 1. Save user message in background
    if (authHeader) {
      const lastUserMsg = messages[messages.length - 1];
      fetch(`${apiUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ data: { content: lastUserMsg.text, role: 'user' } })
      }).catch(console.error);
    }

    // 2. Retrieve Memory
    let memoryContext = "";
    try {
      const lastMessage = messages[messages.length - 1].text;
      const geminiEmbedModel = getModel("text-embedding-004" as any);
      const embeddingResult = await geminiEmbedModel.embedContent(lastMessage);
      const queryEmbedding = embeddingResult.embedding.values;

      const memoryRes = await fetch(`${apiUrl}/api/memories/search`, {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {})
        },
        body: JSON.stringify({ embedding: queryEmbedding, limit: 3 })
      });

      if (memoryRes.ok) {
        const { results } = await memoryRes.json();
        if (results && results.length > 0) {
          memoryContext = results.map((r: any) => `- ${r.memory_content}`).join('\n');
        }
      }
    } catch (err) {
      console.error("Memory retrieval failed", err);
    }

    // 3. Inject Memory
    const enhancedMessages = [...messages];
    if (memoryContext) {
      const lastMsg = enhancedMessages[enhancedMessages.length - 1];
      lastMsg.text = `Relevant Memory/Context:\n${memoryContext}\n\nUser Query: ${lastMsg.text}`;
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulated = "";
          const generator = streamChat(enhancedMessages, model as GeminiModel);
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
