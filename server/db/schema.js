const { pgTable, text, serial, integer, timestamp, jsonb } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Users Table
const users = pgTable('users', {
    id: serial('id').primaryKey(),
    studentId: text('student_id').notNull().unique(), // Unique identifier from sheet
    fullName: text('full_name').notNull(),
    email: text('email'),
    mobile: text('mobile'),
    class: text('class'),
    customFields: jsonb('custom_fields'), // JSON string for extra columns
    createdAt: timestamp('created_at').defaultNow(),
});

// QR Codes Table
const qrCodes = pgTable('qr_codes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    token: text('token').notNull().unique(),
    status: text('status').default('unused'), // 'unused', 'used', 'expired'
    createdAt: timestamp('created_at').defaultNow(),
    expiresAt: timestamp('expires_at'),
    usedAt: timestamp('used_at'),
});

// QR Scans Table (Logs)
const qrScans = pgTable('qr_scans', {
    id: serial('id').primaryKey(),
    qrId: integer('qr_id').references(() => qrCodes.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    scannedBy: text('scanned_by'), // Admin/Scanner ID
    scannedAt: timestamp('scanned_at').defaultNow(),
    ipAddress: text('ip_address'),
    deviceInfo: text('device_info'),
});

// Admin Users Table
const admins = pgTable('admins', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    password: text('password').notNull(), // Hashed
    role: text('role').default('admin'),
    createdAt: timestamp('created_at').defaultNow(),
});

module.exports = {
    users,
    qrCodes,
    qrScans,
    admins,
};
