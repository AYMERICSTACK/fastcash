import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const EXPECTED_COUNT = 590;
const CONFIRM_APPLY = "FASTCASH-590";
const CONFIRM_ROLLBACK = "ROLLBACK-FASTCASH";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const forceConflicts = args.includes("--force-conflicts");
const allowMissing = args.includes("--allow-missing");
const confirmArg = args.find((arg) => arg.startsWith("--confirm="));
const confirmValue = confirmArg?.slice("--confirm=".length) ?? null;
const rollbackArg = args.find((arg) => arg.startsWith("--rollback="));
const rollbackFile = rollbackArg?.slice("--rollback=".length) ?? null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const auditPath = path.join(__dirname, "data", "product-condition-audit.json");

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function countBy(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function printCounts(label, counts) {
  console.log(`\n${label}`);
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(18)} ${String(value).padStart(4)}`);
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL introuvable.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function rollback() {
  if (!rollbackFile) return false;

  if (confirmValue !== CONFIRM_ROLLBACK) {
    console.error(`❌ Rollback bloqué. Ajoute --confirm=${CONFIRM_ROLLBACK}`);
    process.exit(1);
  }

  const backupPath = path.resolve(rollbackFile);
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Sauvegarde introuvable : ${backupPath}`);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  if (!Array.isArray(backup.products) || backup.products.length === 0) {
    console.error("❌ Fichier de sauvegarde invalide.");
    process.exit(1);
  }

  console.log(`\n↩️  ROLLBACK de ${backup.products.length} produit(s)...`);

  const operations = backup.products.map((product) =>
    prisma.product.update({
      where: { id: product.id },
      data: { condition: product.oldCondition },
    })
  );

  await prisma.$transaction(operations);

  console.log("✅ Rollback terminé.");
  return true;
}

