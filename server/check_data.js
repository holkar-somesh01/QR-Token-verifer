const { db } = require('./db/index');
const { settings, scanLogs } = require('./db/schema');
const { sql, desc } = require('drizzle-orm');

async function checkData() {
    try {
        console.log("--- SETTINGS ---");
        const allSettings = await db.select().from(settings);
        console.log(JSON.stringify(allSettings, null, 2));

        console.log("\n--- SCAN LOGS COUNT ---");
        const countRes = await db.select({ count: sql`count(*)` }).from(scanLogs);
        console.log(countRes[0].count);

        console.log("\n--- RECENT SCAN LOGS ---");
        const logs = await db.select().from(scanLogs).orderBy(desc(scanLogs.scanTime)).limit(10);
        console.log(JSON.stringify(logs, null, 2));

        process.exit(0);
    } catch (e) {
        console.error("❌ FAILED:", e.message);
        process.exit(1);
    }
}

checkData();
