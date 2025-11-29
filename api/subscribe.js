// api/subscribe.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, lang } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  // TODO: connect to real storage (Vercel Postgres, Supabase, Airtable, etc.)
  // For now, we just log on the server side so you can confirm it works in Vercel logs.
  console.log("New Purian subscriber:", { email, lang, ts: new Date().toISOString() });

  // Example: if you later use a DB or external service, call it here and handle errors.

  return res.status(200).json({ ok: true });
}
