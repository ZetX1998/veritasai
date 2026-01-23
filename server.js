import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* =======================
   STATICKÝ WEB
======================= */
app.use(express.static(path.join(__dirname, "public")));

/* =======================
   PLATBY
======================= */
const PAYMENTS_FILE = path.join(__dirname, "data", "payments.json");

function loadPayments() {
  if (!fs.existsSync(PAYMENTS_FILE)) {
    fs.writeFileSync(PAYMENTS_FILE, "[]");
  }
  return JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf8"));
}

function savePayments(data) {
  fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(data, null, 2));
}

function generateVS() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* =======================
   CREATE QR
======================= */
app.post("/create-qr", (req, res) => {
  const { amount } = req.body;

  if (![50, 90, 110].includes(Number(amount))) {
    return res.status(400).json({ error: "Neplatná částka" });
  }

  const vs = generateVS();

  const payment = {
    vs,
    amount: Number(amount),
    status: "waiting",
    created: new Date().toISOString()
  };

  const payments = loadPayments();
  payments.push(payment);
  savePayments(payments);

  const account = "CZ6508000000001234567899"; // ⬅️ ZMĚŇ NA SVŮJ
  const message = "AnonymniAI";

  const spd = `SPD*1.0*ACC:${account}*AM:${amount}*CC:CZK*MSG:${message}*X-VS:${vs}`;

  res.json({ vs, amount, spd });
});

/* =======================
   FALLBACK
======================= */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* =======================
   START
======================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server běží na portu", PORT);
});