async function main() {
  if (await rollback()) return;

  const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));

  if (!Array.isArray(audit) || audit.length !== EXPECTED_COUNT) {
    throw new Error(
      `Audit invalide : ${audit?.length ?? 0} lignes au lieu de ${EXPECTED_COUNT}.`
    );
  }

  const auditIds = audit.map((row) => row.prestashopId);
  if (new Set(auditIds).size !== EXPECTED_COUNT) {
    throw new Error("Audit invalide : prestashopId dupliqué.");
  }

  const allowed = new Set(["NEW", "EXCELLENT", "DAMAGED"]);
  for (const row of audit) {
    if (!allowed.has(row.condition)) {
      throw new Error(`Etat interdit dans l'audit : ${row.condition}`);
    }
  }

  const products = await prisma.product.findMany({
    where: { prestashopId: { in: auditIds } },
    select: {
      id: true,
      prestashopId: true,
      name: true,
      condition: true,
      active: true,
    },
  });

  const byPrestashopId = new Map(
    products.map((product) => [product.prestashopId, product])
  );

  const missing = [];
  const alreadyCorrect = [];
  const toUpdate = [];
  const conflicts = [];
  const titleDifferences = [];

  for (const row of audit) {
    const product = byPrestashopId.get(row.prestashopId);

    if (!product) {
      missing.push(row);
      continue;
    }

    if (product.condition === row.condition) {
      alreadyCorrect.push({ ...row, product });
      continue;
    }

    // GOOD est la valeur par défaut donnée aux anciens produits lors de
    // l'ajout du nouveau champ "condition". Elle est donc migratable.
    if (product.condition === "GOOD") {
      toUpdate.push({ ...row, product });
    } else {
      // Ne jamais écraser automatiquement une valeur déjà choisie manuellement.
      conflicts.push({ ...row, product });
    }

    const oldTitle = normalize(row.auditTitle);
    const dbTitle = normalize(product.name);
    if (oldTitle && dbTitle && oldTitle !== dbTitle) {
      titleDifferences.push({
        prestashopId: row.prestashopId,
        auditTitle: row.auditTitle,
        dbTitle: product.name,
      });
    }
  }

  console.log("\n==================================================");
  console.log(" FAST CASH — MIGRATION DES ETATS PRODUITS");
  console.log("==================================================");
  console.log(`Mode                  : ${apply ? "APPLICATION" : "DRY-RUN (aucune écriture)"}`);
  console.log(`Introuvables autorisés : ${allowMissing ? "OUI" : "NON"}`);
  console.log(`Lignes audit           : ${audit.length}`);
  console.log(`Produits retrouvés     : ${products.length}`);
  console.log(`Introuvables           : ${missing.length}`);
  console.log(`Déjà corrects          : ${alreadyCorrect.length}`);
  console.log(`À mettre à jour        : ${toUpdate.length}`);
  console.log(`Conflits protégés      : ${conflicts.length}`);
  console.log(`Titres différents      : ${titleDifferences.length}`);

  printCounts(
    "Répartition de l'audit :",
    countBy(audit, (row) => row.condition)
  );

  printCounts(
    "Mises à jour prévues :",
    countBy(toUpdate, (row) => row.condition)
  );

  if (missing.length) {
    console.log("\n⚠️  Exemples introuvables :");
    for (const row of missing.slice(0, 10)) {
      console.log(`  #${row.prestashopId} — ${row.auditTitle}`);
    }
  }

  if (conflicts.length) {
    console.log("\n🛡️  Conflits protégés (NON écrasés par défaut) :");
    for (const row of conflicts.slice(0, 20)) {
      console.log(
        `  #${row.prestashopId} — actuel=${row.product.condition} → audit=${row.condition} — ${row.product.name}`
      );
    }
  }

  if (!apply) {
    console.log("\n✅ DRY-RUN terminé : aucune donnée n'a été modifiée.");
    console.log(
      `Pour appliquer après validation :\n  node --env-file=.env.local scripts/migrate-product-conditions.mjs --apply --allow-missing --confirm=${CONFIRM_APPLY}`
    );
    return;
  }

  if (confirmValue !== CONFIRM_APPLY) {
    console.error(
      `\n❌ Application bloquée. La confirmation exacte est requise : --confirm=${CONFIRM_APPLY}`
    );
    process.exit(1);
  }

  if (missing.length > 0 && !allowMissing) {
    console.error(
      "\n❌ Application bloquée : certains prestashopId de l'audit sont introuvables."
    );
    console.error(
      "Après validation du dry-run, tu peux explicitement les ignorer avec --allow-missing."
    );
    process.exit(1);
  }

  if (missing.length > 0 && allowMissing) {
    console.log(
      `\n⚠️  ${missing.length} produit(s) introuvable(s) seront ignorés explicitement.`
    );
  }

  if (conflicts.length > 0 && !forceConflicts) {
    console.error(
      "\n❌ Application bloquée : des produits possèdent déjà un état manuel différent."
    );
    console.error(
      "Le script refuse de les écraser. Vérifie-les avant toute action."
    );
    process.exit(1);
  }

  const finalUpdates = forceConflicts
    ? [...toUpdate, ...conflicts]
    : toUpdate;

  if (finalUpdates.length === 0) {
    console.log("\n✅ Rien à modifier.");
    return;
  }

  // Backup avant écriture, dans le dossier temporaire du système
  // pour éviter qu'il soit ajouté par erreur à Git.
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    os.tmpdir(),
    `fastcash-product-condition-backup-${timestamp}.json`
  );

  const backup = {
    createdAt: new Date().toISOString(),
    databaseHost: (() => {
      try {
        return new URL(connectionString).host;
      } catch {
        return "unknown";
      }
    })(),
    products: finalUpdates.map((row) => ({
      id: row.product.id,
      prestashopId: row.product.prestashopId,
      name: row.product.name,
      oldCondition: row.product.condition,
      newCondition: row.condition,
    })),
  };

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`\n💾 Sauvegarde créée avant écriture :`);
  console.log(`   ${backupPath}`);

  const grouped = new Map();
  for (const row of finalUpdates) {
    const ids = grouped.get(row.condition) ?? [];
    ids.push(row.product.id);
    grouped.set(row.condition, ids);
  }

  const operations = [];
  for (const [condition, ids] of grouped.entries()) {
    operations.push(
      prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { condition },
      })
    );
  }

  const results = await prisma.$transaction(operations);
  const updatedCount = results.reduce((sum, result) => sum + result.count, 0);

  console.log(`\n✅ Migration terminée : ${updatedCount} produit(s) mis à jour.`);

  const verification = await prisma.product.findMany({
    where: { prestashopId: { in: auditIds } },
    select: { prestashopId: true, condition: true },
  });

  const verifiedMap = new Map(
    verification.map((row) => [row.prestashopId, row.condition])
  );

  const failures = audit.filter(
    (row) =>
      verifiedMap.has(row.prestashopId) &&
      verifiedMap.get(row.prestashopId) !== row.condition
  );

  if (failures.length) {
    console.error(
      `\n⚠️  Vérification : ${failures.length} produit(s) n'ont pas l'état attendu.`
    );
    process.exitCode = 2;
  } else {
    console.log("✅ Vérification finale : tous les produits ciblés sont cohérents.");
  }

  console.log("\nPour revenir en arrière si nécessaire :");
  console.log(
    `node --env-file=.env.local scripts/migrate-product-conditions.mjs --rollback="${backupPath}" --confirm=${CONFIRM_ROLLBACK}`
  );
}

main()
  .catch((error) => {
    console.error("\n❌ Migration interrompue :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
