const { pgTable, text, serial, integer, timestamp, jsonb } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Users Table
const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    mobile: text('mobile'),
    email: text('email'),
    expoId: text('expo_id'),
    qrCode: text('qr_code').unique(), // Stores user_id or unique token
    participantType: text('participant_type').default('normal'), // 'normal' or 'poster'
    totalScans: integer('total_scans').default(0),
    status: text('status').default('active'), // 'active' or 'locked'
    createdAt: timestamp('created_at').defaultNow(),
});

// Meal_Status Table
const mealStatus = pgTable('meal_status', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull().unique(),
    day1Breakfast: text('day1_breakfast').default('not_used'), // 'not_used', 'used'
    day1Lunch: text('day1_lunch').default('not_used'),
    day2Breakfast: text('day2_breakfast').default('not_used'),
    day2Lunch: text('day2_lunch').default('not_used'),
});

// Scan_Logs Table
const scanLogs = pgTable('scan_logs', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    scanNumber: integer('scan_number').notNull(),
    mealType: text('meal_type').notNull(), // 'Day1 Breakfast', etc.
    scanTime: timestamp('scan_time').defaultNow(),
    scannedBy: text('scanned_by'), // Volunteer ID or name
});

// Volunteers Table
const volunteers = pgTable('volunteers', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    mobile: text('mobile'),
    role: text('role').default('volunteer'),
});

// Admin Users Table (for dashboard login)
const admins = pgTable('admins', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    password: text('password').notNull(), // Hashed
    role: text('role').default('admin'),
    createdAt: timestamp('created_at').defaultNow(),
});

module.exports = {
    users,
    mealStatus,
    scanLogs,
    volunteers,
    admins,
};
