app.post("/create-qr", (req, res) => {
  const { baseAmount } = req.body;

  const randomCents = Math.floor(Math.random() * 90 + 10);
  const finalAmount = (baseAmount + randomCents / 100).toFixed(2);

  const paymentId = Date.now().toString();

  pendingPayments[paymentId] = {
    amount: finalAmount,
    paid: false
  };
  
  const account = "CZ37 30300000002906469015"; // TVŮJ ÚČET
  const message = "VeritasAI";

  const spd = `SPD*1.0*ACC:${account}*AM:${finalAmount}*CC:CZK*MSG:${message}`;

  res.json({
    paymentId,
    amount: finalAmount,
    spd
  });
});
app.post("/confirm-payment", (req, res) => {
  const { paymentId } = req.body;

  if (!pendingPayments[paymentId]) {
    return res.json({ success: false });
  }

  pendingPayments[paymentId].paid = true;

  res.json({ success: true });
});
