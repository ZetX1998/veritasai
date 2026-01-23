import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// nutné pro ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// žádné cookies, žádné logy
app.disable("x-powered-by");

// statické soubory (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../public")));

// fallback – hlavní stránka
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log("Server běží");
});

