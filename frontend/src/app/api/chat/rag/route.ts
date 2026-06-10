import { streamChat, GeminiModel, getModel } from "@/lib/gemini";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages, workspaceId, model = "gemini-1.5-flash" } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), { status: 400 });
    }

    const lastMessage = messages[messages.length - 1].text;

    // 1. Generate embedding for the user query
    const geminiEmbedModel = getModel("text-embedding-004" as any); // Type override if needed
    let embeddingResult;
    try {
      embeddingResult = await geminiEmbedModel.embedContent(lastMessage);
    } catch (e) {
      // fallback
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock");
      embeddingResult = await genAI.getGenerativeModel({ model: "text-embedding-004" }).embedContent(lastMessage);
    }
    
    const queryEmbedding = embeddingResult.embedding.values;

    // 2. Search vector database
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
    const authHeader = req.headers.get('Authorization');

    const searchRes = await fetch(`${apiUrl}/api/document-chunks/search`, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: JSON.stringify({
        embedding: queryEmbedding,
        workspaceId,
        limit: 5
      })
    });

    let contextText = "";
    if (searchRes.ok) {
      const { results } = await searchRes.json();
      if (results && results.length > 0) {
        contextText = results.map((r: any) => `Document ID ${r.document_id}, Chunk ${r.chunk_index}:\n${r.chunk_content}`).join('\n\n');
      }
    }

    // 3. Inject context into prompt
    const enhancedMessages = [...messages];
    if (contextText) {
      enhancedMessages[enhancedMessages.length - 1].text = 
        `Context information is below.\n---------------------\n${contextText}\n---------------------\nGiven the context information and no prior knowledge, answer the query: ${lastMessage}`;
    }

    // 4. Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamChat(enhancedMessages, model as GeminiModel);
          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
