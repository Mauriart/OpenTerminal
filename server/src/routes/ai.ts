import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

export const aiRouter = Router();

// Uses ANTHROPIC_API_KEY (or an `ant auth login` profile) from the environment.
// If no credentials are configured, the endpoint reports the assistant as unavailable.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const SYSTEM = `Eres el asistente de IA dentro de OpenTerminal, un terminal financiero al estilo Bloomberg.
Ayudas al usuario a interpretar datos de mercado, gráficos, noticias, cadenas de opciones e indicadores macro.
Responde de forma concisa y profesional, en español neutro de Latinoamérica.
Si el usuario escribe en otro idioma, responde en ese idioma.
Cuando la conversación incluya datos de mercado como contexto JSON, basa tu respuesta en ellos.
No eres un asesor financiero autorizado: nunca des consejos de inversión personalizados ni le digas al usuario qué comprar o vender.`;

aiRouter.post("/chat", async (req, res) => {
  const { messages, context } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }
  try {
    const contextBlock = context
      ? [{ role: "user" as const, content: `Contexto actual del terminal (JSON):\n${JSON.stringify(context)}` }]
      : [];
    const response = await getClient().messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [...contextBlock, ...messages],
    });
    if (response.stop_reason === "refusal") {
      return res.json({ text: "El asistente rechazó responder esta solicitud." });
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("");
    res.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("api_key") || msg.includes("authentication")) {
      return res.status(503).json({ error: "AI assistant unavailable: set ANTHROPIC_API_KEY on the server." });
    }
    res.status(502).json({ error: msg });
  }
});
