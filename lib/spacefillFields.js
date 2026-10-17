// Catalogue des champs standard Spacefill et aide à la détection automatique
// à partir des en-têtes d'un fichier Excel client.

export const OPERATIONS = [
  { key: "create_articles", label: "Intégrer des articles (créer des produits)" },
  { key: "get_articles", label: "Récupérer des articles" },
  { key: "create_orders", label: "Créer des commandes" },
  { key: "get_orders", label: "Récupérer des commandes" },
  { key: "track_shipments", label: "Suivre des expéditions" },
];

// Repli utilisé tant que le vrai catalogue Spacefill (api.spacefill.fr) n'a pas
// été importé et stocké — voir app/api/spacefill-schema/route.js.
export const DEFAULT_FIELD_CATALOG = [
  { field: "sku", label: "Référence produit (SKU)", aliases: ["sku", "reference", "referenceproduit", "codeproduit", "codearticle", "articlecode", "productreference"] },
  { field: "ean", label: "Code-barres (EAN)", aliases: ["ean", "eancode", "codebarre", "gtin", "barcode"] },
  { field: "name", label: "Nom du produit", aliases: ["nom", "nomproduit", "libelle", "libelleproduit", "designation", "productname", "name", "title"] },
  { field: "description", label: "Description", aliases: ["description", "descriptif"] },
  { field: "quantity", label: "Quantité", aliases: ["quantite", "qty", "quantity", "stock", "stockquantity"] },
  { field: "weight_kg", label: "Poids (kg)", aliases: ["poids", "poidskg", "weight", "weightkg"] },
  { field: "volume_m3", label: "Volume (m³)", aliases: ["volume", "volumem3"] },
  { field: "length_cm", label: "Longueur (cm)", aliases: ["longueur", "longueurcm", "length"] },
  { field: "width_cm", label: "Largeur (cm)", aliases: ["largeur", "largeurcm", "width"] },
  { field: "height_cm", label: "Hauteur (cm)", aliases: ["hauteur", "hauteurcm", "height"] },
  { field: "unit_price", label: "Prix unitaire", aliases: ["prix", "prixunitaire", "unitprice", "price"] },
  { field: "currency", label: "Devise", aliases: ["devise", "currency"] },
  { field: "order_reference", label: "Numéro de commande", aliases: ["numerocommande", "numcommande", "referencecommande", "ordernumber", "orderreference", "orderid"] },
  { field: "customer_reference", label: "Référence client", aliases: ["referenceclient", "customerreference", "clientref"] },
  { field: "order_date", label: "Date de commande", aliases: ["datecommande", "orderdate"] },
  { field: "delivery_date", label: "Date de livraison", aliases: ["datelivraison", "deliverydate"] },
  { field: "address_line1", label: "Adresse", aliases: ["adresse", "adresse1", "addressline1", "address"] },
  { field: "address_line2", label: "Complément d'adresse", aliases: ["adresse2", "addressline2", "complementadresse"] },
  { field: "postal_code", label: "Code postal", aliases: ["codepostal", "zipcode", "postalcode", "cp"] },
  { field: "city", label: "Ville", aliases: ["ville", "city"] },
  { field: "country", label: "Pays", aliases: ["pays", "country"] },
  { field: "contact_name", label: "Nom du contact", aliases: ["nomcontact", "contactname", "nomclient", "customername"] },
  { field: "contact_email", label: "Email", aliases: ["email", "emailclient", "contactemail"] },
  { field: "contact_phone", label: "Téléphone", aliases: ["telephone", "tel", "phone", "contactphone"] },
  { field: "carrier", label: "Transporteur", aliases: ["transporteur", "carrier"] },
  { field: "tracking_number", label: "Numéro de suivi", aliases: ["numerosuivi", "trackingnumber", "tracking"] },
  { field: "incoterm", label: "Incoterm", aliases: ["incoterm"] },
  { field: "warehouse", label: "Entrepôt", aliases: ["entrepot", "warehouse", "site"] },
];

