import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("files") as File;
    const workspaceId = formData.get("workspaceId") as string;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

    // 1. Upload file to Strapi
    const uploadRes = await fetch(`${apiUrl}/api/upload`, {
      method: "POST",
      headers: { 'Authorization': authHeader },
      body: formData // Forward the exact same FormData
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      return new Response(JSON.stringify({ error: "File upload failed", details: errorText }), { status: 500 });
    }

    const uploadData = await uploadRes.json();
    const uploadedFile = uploadData[0]; // Strapi returns array

    // 2. Create Document entity
    const documentBody = {
      data: {
        title: file.name,
        original_name: file.name,
        file_url: uploadedFile.url,
        mime_type: file.type,
        byte_size: file.size,
        status: "pending",
        workspace: workspaceId ? Number(workspaceId) : null
      }
    };

    const docRes = await fetch(`${apiUrl}/api/documents`, {
      method: "POST",
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(documentBody)
    });

    if (!docRes.ok) {
      const errorText = await docRes.text();
      return new Response(JSON.stringify({ error: "Failed to create document record", details: errorText }), { status: 500 });
    }

    const docData = await docRes.json();

    return new Response(JSON.stringify(docData), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
