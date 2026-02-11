const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const schema = require('./schema');
require('dotenv').config();

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.warn("WARNING: DATABASE_URL environment variable is not set. Database connection will likely fail.");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});


const db = drizzle(pool, { schema });

module.exports = { db };
