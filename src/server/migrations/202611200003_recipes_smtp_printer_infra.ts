import type { Knex } from 'knex';

/**
 * Migration Knex :
 * 1. Table `menu_item_recipes` (fiches techniques / recettes reliant un plat aux ingrédients de stock).
 * 2. Paramètres SMTP production configurables sur `stock_alert_settings`.
 * 3. Paramètres d'impression thermique ESC/POS sur `restaurants` et `tenants`.
 */
export async function up(knex: Knex): Promise<void> {
  const hasRecipes = await knex.schema.hasTable('menu_item_recipes');
  if (!hasRecipes) {
    await knex.schema.createTable('menu_item_recipes', (table) => {
      table.string('id').primary();
      table.string('restaurant_id').notNullable();
      table.string('menu_item_id').notNullable();
      table.string('stock_id').notNullable();
      table.float('quantity_per_unit').notNullable();
      table.string('created_at').notNullable();
      table.string('updated_at').notNullable();
      table.unique(['menu_item_id', 'stock_id'], {
        indexName: 'uq_recipe_item_stock',
      });
      table.index(['restaurant_id'], 'idx_recipes_restaurant');
    });
  }

  if (await knex.schema.hasTable('stock_alert_settings')) {
    const cols = [
      'smtp_host',
      'smtp_port',
      'smtp_secure',
      'smtp_user',
      'smtp_pass',
      'smtp_from',
    ] as const;
    for (const col of cols) {
      const exists = await knex.schema.hasColumn('stock_alert_settings', col);
      if (!exists) {
        await knex.schema.alterTable('stock_alert_settings', (table) => {
          if (col === 'smtp_port') {
            table.integer(col).notNullable().defaultTo(587);
          } else if (col === 'smtp_secure') {
            table.integer(col).notNullable().defaultTo(0);
          } else {
            table.string(col).notNullable().defaultTo('');
          }
        });
      }
    }
  }

  for (const tbl of ['restaurants', 'tenants']) {
    if (await knex.schema.hasTable(tbl)) {
      const hasPrinter = await knex.schema.hasColumn(
        tbl,
        'printer_settings_json',
      );
      if (!hasPrinter) {
        await knex.schema.alterTable(tbl, (table) => {
          table
            .text('printer_settings_json')
            .notNullable()
            .defaultTo(
              '{"paperWidth":"80mm","connectionType":"BROWSER","printerHost":"","printerPort":9100,"autoPrintReceipt":false,"autoPrintKitchenTicket":false}',
            );
        });
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('menu_item_recipes');
}
