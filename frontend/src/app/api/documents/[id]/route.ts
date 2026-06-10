import { NextRequest } from "next/server";

export const runtime = "edge";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
    
    const res = await fetch(`${apiUrl}/api/documents/${params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': authHeader }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Failed to delete document" }), { status: res.status });
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
