const { db } = require('../../db');
const { users, qrCodes, qrScans } = require('../../db/schema');
const { eq, and, isNull, desc, inArray, sql } = require('drizzle-orm');
const crypto = require('crypto');
const XLSX = require('xlsx');
const fs = require('fs');

const QRCode = require('qrcode');
const archiver = require('archiver');
const { Readable } = require('stream');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use standard smtp
    auth: {
        user: process.env.FROM_EMAIL || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

// Generate a secure random token
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Import Users from Excel/CSV
exports.importUsersFromFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        const insertedUsers = [];
        const errors = [];

        for (const row of data) {
            // Normalize keys for fuzzy matching
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                normalizedRow[normalizedKey] = String(row[key]).trim(); // Store trimmed value
            });

            // Helper to get value from multiple possible keys
            const getValue = (possibleKeys) => {
                for (const key of possibleKeys) {
                    if (normalizedRow[key]) return normalizedRow[key];
                }
                return '';
            };

            // Enhanced Mapping Logic
            const studentId = getValue(['id', 'studentid', 'enrollmentno', 'prn', 'email', 'gmail', 'emailgmailcom']); // Fallback to email if no ID

            let fullName = getValue(['name', 'fullname', 'studentname', 'candidatename']);
            if (!fullName) {
                const first = getValue(['firstname', 'fname']);
                const mid = getValue(['middlename', 'mname', 'middlename']);
                const last = getValue(['surname', 'lastname', 'lname', 'surnamename']);
                if (first || last) {
                    fullName = [first, mid, last].filter(Boolean).join(' ');
                }
            }

            const email = getValue(['email', 'gmail', 'mail', 'emailaddress', 'emailgmailcom']);
            const mobile = getValue(['mobile', 'phone', 'contact', 'whatsapp', 'mobileno']);
            const className = getValue(['class', 'department', 'branch', 'course', 'college', 'collegename', 'collegenameandcity', 'year']);

            if (!studentId || !fullName) {
                // Ignore empty rows
                const hasData = Object.values(row).some(val => String(val).trim() !== '');
                if (hasData) {
                    errors.push({ row, error: 'Could not identify ID or Name. Please check column headers.' });
                }
                continue;
            }

            try {
                // Check if user exists
                const existing = await db.select().from(users).where(eq(users.studentId, studentId)).limit(1);

                const userData = {
                    studentId: studentId,
                    fullName: fullName,
                    email: email || null,
                    mobile: mobile || null,
                    class: className || null,
                    customFields: row, // Store original row data for dynamic access
                };

                if (existing.length > 0) {
                    await db.update(users).set(userData).where(eq(users.studentId, studentId));
                    insertedUsers.push({ id: studentId, status: 'updated' });
                } else {
                    await db.insert(users).values(userData);
                    insertedUsers.push({ id: studentId, status: 'created' });
                }
            } catch (err) {
                console.error(err);
                errors.push({ studentId, error: err.message });
            }
        }

        // Cleanup file
        fs.unlinkSync(req.file.path);

        res.json({
            message: 'Import completed',
            total: data.length,
            successCount: insertedUsers.length,
            errorCount: errors.length,
            errors
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Generate QR Codes for Users
exports.generateQRCodes = async (req, res) => {
    try {
        const { userIds, regenerate } = req.body;

        // Validation
        if (!userIds && userIds !== 'all') {
            return res.status(400).json({ error: "userIds array or 'all' required" });
        }

        let targetUsers;
        if (userIds === 'all') {
            targetUsers = await db.select().from(users);
        } else {
            // userIds should be an array of user.id (integer)
            // But if frontend sends student_ids (string), we need to query differently.
            // Let's assume user.id (internal DB id) for now, or handle both.
            // If the input array has strings, assume studentId. If numbers, assume internal id.

            const isStringIds = userIds.some(id => typeof id === 'string');
            if (isStringIds) {
                targetUsers = await db.select().from(users).where(inArray(users.studentId, userIds));
            } else {
                targetUsers = await db.select().from(users).where(inArray(users.id, userIds));
            }
        }

        const results = [];

        for (const user of targetUsers) {
            // Check existing QR
            const existingQr = await db.select().from(qrCodes).where(eq(qrCodes.userId, user.id)).limit(1);

            let token;
            let status = 'generated';

            if (existingQr.length > 0) {
                if (!regenerate) {
                    results.push({ id: user.id, status: 'skipped', token: existingQr[0].token });
                    continue;
                }
                // Regenerate: Update existing logic
                token = generateToken();
                await db.update(qrCodes).set({
                    token: token,
                    status: 'unused',
                    createdAt: new Date(), // Reset created at? Yes.
                    expiresAt: null
                }).where(eq(qrCodes.id, existingQr[0].id));
                status = 'regenerated';
            } else {
                token = generateToken();
                await db.insert(qrCodes).values({
                    userId: user.id,
                    token: token,
                    status: 'unused',
                    createdAt: new Date(),
                    expiresAt: null,
                });
            }

            results.push({ id: user.id, status, token });
        }

        res.json({ message: 'QR Generation completed', count: results.length, results });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Validate and Scan QR
exports.scanQRCode = async (req, res) => {
    try {
        const { token } = req.params;
        // Also support body for flexibility?
        const tokenToScan = token || req.body.token;

        if (!tokenToScan) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const qrRecord = await db.select().from(qrCodes).where(eq(qrCodes.token, tokenToScan)).limit(1);

        if (!qrRecord.length) {
            return res.status(404).json({ valid: false, message: 'Invalid QR Code' });
        }

        const qr = qrRecord[0];

        // Status Checks
        if (qr.status === 'used') {
            const lastScan = await db.select().from(qrScans).where(eq(qrScans.qrId, qr.id)).orderBy(desc(qrScans.scannedAt)).limit(1);
            const scanTime = lastScan.length ? lastScan[0].scannedAt : 'unknown time';
            return res.status(400).json({
                valid: false,
                message: 'Code ALREADY USED',
                scannedAt: scanTime,
                previouslyScannedBy: lastScan.length ? lastScan[0].scannedBy : 'unknown'
            });
        }

        if (qr.status === 'expired') {
            return res.status(400).json({ valid: false, message: 'Code EXPIRED' });
        }

        if (qr.expiresAt && new Date() > new Date(qr.expiresAt)) {
            return res.status(400).json({ valid: false, message: 'Code EXPIRED' });
        }

        // --- SUCCESS CASE ---

        // Mark as used
        await db.update(qrCodes).set({
            status: 'used',
            usedAt: new Date()
        }).where(eq(qrCodes.id, qr.id));

        // Create Scan Record
        await db.insert(qrScans).values({
            qrId: qr.id,
            userId: qr.userId,
            scannedBy: req.user ? req.user.id : (req.body.scannedBy || 'anonymous'), // Flexible auth
            scannedAt: new Date(),
            ipAddress: req.ip || req.socket.remoteAddress,
            deviceInfo: req.headers['user-agent']
        });

        // Get User Details
        const user = await db.select().from(users).where(eq(users.id, qr.userId)).limit(1);

        res.json({
            valid: true,
            message: 'Scan Successful! Access Granted.',
            user: user[0],
            scanTime: new Date()
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};


// Fetch Stats
exports.getStats = async (req, res) => {
    try {
        const userCount = await db.select({ count: sql`count(*)` }).from(users);
        const qrCount = await db.select({ count: sql`count(*)` }).from(qrCodes);
        const scanCount = await db.select({ count: sql`count(*)` }).from(qrScans);

        // Recent Scans with User Info
        // Since we didn't setup relations in schema (exported relations), we can do manual join or just two queries.
        // For efficiency, let's just fetch scans and then users. Or use `.leftJoin` if supported.
        // Drizzle-orm select().leftJoin(...)

        const recentScans = await db.select({
            scanId: qrScans.id,
            scannedAt: qrScans.scannedAt,
            scannedBy: qrScans.scannedBy,
            userName: users.fullName,
            studentId: users.studentId,
            userClass: users.class
        })
            .from(qrScans)
            .leftJoin(users, eq(qrScans.userId, users.id))
            .orderBy(desc(qrScans.scannedAt))
            .limit(10);

        res.json({
            stats: {
                totalUsers: userCount[0].count,
                totalQRs: qrCount[0].count,
                totalScans: scanCount[0].count
            },
            recentScans
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Fetch Full Scan History
exports.getScanHistory = async (req, res) => {
    try {
        const history = await db.select({
            scanId: qrScans.id,
            scannedAt: qrScans.scannedAt,
            scannedBy: qrScans.scannedBy,
            userName: users.fullName,
            studentId: users.studentId,
            userClass: users.class,
            ipAddress: qrScans.ipAddress,
            deviceInfo: qrScans.deviceInfo
        })
            .from(qrScans)
            .leftJoin(users, eq(qrScans.userId, users.id))
            .orderBy(desc(qrScans.scannedAt));

        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};


// Download specific QRs as ZIP
exports.downloadQRs = async (req, res) => {
    try {
        const { userIds, format } = req.body;
        // Accepts array of userIds or filter? Maybe accept query params for filter?
        // Body is safer for large arrays.

        let targetQRs;
        // Fetch users + tokens
        // For simplicity, just fetch all generated tokens for requested users
        if (!userIds || userIds === 'all') {
            targetQRs = await db.select({
                userId: users.id,
                studentId: users.studentId,
                name: users.fullName,
                token: qrCodes.token
            })
                .from(qrCodes)
                .innerJoin(users, eq(qrCodes.userId, users.id));
        } else {
            const isStringIds = userIds.some(id => typeof id === 'string');
            if (isStringIds) {
                targetQRs = await db.select({
                    userId: users.id,
                    studentId: users.studentId,
                    name: users.fullName,
                    token: qrCodes.token
                })
                    .from(qrCodes)
                    .innerJoin(users, eq(qrCodes.userId, users.id))
                    .where(inArray(users.studentId, userIds));
            } else {
                // Assume numeric IDs
                targetQRs = await db.select({
                    userId: users.id,
                    studentId: users.studentId,
                    name: users.fullName,
                    token: qrCodes.token
                })
                    .from(qrCodes)
                    .innerJoin(users, eq(qrCodes.userId, users.id))
                    .where(inArray(users.id, userIds));
            }
        }

        if (targetQRs.length === 0) {
            return res.status(404).json({ error: 'No generated QR codes found for these users' });
        }

        const archive = archiver('zip', { zlib: { level: 9 } });

        res.attachment('qrcodes.zip');
        archive.pipe(res);

        for (const record of targetQRs) {
            const qrUrl = `${process.env.APP_URL || 'http://localhost:3000'}/scan/${record.token}`;
            // Or better: Use the API endpoint for scan? Or a frontend landing page?
            // Usually frontend URL: "t.ly/..." or direct link.
            // Let's assume "/scan/{token}" maps to frontend route.

            const buffer = await QRCode.toBuffer(qrUrl, {
                errorCorrectionLevel: 'H',
                margin: 1,
                width: 300
            });

            const filename = `${record.studentId}_${record.name.replace(/[^a-z0-9]/gi, '_')}.png`;
            archive.append(buffer, { name: filename });
        }

        await archive.finalize();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};

// Send QR via Email
// Send QR via Email (Single)
exports.sendQRViaEmail = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID required" });

        // Get user and their QR
        let user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(rows => rows[0]);
        if (!user) {
            user = await db.select().from(users).where(eq(users.studentId, userId)).limit(1).then(rows => rows[0]);
        }

        if (!user) return res.status(404).json({ error: "User not found" });
        if (!user.email) return res.status(400).json({ error: "User has no email address" });

        const qrRecord = await db.select().from(qrCodes).where(eq(qrCodes.userId, user.id)).limit(1);

        let token;
        if (!qrRecord.length) {
            // Auto-generate if missing?
            token = generateToken();
            await db.insert(qrCodes).values({
                userId: user.id,
                token: token,
                status: 'unused',
                createdAt: new Date(),
                expiresAt: null,
            });
        } else {
            token = qrRecord[0].token;
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
        const qrUrl = `${appUrl}/scan/${token}`;

        // Generate QR Image Buffer
        const qrBuffer = await QRCode.toBuffer(qrUrl, {
            errorCorrectionLevel: 'H', margin: 1, width: 300
        });

        const mailOptions = {
            from: process.env.FROM_EMAIL,
            to: user.email,
            subject: 'Your Event Access QR Code',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Hello ${user.fullName},</h2>
                    <p style="font-size: 16px; color: #555;">Here is your personal QR code for the event.</p>
                    <p style="font-size: 16px; color: #555;">Please present this at the entrance.</p>
                    
                    <div style="margin: 20px 0;">
                        <img src="cid:unique-qr-code" alt="QR Code" style="width: 250px; height: 250px; border: 1px solid #ddd; padding: 10px; border-radius: 5px;" />
                    </div>

                    <p style="color: #666; font-size: 14px; background-color: #f9f9f9; padding: 10px; border-radius: 5px; display: inline-block;">ID: <strong>${user.studentId}</strong></p>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #999;">If the QR code does not load, please contact support.</p>
                </div>
            `,
            attachments: [{
                filename: 'qrcode.png',
                content: qrBuffer,
                cid: 'unique-qr-code'
            }]
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: `Email sent to ${user.email}` });

    } catch (error) {
        console.error("Email error:", error);
        res.status(500).json({ error: "Failed to send email: " + error.message });
    }
};

// Send Bulk QRs via Email
exports.sendBulkQRViaEmail = async (req, res) => {
    try {
        const { userIds } = req.body; // Array of IDs or 'all'

        let targetUsers = [];
        if (!userIds || userIds === 'all') {
            // Fetch all users with email
            targetUsers = await db.select().from(users).where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`);
        } else {
            const isStringIds = userIds.some(id => typeof id === 'string');
            if (isStringIds) {
                targetUsers = await db.select().from(users).where(inArray(users.studentId, userIds));
            } else {
                targetUsers = await db.select().from(users).where(inArray(users.id, userIds));
            }
        }

        // Filter out users without email
        targetUsers = targetUsers.filter(u => u.email);

        if (targetUsers.length === 0) {
            return res.status(404).json({ error: "No users with email addresses found for selection." });
        }

        const results = { sent: 0, failed: 0, errors: [] };
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

        // Process in chunks to avoid overwhelming the mail server
        // But for <100 users, sequential or small parallel is fine.
        // Let's do sequential for safety and accurate reporting.

        for (const user of targetUsers) {
            try {
                // Get or Create QR
                let qrRecord = await db.select().from(qrCodes).where(eq(qrCodes.userId, user.id)).limit(1);
                let token;

                if (!qrRecord.length) {
                    token = generateToken();
                    await db.insert(qrCodes).values({
                        userId: user.id,
                        token: token,
                        status: 'unused',
                        createdAt: new Date(),
                        expiresAt: null,
                    });
                } else {
                    token = qrRecord[0].token;
                }

                const qrUrl = `${appUrl}/scan/${token}`;
                const qrBuffer = await QRCode.toBuffer(qrUrl, {
                    errorCorrectionLevel: 'H', margin: 1, width: 300
                });

                const mailOptions = {
                    from: process.env.FROM_EMAIL,
                    to: user.email,
                    subject: 'Your Event Access QR Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">Hello ${user.fullName},</h2>
                            <p style="font-size: 16px; color: #555;">Here is your personal QR code for the event.</p>
                            <p style="font-size: 16px; color: #555;">Please present this at the entrance.</p>
                            
                            <div style="margin: 20px 0;">
                                <img src="cid:unique-qr-code" alt="QR Code" style="width: 250px; height: 250px; border: 1px solid #ddd; padding: 10px; border-radius: 5px;" />
                            </div>

                            <p style="color: #666; font-size: 14px; background-color: #f9f9f9; padding: 10px; border-radius: 5px; display: inline-block;">ID: <strong>${user.studentId}</strong></p>
                            
                            <p style="margin-top: 30px; font-size: 12px; color: #999;">If the QR code does not load, please contact support.</p>
                        </div>
                    `,
                    attachments: [{
                        filename: 'qrcode.png',
                        content: qrBuffer,
                        cid: 'unique-qr-code'
                    }]
                };

                await transporter.sendMail(mailOptions);
                results.sent++;

            } catch (err) {
                console.error(`Failed to email user ${user.id}:`, err);
                results.failed++;
                results.errors.push({ userId: user.id, email: user.email, error: err.message });
            }
        }

        res.json({
            message: `Bulk email processing complete. Sent: ${results.sent}, Failed: ${results.failed}`,
            details: results
        });

    } catch (error) {
        console.error("Bulk Email error:", error);
        res.status(500).json({ error: "Failed to process bulk emails: " + error.message });
    }
};


// Delete Scan Record
exports.deleteScanRecord = async (req, res) => {
    try {
        const { id } = req.params;

        await db.delete(qrScans).where(eq(qrScans.id, id));

        res.json({ message: "Scan record deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        // updated to left join qr_codes
        const results = await db.select({
            id: users.id,
            studentId: users.studentId,
            fullName: users.fullName,
            email: users.email,
            mobile: users.mobile,
            class: users.class,
            qrToken: qrCodes.token,
            qrStatus: qrCodes.status
        })
            .from(users)
            .leftJoin(qrCodes, eq(users.id, qrCodes.userId));

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
