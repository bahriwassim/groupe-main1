# Fix pour l'erreur "order_id is ambiguous"

## 🔍 Problème identifié

L'erreur `column reference "order_id" is ambiguous` se produit lors de la validation d'un produit dans un ordre de production (page `/production/production-orders/[id]`).

### Cause racine

Le trigger PostgreSQL `update_production_order_status_from_items()` contient des requêtes SQL avec des références de colonnes ambiguës. Lorsque la fonction fait des jointures ou des requêtes impliquant plusieurs tables qui ont des colonnes avec le même nom (comme `order_id`), PostgreSQL ne sait pas quelle table utiliser.

## ✅ Solution appliquée

Le trigger a été corrigé pour :
1. Utiliser des **alias de tables** explicites (`poi` pour `production_order_items`, `po` pour `production_orders`)
2. **Qualifier toutes les colonnes** avec leur alias de table (ex: `poi.production_status`, `po.status`)
3. Éviter toute ambiguïté dans les clauses WHERE et SELECT

## 📋 Instructions d'application

### Option 1 : Via Supabase Dashboard (Recommandé)

1. Ouvrez le SQL Editor de Supabase : https://supabase.com/dashboard/project/kmgmhgqopmlxtdhnugpz/sql/new

2. Copiez-collez le contenu du fichier `database/FIX_ORDER_ID_AMBIGUOUS.sql`

3. Cliquez sur le bouton **"Run"** pour exécuter le script

4. Vérifiez que le message de confirmation s'affiche : ✅ Trigger recréé avec succès

### Option 2 : Via ligne de commande

Si vous avez `psql` installé :

```bash
psql "postgresql://postgres.kmgmhgqopmlxtdhnugpz:LeS20!0Groupe!AnisPM!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -f database/FIX_ORDER_ID_AMBIGUOUS.sql
```

### Option 3 : Via script Node.js

```bash
node scripts/apply-order-id-fix.mjs
```

Puis suivez les instructions affichées.

## 🧪 Test de validation

Après avoir appliqué le fix :

1. Connectez-vous avec le rôle **Production** (Anis PM)
2. Allez sur http://localhost:3000/production/production-orders/9edb22bf-8422-4e90-a56f-ecf31a27f4bc
3. Essayez de valider un produit dans la section "Validation par produit"
4. L'erreur `order_id is ambiguous` ne devrait plus apparaître

## 📝 Modifications techniques

### Avant (code problématique)

```sql
FROM production_order_items
WHERE production_order_id = v_order_id;

SELECT status INTO v_current_status
FROM production_orders
WHERE id = v_order_id;

UPDATE production_orders
SET status = 'production_validee', updated_at = NOW()
WHERE id = v_order_id;
```

### Après (code corrigé)

```sql
FROM production_order_items poi
WHERE poi.production_order_id = v_order_id;

SELECT po.status INTO v_current_status
FROM production_orders po
WHERE po.id = v_order_id;

UPDATE production_orders po
SET status = 'production_validee', updated_at = NOW()
WHERE po.id = v_order_id;
```

## 🔗 Fichiers modifiés

- ✅ `database/FIX_ORDER_ID_AMBIGUOUS.sql` - Script SQL de correction
- ✅ `scripts/apply-order-id-fix.mjs` - Script d'assistance pour l'application
- ✅ `INSTRUCTIONS_FIX_ORDER_ID.md` - Ce fichier d'instructions

## ⚠️ Notes importantes

- Ce fix doit être appliqué **une seule fois** sur la base de données
- Le trigger sera automatiquement utilisé pour toutes les futures validations
- Aucun redémarrage de l'application n'est nécessaire après l'application du fix
- Les validations déjà effectuées ne seront pas affectées

## 🆘 En cas de problème

Si l'erreur persiste après application du fix :

1. Vérifiez que le script a bien été exécuté (vérifiez les logs dans Supabase)
2. Vérifiez que le trigger existe :
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgrelid = 'production_order_items'::regclass;
   ```
3. Vérifiez la définition du trigger :
   ```sql
   SELECT pg_get_functiondef('update_production_order_status_from_items'::regproc);
   ```
4. Consultez les logs de l'application pour plus de détails sur l'erreur
