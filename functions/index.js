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
