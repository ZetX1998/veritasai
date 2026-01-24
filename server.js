const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== middleware =====
app.use(express.json());

// ===== statické složky (pořadí je důležité) =====
app.use("/admin", express.static(path.join(__dirname, "admin")));
app.use(express.static(path.join(__dirname, "public")));

// ===== DATA =====
const DATA_DIR = path.join(__dirname, "data");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");

// vytvoření složky data (POVINNÉ NA RENDERU)
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// vytvoření souboru payments.json
if (!fs.existsSync(PAYMENTS_FILE)) {
  fs.writeFileSync(PAYMENTS_FILE, "[]");
}

// ===== API =====

// vytvoření platby
app.post("/create-payment", (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: "Chybí částka" });
  }

  const payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf8"));

  const payment = {
    id: Date.now().toString(),
    amount: Number(amount),
    status: "pending",
    createdAt: new Date().toISOString()
  };

  payments.push(payment);

  fs.writeFileSync(
    PAYMENTS_FILE,
    JSON.stringify(payments, null, 2)
  );

  res.json(payment);
});

// admin – seznam plateb
app.get("/api/payments", (req, res) => {
  const payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf8"));
  res.json(payments);
});

// ===== START =====
app.listen(PORT, () => {
  console.log("Server běží na portu", PORT);
});
