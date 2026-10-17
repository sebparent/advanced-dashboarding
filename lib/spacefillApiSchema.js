// Transforme la vraie spécification OpenAPI de l'API Spacefill (api.spacefill.fr)
// en un catalogue de champs standard, utilisé pour la détection automatique.
// Appelé uniquement côté serveur (route handler), jamais depuis un composant client.

const OPERATION_SCHEMAS = {
  create_articles: ["InputPostMasterItem"],
  get_articles: ["OutputListMasterItem"],
  create_orders: ["InputCreatesOrderAction"],
  get_orders: ["OutputOrderWithMasterItem"],
  track_shipments: ["CreateTourInput", "InputShipmentEventSyncItemModel"],
};

const IGNORED_FIELDS = new Set([
  "id",
  "external_keys",
  "shipper_external_keys",
  "metadata",
  "custom_fields",
  "archived_at",
  "sync_date",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
]);

function fieldsFromSchema(schemas, schemaName) {
  const schema = schemas[schemaName];
  if (!schema || !schema.properties) return [];

  return Object.entries(schema.properties)
    .filter(([key, def]) => !def.deprecated)
    .filter(([key]) => !IGNORED_FIELDS.has(key))
    .filter(([, def]) => def.type !== "object" && def.type !== "array")
    .map(([key, def]) => ({ field: key, label: def.title || key }));
}

// `openapiSpec` est le JSON complet exporté depuis api.spacefill.fr (ou sa doc).
// Retourne { fieldCatalog, catalogByOperation } prêt à l'emploi pour le mapping.
export function extractFieldCatalog(openapiSpec) {
  const schemas = openapiSpec?.components?.schemas || {};
  const catalogByOperation = {};
  const fieldsByKey = new Map();

  for (const [operation, schemaNames] of Object.entries(OPERATION_SCHEMAS)) {
    const fields = schemaNames.flatMap((name) => fieldsFromSchema(schemas, name));
    catalogByOperation[operation] = fields.map((f) => f.field);
    for (const f of fields) {
      if (!fieldsByKey.has(f.field)) fieldsByKey.set(f.field, f);
    }
  }

  const fieldCatalog = Array.from(fieldsByKey.values()).map((f) => ({
    field: f.field,
    label: f.label,
    aliases: [f.field, f.label],
  }));

  return { fieldCatalog, catalogByOperation };
}
