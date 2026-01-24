const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.json());

// statické složky – POŘADÍ JE DŮLEŽITÉ
app.use("/admin", express.static(path.join(__dirname, "admin")));
app.use(express.static(path.join(__dirname, "public")));


// cesta k datům
const PAYMENTS_FILE = path.join(__dirname, "data", "payments.json");

// jistota, že soubor existuje
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

  const payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE));
  const payment = {
    id: Date.now().toString(),
    amount,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  payments.push(payment);
  fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2));

  res.json(payment);
});

// admin – seznam plateb
app.get("/api/payments", (req, res) => {
  const payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE));
  res.json(payments);
});

// ===== START =====
app.listen(PORT, () => {
  console.log("Server běží na portu", PORT);
});
