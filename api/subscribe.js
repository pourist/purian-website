// api/subscribe.js

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// ------------------------------------------------------------
// Rate limiting: 5 requests per IP per 60 seconds
// ------------------------------------------------------------
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 1000;
const ipStore = new Map();

function rateLimit(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.connection?.remoteAddress ||
    "unknown";

  const now = Date.now();
  const entry = ipStore.get(ip) || { count: 0, windowStart: now };

  // Reset window
  if (now - entry.windowStart > WINDOW_MS) {
    ipStore.set(ip, { count: 1, windowStart: now });
    return true;
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    res.status(429).json({
      error: "Too many requests. Please try again later."
    });
    return false;
  }

  ipStore.set(ip, entry);
  return true;
}

// ------------------------------------------------------------
// Main handler
// ------------------------------------------------------------
export default async function handler(req, res) {
  // Rate limit check
  if (!rateLimit(req, res)) {
    return; // Already responded with 429
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, lang } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Initialize Resend client
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // 1. Insert into Supabase
    const { error } = await supabase
      .from("waitlist")
      .insert([
        {
          email: email.toLowerCase(),
          lang: lang || "en"
        }
      ]);

    // Ignore duplicate entries (error code 23505)
    if (error && error.code !== "23505") {
      throw error;
    }

    // 2. Prepare localized email
    const subject =
      lang === "de"
        ? "Danke! Du bist auf der Purian-Warteliste."
        : "Thank you! You’re on the Purian waitlist.";

    const body =
      lang === "de"
        ? `
Hallo,

vielen Dank für deine Anmeldung zur Purian-Warteliste.
Wir melden uns, sobald wir launchen – und du erhältst einen
exklusiven Rabatt zum Start.

Mit Sorgfalt in Berlin gefertigt.
Purian
        `
        : `
Hi,

Thank you for joining the Purian waitlist.
We’ll notify you when we launch – and you’ll receive an
exclusive discount on your first order.

Crafted with care in Berlin.
Purian
        `;

    // 3. Send thank-you email
    await resend.emails.send({
      from: "Purian <no-reply@puriansoap.de>",
      to: email,
      subject,
      text: body
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