// Retire accents et caractères non alphanumériques pour comparer deux libellés.
export function normalize(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Transforme un en-tête Excel en clé de champ personnalisé lisible (snake_case).
export function slugify(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "champ";
}

// Essaie de reconnaître un champ standard Spacefill à partir d'un en-tête Excel.
export function matchStandardField(excelHeader, catalog = DEFAULT_FIELD_CATALOG) {
  const normalizedHeader = normalize(excelHeader);
  if (!normalizedHeader) return null;

  for (const entry of catalog) {
    if (entry.aliases.some((alias) => normalize(alias) === normalizedHeader)) {
      return entry;
    }
  }
  // Repli plus prudent : seulement pour des alias assez longs (>=5 caractères),
  // pour éviter que des mots courts et génériques ("name", "pays"...) ne matchent
  // n'importe quel en-tête composé qui les contient.
  for (const entry of catalog) {
    if (
      entry.aliases.some((alias) => {
        const normalizedAlias = normalize(alias);
        return normalizedAlias.length >= 5 && normalizedHeader.includes(normalizedAlias);
      })
    ) {
      return entry;
    }
  }
  return null;
}

// En-têtes qui indiquent une colonne contenant, une ligne par champ, la LISTE
// des noms de champs à mapper (gabarits de spécification SAP/EDI, par exemple) —
// plutôt qu'un tableau de données où chaque colonne EST un champ.
const FIELD_NAME_COLUMN_ALIASES = [
  "field name",
  "fieldname",
  "nom du champ",
  "nom champ",
  "champ",
  "nom de la colonne",
  "nom colonne",
  "column name",
  "technical name",
  "nom technique",
  "libelle du champ",
  "libellé du champ",
  "sap field",
  "nom du champ sap",
].map(normalize);

function dedupePreserveOrder(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

// Extrait la liste des champs à mapper à partir des lignes brutes d'une feuille Excel
// (XLSX.utils.sheet_to_json(sheet, { header: 1 })).
//
// Deux cas de figure sont supportés :
// - "table" : la première ligne contient les en-têtes, une colonne = un champ.
// - "list"  : une colonne du fichier s'appelle "Field Name" / "Nom du champ" etc.,
//             et chaque ligne en dessous donne un champ à mapper.
export function extractFieldNames(rows) {
  const rowsToScan = Math.min(rows.length, 30);

  for (let r = 0; r < rowsToScan; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell === undefined || cell === null) continue;
      if (!FIELD_NAME_COLUMN_ALIASES.includes(normalize(cell))) continue;

      const names = [];
      for (let rr = r + 1; rr < rows.length; rr++) {
        const value = rows[rr]?.[c];
        if (value === undefined || value === null) continue;
        const text = String(value).trim();
        if (text) names.push(text);
      }
      if (names.length > 0) {
        return { mode: "list", fieldNames: dedupePreserveOrder(names) };
      }
    }
  }

  const headerRow =
    rows.find((row) =>
      (row || []).some(
        (cell) => cell !== undefined && cell !== null && String(cell).trim() !== ""
      )
    ) || [];
  const fieldNames = headerRow
    .map((cell) => (cell === undefined || cell === null ? "" : String(cell).trim()))
    .filter(Boolean);
  return { mode: "table", fieldNames: dedupePreserveOrder(fieldNames) };
}

// Construit la proposition de correspondance pour chaque colonne du fichier Excel.
export function buildMapping(headers, catalog = DEFAULT_FIELD_CATALOG) {
  const usedCustomKeys = new Set();
  return headers.map((header) => {
    const match = matchStandardField(header, catalog);
    if (match) {
      return { column: header, type: "standard", field: match.field };
    }
    let customKey = slugify(header);
    let suffix = 2;
    while (usedCustomKeys.has(customKey)) {
      customKey = `${slugify(header)}_${suffix}`;
      suffix += 1;
    }
    usedCustomKeys.add(customKey);
    return { column: header, type: "custom", field: customKey };
  });
}

// Formate la correspondance finale (validée/éditée) en JSON prêt à l'emploi.
export function buildOutputJson(operations, mapping) {
  return {
    operations,
    mapping: mapping.map((row) => ({
      excel_column: row.column,
      spacefill_field:
        row.type === "custom" ? `custom_fields.${row.field}` : row.field,
      type: row.type,
    })),
  };
}
