import pg from "pg";

const { Client } = pg;

async function runPostPushMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL!;
  const isSupabase = url.includes("supabase.co");

  const client = new Client({
    connectionString: url,
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION update_customer_stats_on_delivery()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
          IF NEW.customer_id IS NOT NULL THEN
            UPDATE customers
            SET
              total_orders = total_orders + 1,
              total_spent  = total_spent + NEW.total_amount,
              updated_at   = NOW()
            WHERE id = NEW.customer_id
              AND is_deleted = FALSE;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_customer_stats_on_delivery ON orders;
    `);

    await client.query(`
      CREATE TRIGGER trg_customer_stats_on_delivery
      AFTER UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_customer_stats_on_delivery();
    `);

    console.log("[db] Trigger trg_customer_stats_on_delivery applied.");
  } finally {
    await client.end();
  }
}

runPostPushMigrations().catch((e) => {
  console.error("[db] Migration error:", e.message);
  process.exit(1);
});
