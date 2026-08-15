const fs = require("fs");
const path = require("path");

const inputPath = path.join(process.cwd(), "data", "prestashop-export.csv");
const outputPath = path.join(
  process.cwd(),
  "data",
  "prestashop-export-fixed.csv",
);

let content = fs.readFileSync(inputPath, "utf8");

// Corrections encodage fréquentes UTF-8 mal interprété
const fixes = {
  "Ã©": "é",
  "Ã¨": "è",
  Ãª: "ê",
  "Ã«": "ë",
  "Ã ": "à",
  "Ã¢": "â",
  "Ã®": "î",
  "Ã¯": "ï",
  "Ã´": "ô",
  "Ã¶": "ö",
  "Ã¹": "ù",
  "Ã»": "û",
  "Ã¼": "ü",
  "Ã§": "ç",
  "Ã‰": "É",
  "â€™": "’",
  "â€œ": "“",
  "â€": "”",
  "â€“": "–",
  "â€”": "—",
  Â: "",
  "â€¯": " ",
};

for (const [bad, good] of Object.entries(fixes)) {
  content = content.split(bad).join(good);
}

fs.writeFileSync(outputPath, content, "utf8");

console.log("CSV corrigé créé :", outputPath);
