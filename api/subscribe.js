// api/subscribe.js

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, lang } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Initialize Resend
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

    // Ignore duplicate email errors (code 23505)
    if (error && error.code !== "23505") {
      throw error;
    }

    // 2. Prepare thank-you email
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

    // 3. Send the thank-you email
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
