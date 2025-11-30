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
// Turnstile verification
// ------------------------------------------------------------
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: ip
      })
    }
  );

  const data = await response.json();
  return data.success === true;
}

// ------------------------------------------------------------
// Main handler
// ------------------------------------------------------------
export default async function handler(req, res) {
  // Rate limit check already protects before heavy work
  if (!rateLimit(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, lang, token } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: "Missing verification token" });
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.connection?.remoteAddress ||
    "unknown";

  const verified = await verifyTurnstile(token, ip);
  if (!verified) {
    return res.status(400).json({ error: "Bot verification failed" });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await supabase
      .from("waitlist")
      .insert([
        {
          email: email.toLowerCase(),
          lang: lang || "en"
        }
      ]);

    if (error && error.code !== "23505") {
      throw error;
    }

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

    await resend.emails.send({
      from: "Purian <no-reply@puriansoap.de>",
      to: email,
      subject,
      text: body
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Subscribe error:", err);

    return res.status(500).json({
      error: "Internal server error",
      details: err?.message || err?.toString() || JSON.stringify(err)
    });
  }
}
