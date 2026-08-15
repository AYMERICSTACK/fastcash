const fs = require("fs");
const path = require("path");

const csvPath = path.join(process.cwd(), "data", "prestashop-export.csv");
const outputPath = path.join(process.cwd(), "data", "products.json");

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " et ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-") || "produit";
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ";" && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parsePrice(value) {
  const cleaned = String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");

  const number = Number.parseFloat(cleaned);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function parseStock(value) {
  const number = Number.parseInt(String(value || "0").replace(",", "."), 10);
  return Number.isFinite(number) ? number : 0;
}

const csv = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const lines = csv.split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(lines[0]).map((header) => header.trim());

const rows = lines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
});

const products = rows.map((row) => {
  const id = Number.parseInt(row["Product ID"], 10);
  const name = String(row["Nom"] || "").trim();
  const category = String(row["Catégorie"] || "Accueil").trim();

  return {
    id,
    slug: `${slugify(name)}-${id}`,
    name,
    reference: String(row["Référence"] || "").trim(),
    category,
    categorySlug: slugify(category),
    price: parsePrice(row["Montant HT"]),
    stock: parseStock(row["Quantité"]),
    image: String(row["Image"] || "").trim(),
    description: name,
  };
});

fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), "utf8");

console.log(`Import terminé : ${products.length} produits générés dans ${outputPath}`);
