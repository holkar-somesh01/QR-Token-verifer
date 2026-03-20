const { db } = require('./db/index');
const { users, mealStatus } = require('./db/schema');
const { eq } = require('drizzle-orm');

async function testSelect() {
    try {
        console.log("Running Join Query test...");
        const result = await db.select({ id: users.id }).from(users).leftJoin(mealStatus, eq(users.id, mealStatus.userId));
        console.log("Query Successful! Rows found:", result.length);
        process.exit(0);
    } catch (e) {
        console.error("❌ QUERY FAILED:", e.message);
        console.error("SQL PARAMS:", e.params);
        process.exit(1);
    }
}

testSelect();
