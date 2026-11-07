import { getDb, seedDemoMachines } from "../server/db";

async function main() {
  const inserted = await seedDemoMachines();
  console.log(inserted ? "Added clearly labelled Vayal demo listings." : "Demo listings already exist; no changes made.");
}

main()
  .catch(error => {
    console.error("Demo seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const db = await getDb();
    if (db) await db.$client.end();
  });
