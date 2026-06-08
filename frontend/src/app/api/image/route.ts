import { generateContent } from "@/lib/gemini";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { prompt, style = "realistic" } = await req.json();

    if (!prompt) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
      const authHeader = req.headers.get('Authorization');

      if (authHeader) {
        fetch(`${apiUrl}/api/generated-outputs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({ 
            data: { 
              type: 'image', 
              content: enhancedPrompt.trim(), 
              media_url: placeholderImages[0],
              metadata: { style, originalPrompt: prompt }
            } 
          })
        }).catch(console.error);
      }

      return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
    }

    // Enhance the prompt for better image generation results
    const enhancementPrompt = `Enhance this image generation prompt for an AI image generator. 
Make it more detailed, vivid, and artistic. Add style descriptors, lighting, composition, and technical photography terms.
Original prompt: "${prompt}"
Style preference: ${style}

Return ONLY the enhanced prompt text, nothing else. Maximum 200 words.`;

    const enhancedPrompt = await generateContent(enhancementPrompt);

    return new Response(
      JSON.stringify({
        originalPrompt: prompt,
        enhancedPrompt: enhancedPrompt.trim(),
        style,
        // In production, this would call an actual image generation API
        // For now, we return the enhanced prompt and placeholder URLs
        note: "Connect your preferred image generation API (DALL-E, Stable Diffusion, Imagen) using the enhanced prompt",
        placeholderImages: [
          `https://picsum.photos/seed/${encodeURIComponent(prompt.slice(0, 10))}/512/512`,
          `https://picsum.photos/seed/${encodeURIComponent(prompt.slice(0, 8) + "2")}/512/512`,
          `https://picsum.photos/seed/${encodeURIComponent(prompt.slice(0, 8) + "3")}/512/512`,
          `https://picsum.photos/seed/${encodeURIComponent(prompt.slice(0, 8) + "4")}/512/512`,
        ],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
