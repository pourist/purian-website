import { translations } from "./translations.js";

const langLinks = document.querySelectorAll(".language-switch a");
const htmlTag = document.documentElement;
const notifyForm = document.getElementById("notify-form");
const messageEl = document.getElementById("notify-message");

/* LANGUAGE HANDLING */

function setLanguage(lang) {
  const dict = translations[lang] || translations.en;

  htmlTag.lang = lang;

  langLinks.forEach((link) => {
    if (link.dataset.lang === lang) {
      link.classList.add("lang-active");
    } else {
      link.classList.remove("lang-active");
    }
  });

  document.querySelectorAll("[data-i18n-key]").forEach((el) => {
    const key = el.dataset.i18nKey;
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

langLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const lang = link.dataset.lang;
    localStorage.setItem("purian-lang", lang);
    setLanguage(lang);
  });
});

const storedLang = localStorage.getItem("purian-lang") || "en";
setLanguage(storedLang);

/* EMAIL FORM HANDLING */

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

if (notifyForm) {
  notifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formLang = htmlTag.lang || "en";
    const currentDict = translations[formLang] || translations.en;
    const emailInput = notifyForm.querySelector("input[type='email']");
    const email = emailInput.value.trim();

    // STEP 2: Get Turnstile token
    const tokenInput = notifyForm.querySelector(
      "input[name='cf-turnstile-response']"
    );
    const token = tokenInput ? tokenInput.value : null;

    messageEl.textContent = "";
    messageEl.className = "notify-message";

    if (!validateEmail(email)) {
      messageEl.textContent = currentDict.invalidEmail;
      messageEl.classList.add("error");
      return;
    }

    if (!token) {
      messageEl.textContent = currentDict.errorMessage;
      messageEl.classList.add("error");
      return;
    }

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, lang: formLang, token })
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      emailInput.value = "";
      messageEl.textContent = currentDict.successMessage;
      messageEl.classList.add("success");

      // Reset Turnstile widget
      if (window.turnstile) {
        turnstile.reset();
      }
    } catch (err) {
      console.error(err);
      messageEl.textContent = currentDict.errorMessage;
      messageEl.classList.add("error");
    }
  });
}
