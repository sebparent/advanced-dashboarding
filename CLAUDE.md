> Les règles d'interaction du bootcamp (mots simples, on construit sans discuter, utilisateur non technique) s'appliquent toujours — voir `AGENTS.md`. Ce fichier documente l'app réellement construite ici : **Connecteurs Spacefill**.

## Ce que fait cette app

Outil interne pour aider des sociétés externes à construire facilement un connecteur sur l'API Spacefill. Le participant (ou le futur développeur du connecteur) :

1. Coche ce dont il a besoin (intégrer des articles, en récupérer, créer des commandes, en récupérer, suivre des expéditions).
2. Donne un fichier Excel listant les champs qu'il veut faire correspondre.
3. L'outil détecte automatiquement, pour chaque champ du fichier, s'il correspond à un champ standard de l'API Spacefill ou s'il faut créer un champ personnalisé (`custom_fields`).
4. Il génère un JSON de mapping prêt à l'emploi (copiable / téléchargeable).

## Stack

Next.js 16 (App Router) + React 19, lecture Excel avec la librairie `xlsx`, Supabase (Postgres) pour stocker durablement le catalogue des champs Spacefill. Charte graphique Spacefill (`.claude/skills/spacefill-ui-design`).

## Comment ça marche (architecture)

- `app/page.js` — l'écran en 3 étapes (client component). Au chargement, il va chercher le catalogue de champs via `fetch("/api/spacefill-schema")`.
- `app/api/spacefill-schema/route.js` — route serveur qui lit la vraie spécification de l'API Spacefill stockée dans Supabase (table `app_settings`, clé `spacefill_openapi_spec`) et en extrait un catalogue de champs utilisable.
- `lib/spacefillApiSchema.js` — transforme le JSON OpenAPI brut en catalogue de champs par opération (`extractFieldCatalog`). Ignore les champs dépréciés et les champs techniques (id, metadata, timestamps...).
- `lib/spacefillFields.js` — logique de détection :
  - `extractFieldNames(rows)` : lit les lignes brutes d'un Excel et retrouve la liste des champs à mapper. Gère deux cas : un tableau classique (1 ligne d'en-têtes) **ou** un gabarit de spécification (une colonne "Field Name" / "Nom du champ" avec un champ par ligne en dessous — cas des exports type SAP).
  - `matchStandardField` / `buildMapping` : comparent chaque champ du fichier au catalogue (comparaison insensible aux accents/espaces, avec un filet de sécurité pour éviter les faux positifs sur des mots trop courts).
  - `buildOutputJson` : formate le résultat final.
  - `DEFAULT_FIELD_CATALOG` : catalogue de secours (champs logistiques génériques), utilisé uniquement si le vrai catalogue Spacefill n'est pas encore configuré dans Supabase.

## Le catalogue de champs Spacefill

La vraie spécification de l'API (`api.spacefill.fr`) a été collée dans la conversation puis stockée dans Supabase (pas le JSON complet avec toutes les routes/exemples — seulement les schémas utiles aux 5 opérations ci-dessus : `InputPostMasterItem`, `OutputListMasterItem`, `InputCreatesOrderAction`, `OutputOrderWithMasterItem`, `CreateTourInput`, `InputShipmentEventSyncItemModel`). Si la spec Spacefill évolue, il suffit de redonner le nouveau JSON pour que la table soit mise à jour — pas besoin de retoucher le code.

## État d'avancement

- Détection testée avec des fichiers synthétiques (tableau simple + gabarit type SAP avec colonne "Field Name") : OK.
- Test en cours avec un vrai fichier participant (export SAP "Outbound Material Master Data").
- Pas encore de sauvegarde des mappings générés (chaque session repart de zéro) — à ajouter si le besoin se confirme.
- Pas de déploiement Vercel pour l'instant.

## Où regarder

- `app/page.js` — l'écran et son état.
- `lib/spacefillFields.js` — toute la logique de détection/mapping.
- `lib/spacefillApiSchema.js` — extraction du catalogue depuis la spec OpenAPI.
- `app/api/spacefill-schema/route.js` — le pont entre Supabase et l'écran.
