import { generateContent } from "@/lib/gemini";
import { NextRequest } from "next/server";
import { z } from "zod";

const ImageRequestSchema = z.object({
  prompt: z.string().min(3).max(1000),
  style: z.enum(["realistic", "cartoon", "anime", "3d", "painting"]).default("realistic"),
  workspaceId: z.string().or(z.number()).optional(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = ImageRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: parseResult.error.errors }), { status: 400 });
    }

    const { prompt, style, workspaceId } = parseResult.data;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
    const authHeader = req.headers.get('Authorization');

    // 1. Enhance prompt with Gemini
    const enhancementPrompt = `Enhance this image generation prompt for DALL-E 3. 
Make it extremely detailed, vivid, and artistic. Include ${style} elements, lighting, and composition.
Original prompt: "${prompt}"
Return ONLY the enhanced prompt text, nothing else. Maximum 100 words.`;

    const enhancedPrompt = await generateContent(enhancementPrompt);
    const finalPrompt = enhancedPrompt.trim();

    // 2. Generate Image with DALL-E 3
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API Key is missing for image generation" }), { status: 500 });
    }

    const openAiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: "1024x1024"
      })
    });

    if (!openAiRes.ok) {
      const errTxt = await openAiRes.text();
      return new Response(JSON.stringify({ error: "DALL-E generation failed", details: errTxt }), { status: 500 });
    }

    const openAiData = await openAiRes.json();
    const imageUrl = openAiData.data[0].url;

    // 3. Download the generated image
    const imageRes = await fetch(imageUrl);
    const imageBlob = await imageRes.blob();

    // 4. Upload to Strapi
    const formData = new FormData();
    formData.append('files', imageBlob, `dalle_${Date.now()}.png`);

    let finalMediaUrl = imageUrl;
    let strapiMediaId = null;

    if (authHeader) {
      const uploadRes = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        headers: { 'Authorization': authHeader },
        body: formData
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        finalMediaUrl = uploadData[0].url;
        strapiMediaId = uploadData[0].id;
        
        // 5. Create Generated Output Record
        await fetch(`${apiUrl}/api/generated-outputs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({ 
            data: { 
              type: 'image', 
              content: finalPrompt, 
              media_url: finalMediaUrl,
              metadata: { style, originalPrompt: prompt, provider: "dall-e-3", mediaId: strapiMediaId },
              workspace: workspaceId ? Number(workspaceId) : null
            } 
          })
        }).catch(console.error);
      }
    }

    return new Response(
      JSON.stringify({
        originalPrompt: prompt,
        enhancedPrompt: finalPrompt,
        style,
        images: [finalMediaUrl] // Using Strapi local URL
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
