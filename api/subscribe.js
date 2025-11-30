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
// Step 4: Strict Content-Type, Body Limit, JSON Validation
// ------------------------------------------------------------

async function readJsonBody(req, res) {
  // Enforce correct content-type
  if (req.headers["content-type"] !== "application/json") {
    res.status(400).json({ error: "Invalid content type" });
    return null;
  }

  return new Promise((resolve) => {
    let data = "";
    const MAX_BODY_SIZE = 10 * 1024; // 10KB

    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY_SIZE) {
        res.status(413).json({ error: "Request body too large" });
        resolve(null);
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        const json = JSON.parse(data);

        // Reject extra fields
        const allowed = ["email", "lang", "token"];
        for (const key of Object.keys(json)) {
          if (!allowed.includes(key)) {
            res.status(400).json({ error: "Unexpected field" });
            return resolve(null);
          }
        }

        resolve(json);
      } catch (err) {
        res.status(400).json({ error: "Malformed JSON" });
        resolve(null);
      }
    });
  });
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
  // Rate limit check
  if (!rateLimit(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Step 4: safe body parsing
  const body = await readJsonBody(req, res);
  if (!body) return;

  const { email, lang, token } = body;

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

  // Email validation
  if (
    !email ||
    typeof email !== "string" ||
    email.length > 320 || // maximum allowed email length universally
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // ------------------------------------------------------------
    // Step 5.1: Email Abuse Prevention - throttle per email (1/day)
    // ------------------------------------------------------------
    const { data: existingEntries } = await supabase
      .from("waitlist")
      .select("created_at")
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingEntries && existingEntries.length > 0) {
      const last = new Date(existingEntries[0].created_at);
      const now = new Date();
      const hours = (now - last) / (1000 * 60 * 60);

      if (hours < 24) {
        // Return OK but DO NOT send email again
        return res.status(200).json({ ok: true });
      }
    }

    // ------------------------------------------------------------
    // Step 5.2: IP-based abuse detection
    // max 20 entries per IP per hour
    // ------------------------------------------------------------
    const { data: recentIpEntries } = await supabase
      .from("waitlist")
      .select("id")
      .eq("ip", ip)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (recentIpEntries && recentIpEntries.length > 20) {
      return res.status(429).json({
        error: "Too many requests from this IP"
      });
    }

    // ------------------------------------------------------------
    // Insert new record (with IP)
    // ------------------------------------------------------------
    const { error } = await supabase
      .from("waitlist")
      .insert([
        {
          email: email.toLowerCase(),
          lang: lang || "en",
          ip
        }
      ]);

    if (error && error.code !== "23505") {
      throw error;
    }

    const subject =
      lang === "de"
        ? "Danke! Du bist auf der Purian-Warteliste."
        : "Thank you! You’re on the Purian waitlist.";

    const bodyText =
      lang === "de"
        ? `
Hallo,
vielen Dank für deine Anmeldung zur Purian-Warteliste.
Wir melden uns, sobald wir launchen – und du erhältst einen exklusiven Rabatt zum Start.

Mit Sorgfalt in Berlin gefertigt.
Purian
        `
        : `
Hi,
Thank you for joining the Purian waitlist.
We’ll notify you when we launch – and you’ll receive an exclusive discount on your first order.

Crafted with care in Berlin.
Purian
        `;

    await resend.emails.send({
      from: "Purian <no-reply@puriansoap.de>",
      to: email,
      subject,
      text: bodyText
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
