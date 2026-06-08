import { GoogleGenerativeAI, GenerativeModel, ChatSession } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock_key_for_build");

export type GeminiModel = "gemini-1.5-flash" | "gemini-1.5-pro" | "gemini-2.0-flash-exp";

export function getModel(model: GeminiModel = "gemini-1.5-flash"): GenerativeModel {
  return genAI.getGenerativeModel({ model });
}

export async function* streamChat(
  messages: { role: "user" | "model"; text: string }[],
  model: GeminiModel = "gemini-1.5-flash"
) {
  const geminiModel = getModel(model);

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const chat: ChatSession = geminiModel.startChat({ history });
  const lastMessage = messages[messages.length - 1].text;
  const result = await chat.sendMessageStream(lastMessage);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}

export async function generateContent(
  prompt: string,
  systemInstruction?: string,
  model: GeminiModel = "gemini-1.5-flash"
): Promise<string> {
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemInstruction || undefined,
  });

  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}

export async function* streamContent(
  prompt: string,
  systemInstruction?: string,
  model: GeminiModel = "gemini-1.5-flash"
): AsyncGenerator<string> {
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemInstruction || undefined,
  });

  const result = await geminiModel.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
