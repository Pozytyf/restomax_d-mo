import { getKnex } from './knex.ts';

async function main() {
  const command = process.argv[2] || 'latest';
  const knex = getKnex();

  try {
    if (command === 'rollback') {
      const [batch, log] = await knex.migrate.rollback();
      console.log(`Knex rollback batch ${batch}:`, log);
    } else if (command === 'status') {
      const [completed, pending] = await knex.migrate.list();
      console.log('Completed migrations:', completed);
      console.log('Pending migrations:', pending);
    } else {
      const [batch, log] = await knex.migrate.latest();
      console.log(`Knex migrate:latest batch ${batch}:`, log);
    }
  } finally {
    await knex.destroy();
  }
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
