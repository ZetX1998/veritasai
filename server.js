app.post("/create-qr", (req, res) => {
  const { baseAmount } = req.body;

  const randomCents = Math.floor(Math.random() * 90 + 10);
  const finalAmount = (baseAmount + randomCents / 100).toFixed(2);

  const account = "CZ6508000000001234567899"; // TVŮJ ÚČET
  const message = "VeritasAI";

  const spd = `SPD*1.0*ACC:${account}*AM:${finalAmount}*CC:CZK*MSG:${message}`;

  res.json({
    amount: finalAmount,
    spd
  });
});
