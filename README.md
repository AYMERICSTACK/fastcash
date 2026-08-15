# FAST CASH Genève V2 — Next.js Starter

## Démarrage

```bash
npm install
npm run dev
```

## Pages déjà prêtes

- `/` accueil premium
- `/categories/apple`
- `/categories/samsung`
- `/categories/montres`
- `/categories/telephonie`
- `/categories/informatique`
- `/categories/image-son`
- `/produits/[slug]`
- `/panier`
- `/estimation`
- `/contact`

## Import produits

Le fichier `data/products.json` a été généré depuis l'export PrestaShop CSV fourni.
Quand tu récupères l'export complet 1456 lignes, on remplace ce JSON avec le même script d'import.

## Paiement

La route `/api/checkout` est prête pour Stripe Checkout. Il faut ajouter les clés dans `.env.local`.
