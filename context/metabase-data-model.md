# Metabase data model

TODO: fill in from `~/.claude/projects/*/memory/advanced-dashboarding-superset.md` and re-verify against Metabase.

- Base: Metabase database id 2 ("SpaceFill Prod Data Analysis 01 - Mirror prod api"). `demo01` (id 75) is empty, don't use it.
- Schemas: `analytics` (order flow: exit_orders, entry_orders, warehouses, incidents, references, custom_fields...) and `logistic_management` (stock: stocks, stock_deltas, master_items).
- Multi-tenant key: `customer_id` (text UUID) + `customer_name`, present on all business tables (~947 clients, cached in `public.client_directory`).
- Stock formulas (validated digit-for-digit, e.g. L'Oréal fb730580...: WMS 42522 / réel 50659 / prév 51010):
  - WMS = SUM(logistic_management.stocks.quantity) WHERE visible_in_stock
  - RÉEL (default when user just says "stock") = SUM(stock_deltas.quantity) WHERE is_forecasted=false
  - PRÉVISIONNEL = SUM(stock_deltas.quantity) (all rows)
  - Join: stock_deltas.stock_int_id = stocks.id_int; client filter on stocks.customer_id
  - Reference via master_items (master_item_id = mi.id, item_reference); warehouse via analytics.warehouses (w.id = s.warehouse_id, column is `name`)
- Custom fields: `analytics.exit_orders.custom_fields` (jsonb), keys discovered per-client at query time from a sample of recent exit_orders. The function maps French names to keys (e.g. "type de campagne" → campaign_type) and queries with `NULLIF(TRIM(custom_fields->>'key'),'')` to avoid whitespace/nbsp duplicates.

Keep this file in sync whenever a formula or schema detail is re-validated with the product team.
