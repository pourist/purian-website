// api/subscribe.js

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, lang } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from("waitlist")
      .insert([
        {
          email: email.toLowerCase(),
          lang: lang || "en"
        }
      ]);

    if (error) {
      if (error.code === "23505") {
        // duplicate email
        return res.status(200).json({ ok: true });
      }
      throw error;
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Supabase insert error:", err);
    return res.status(500).json({ error: "Supabase error" });
  }
}
