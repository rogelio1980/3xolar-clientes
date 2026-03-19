const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Secret token for webhook authentication
const WEBHOOK_SECRET = "TRN_tg_2026_xolar";

/**
 * Telegram → Firestore webhook
 * Called by n8n when Rogelio sends/replies in Telegram
 * POST /telegramComment
 * Headers: x-webhook-secret: TRN_tg_2026_xolar
 * Body: { proposalId, clientId, text, authorName }
 */
exports.telegramComment = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).json({error: "Method not allowed"}); return; }

  // Auth
  const secret = req.headers["x-webhook-secret"] || req.body?.secret;
  if (secret !== WEBHOOK_SECRET) {
    res.status(401).json({error: "Unauthorized"});
    return;
  }

  const { proposalId, clientId, text, authorName } = req.body;
  if (!proposalId || !clientId || !text) {
    res.status(400).json({error: "Missing proposalId, clientId or text"});
    return;
  }

  try {
    const ref = await db
      .collection("clients").doc(clientId)
      .collection("comments").add({
        proposalId,
        text: text.trim(),
        authorName: authorName || "Rogelio (Telegram)",
        authorRole: "admin",
        type: "comment",
        uid: "telegram-bot",
        readBy: ["telegram-bot"],
        notified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(200).json({ success: true, commentId: ref.id });
  } catch (err) {
    console.error("telegramComment error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Claude AI proxy — evita CORS desde el browser
 * POST /claudeProxy
 * Body: { messages, system, max_tokens }
 * Requiere Firebase env: ANTHROPIC_API_KEY
 */
exports.claudeProxy = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "https://xolar-clientes.web.app");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).json({error: "Method not allowed"}); return; }

  // Only allow authenticated Firebase users (checked via token)
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({error: "Unauthorized — se requiere token Firebase"}); return;
  }
  try {
    await admin.auth().verifyIdToken(auth.replace("Bearer ", ""));
  } catch(e) {
    res.status(401).json({error: "Token inválido"}); return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({error: "API key no configurada"}); return; }

  const { messages, system, max_tokens } = req.body;
  if (!messages) { res.status(400).json({error: "Falta messages"}); return; }

  try {
    const https = require("https");
    const body = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: max_tokens || 1000,
      system: system || "",
      messages
    });
    const result = await new Promise((resolve, reject) => {
      const r = https.request({
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        }
      }, (resp) => {
        let data = "";
        resp.on("data", c => data += c);
        resp.on("end", () => resolve({status: resp.statusCode, body: data}));
      });
      r.on("error", reject);
      r.write(body);
      r.end();
    });
    res.status(result.status).send(result.body);
  } catch(err) {
    console.error("claudeProxy error:", err);
    res.status(500).json({error: err.message});
  }
});
