require('dotenv').config();
const ADMIN_PASS = process.env.ADMIN_PASS;
const express = require("express");
const fs = require("fs");
const path = require("path");
const basicAuth = require("basic-auth");  // Přidáno pro auth
const cron = require("node-cron");        // Přidáno pro cron
const OpenAI = require("openai");         // Přidáno pro AI

const app = express();
const PORT = process.env.PORT || 3000;

// Nahraď svým OpenAI API klíčem (získáš na openai.com)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Middleware
app.use(express.json());

// Statické složky (pořadí je důležité)
app.use("/admin", express.static(path.join(__dirname, "admin")));
app.use(express.static(path.join(__dirname, "public")));

// Data
const DATA_DIR = path.join(__dirname, "data");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

if (!fs.existsSync(PAYMENTS_FILE)) {
  fs.writeFileSync(PAYMENTS_FILE, "[]");
}

// Basic auth pro admin (uživatel: admin, heslo: tajneheslo – změň!)
const ADMIN_USER = "admin";
const ADMIN_PASS = process.env.ADMIN_PASS;

function authMiddleware(req, res, next) {
  const user = basicAuth(req);
  if (user && user.name === ADMIN_USER && user.pass === ADMIN_PASS) {
    return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Admin Area"');
  return res.status(401).send("Přístup zamítnut. Zadej heslo.");
}

// Použij auth na admin routy
app.use("/admin", authMiddleware);
app.use("/api/payments", authMiddleware);

// API: Vytvoření platby (přidáno userInput a level)
app.post("/create-payment", (req, res) => {
  const { amount, userInput, level } = req.body;  // Přidáno input a level

  if (!amount || !userInput || !level) {
    return res.status(400).json({ error: "Chybí částka, input nebo level" });
  }

  let payments;
  try {
    payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf8"));
  } catch (err) {
    return res.status(500).json({ error: "Chyba čtení dat" });
  }

  const payment = {
    id: Date.now().toString(),
    amount: Number(amount),
    userInput,  // Přidáno
    level,      // Přidáno ('jemna', 'stredni', 'drasticka')
    status: "pending",
    createdAt: Date.now(),  // Změněno na timestamp pro cron
    response: null  // Přidáno pro AI výstup
  };

  payments.push(payment);

  try {
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2));
  } catch (err) {
    return res.status(500).json({ error: "Chyba ukládání dat" });
  }

  res.json(payment);
});

// Admin – seznam plateb (bez změn, ale s auth)
app.get("/api/payments", (req, res) => {
  let payments;
  try {
    payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf8"));
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: "Chyba čtení dat" });
  }
});

// Nová routa pro result: Načte response podle ID a smaže payment (anonymita)
app.get("/api/response/:id", (req, res) => {
  const { id } = req.params;
  let payments;
  try {
    payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf8"));
  } catch (err) {
    return res.status(500).json({ error: "Chyba čtení dat" });
  }

  const index = payments.findIndex(p => p.id === id);
  if (index === -1 || payments[index].status !== "completed") {
    return res.status(404).json({ error: "Odpověď nenalezena nebo čeká na zpracování" });
  }

  const response = payments[index].response;

  // Smaž payment po doručení (anonymita)
  payments.splice(index, 1);
  try {
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2));
  } catch (err) {
    // Silent error, ale response pošleme
  }

  res.json({ response });
});

// Funkce pro generování AI response
async function generateResponse(payment) {
  let prompt = `Uživatel: ${payment.userInput}\n\n`;
  if (payment.level === "jemna") {
    prompt += "Odpovídej jemně, podporujícím způsobem, motivuj k zlepšení bez tvrdé kritiky.";
  } else if (payment.level === "stredni") {
    prompt += "Odpovídej vyváženě, upřímně s konstruktivní kritikou a řešeními.";
  } else if (payment.level === "drasticka") {
    prompt += "Odpovídej brutálně upřímně, bez zjemňování, řekni tvrdou pravdu, která může bolet.";
  }
  prompt += "\nAnalyzuj z více úhlů (psychologický, sociální, praktický). Buď faktický.";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",  // Levný model
      messages: [{ role: "system", content: "Jsi upřímná AI." }, { role: "user", content: prompt }],
    });
    return completion.choices[0].message.content;
  } catch (err) {
    console.error("AI chyba:", err);
    return "Chyba při generování odpovědi.";
  }
}

// Automatizace: Cron job každou 1 min kontroluje pending platby
function checkPayments() {
  let payments;
  try {
    payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf8"));
  } catch (err) {
    console.error("Chyba čtení plateb:", err);
    return;
  }

  const now = Date.now();
  let changed = false;

  for (let payment of payments) {
    if (payment.status === "pending" && (now - payment.createdAt) > 120000) {  // 2 minuty (120000 ms)
      payment.status = "paid";
      changed = true;

      // Spusť AI
      generateResponse(payment).then(response => {
        payment.response = response;
        payment.status = "completed";
        try {
          fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2));
        } catch (err) {
          console.error("Chyba ukládání po AI:", err);
        }
      });
    }
  }

  if (changed) {
    try {
      fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2));
    } catch (err) {
      console.error("Chyba ukládání po checku:", err);
    }
  }
}

// Spusť cron (každou minutu)
cron.schedule("* * * * *", checkPayments);

// Start serveru
app.listen(PORT, () => {
  console.log("Server běží na portu", PORT);
  checkPayments();  // Inicialní check
});
