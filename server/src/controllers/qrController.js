const { db } = require('../../db');
const { users, mealStatus, scanLogs, volunteers } = require('../../db/schema');
const { eq, and, isNull, desc, inArray, sql, count } = require('drizzle-orm');
const crypto = require('crypto');
const XLSX = require('xlsx');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();
const QRCode = require('qrcode');
const archiver = require('archiver');
const { Readable } = require('stream');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Helper to get setting from DB with fallback
const getSetting = async (key, fallback) => {
    try {
        const record = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
        return record.length > 0 ? record[0].value : fallback;
    } catch (e) {
        return fallback;
    }
};

// Event dates will be handled dynamically in the logic below

// Helper to process a list of user rows (from Excel or JSON)
const processImportData = async (data) => {
    const insertedUsers = [];
    const errors = [];

    for (const row of data) {
        // Normalize keys for fuzzy matching
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            normalizedRow[normalizedKey] = String(row[key]).trim();
        });

        // Helper to get value from multiple possible keys
        const getValue = (possibleKeys) => {
            for (const key of possibleKeys) {
                if (normalizedRow[key]) return normalizedRow[key];
            }
            return '';
        };

        const expoId = getValue(['expoid', 'id', 'studentid', 'enrollmentno', 'prn']);
        let name = getValue(['name', 'fullname', 'studentname', 'candidatename']);
        if (!name) {
            const first = getValue(['firstname', 'fname']);
            const last = getValue(['surname', 'lastname', 'lname']);
            if (first || last) {
                name = [first, last].filter(Boolean).join(' ');
            }
        }

        const email = getValue(['email', 'gmail', 'mail', 'emailaddress']);
        const mobile = getValue(['mobile', 'phone', 'contact', 'whatsapp', 'mobileno']);
        const type = String(getValue(['type', 'participanttype', 'category'])).toLowerCase();
        const participantType = type.includes('poster') ? 'poster' : 'normal';

        if (!name) {
            const hasData = Object.values(row).some(val => String(val).trim() !== '');
            if (hasData) {
                errors.push({ row, error: 'Could not identify Name.' });
            }
            continue;
        }

        try {
            let existing = [];
            if (expoId) {
                existing = await db.select().from(users).where(eq(users.expoId, expoId)).limit(1);
            } else if (email) {
                existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
            }

            const userData = {
                name: name,
                email: email || null,
                mobile: mobile || null,
                expoId: expoId || null,
                participantType: participantType,
            };

            let userId;
            if (existing.length > 0) {
                userId = existing[0].id;
                await db.update(users).set(userData).where(eq(users.id, userId));
                insertedUsers.push({ name, status: 'updated' });
            } else {
                const inserted = await db.insert(users).values(userData).returning({ id: users.id });
                userId = inserted[0].id;
                await db.insert(mealStatus).values({ userId });
                await db.update(users).set({ qrCode: String(userId) }).where(eq(users.id, userId));
                insertedUsers.push({ name, status: 'created' });
            }
        } catch (err) {
            errors.push({ name: name || 'Unknown', error: err.message });
        }
    }
    return { insertedUsers, errors };
};

// Helper to get transporter
const getTransporter = () => {
    if (!process.env.FROM_EMAIL || !process.env.EMAIL_PASS) {
        throw new Error("Email credentials missing in environment variables.");
    }
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        pool: true,
        maxConnections: 20,
        maxMessages: 500,
        auth: {
            user: process.env.FROM_EMAIL,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Generate a secure random token
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Import Users from Excel/CSV
exports.importUsersFromFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = XLSX.readFile(req.file.path);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const { insertedUsers, errors } = await processImportData(data);
        fs.unlinkSync(req.file.path);

        res.json({ message: 'Import completed', total: data.length, successCount: insertedUsers.length, errorCount: errors.length, errors });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
};

exports.importFromGoogleSheet = async (req, res) => {
    try {
        let { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL required' });

        // Convert common Google Sheets URLs to CSV export format
        if (url.includes('docs.google.com/spreadsheets')) {
            const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (idMatch) {
                url = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
            }
        }

        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const workbook = XLSX.read(response.data, { type: 'buffer' });
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const { insertedUsers, errors } = await processImportData(data);
        res.json({ message: 'Google Sheet import completed', total: data.length, successCount: insertedUsers.length, errorCount: errors.length, errors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch or process Google Sheet: ' + error.message });
    }
};

// Generate QR Codes (Actually just updates missing qrCodes if any)
exports.generateQRCodes = async (req, res) => {
    try {
        const allUsers = await db.select().from(users);
        const results = [];
        for (const user of allUsers) {
            if (!user.qrCode) {
                await db.update(users).set({ qrCode: String(user.id) }).where(eq(users.id, user.id));
                results.push({ id: user.id, status: 'generated' });
            }
        }
        res.json({ message: 'QR Generation completed', count: results.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Get QR Details / Determine Next Meal
exports.getQRDetails = async (req, res) => {
    try {
        const token = req.params.token || req.body.token || req.query.token;
        const userId = parseInt(token);

        if (!token || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid or missing User ID/Token' });
        }

        const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!userRecord.length) {
            return res.status(404).json({ valid: false, message: 'User not found' });
        }

        const user = userRecord[0];
        const status = await db.select().from(mealStatus).where(eq(mealStatus.userId, user.id)).limit(1).then(rows => rows[0]);

        const day1Date = await getSetting('DAY1_DATE', '2026-03-27');
        const day2Date = await getSetting('DAY2_DATE', '2026-03-28');

        // Determine Next Meal
        let nextMeal = null;
        let warning = null;
        const scanCount = user.totalScans || 0;
        const userStatus = user.status || 'active';

        // Date Check
        const today = new Date().toISOString().split('T')[0];
        // For testing/mocking, we might want to override today's date if provided in query
        const mockDate = req.query.date;
        const currentDate = mockDate || today;

        if (user.participantType === 'poster') {
            if (scanCount === 0) {
                nextMeal = "Day1 Breakfast";
                if (currentDate === day2Date) warning = "Day1 Breakfast Pending";
            } else if (scanCount === 1) {
                nextMeal = "Day1 Lunch";
                if (currentDate === day2Date) warning = "Day1 Lunch Pending";
            } else {
                nextMeal = "All Meals Finished";
            }
        } else {
            // Normal
            if (scanCount === 0) {
                nextMeal = "Day1 Breakfast";
                if (currentDate === day2Date) warning = "Day1 Breakfast Pending";
            } else if (scanCount === 1) {
                nextMeal = "Day1 Lunch";
                if (currentDate === day2Date) warning = "Day1 Lunch Pending";
            } else if (scanCount === 2) {
                nextMeal = "Day2 Breakfast";
                if (currentDate === day1Date) warning = "Early Scan: Day2 Breakfast";
            } else if (scanCount === 3) {
                nextMeal = "Day2 Lunch";
                if (currentDate === day1Date) warning = "Early Scan: Day2 Lunch";
            } else {
                nextMeal = "All Meals Finished";
            }
        }

        res.json({
            valid: true,
            user,
            mealStatus: status,
            nextMeal,
            warning,
            scanCount,
            currentDate,
            isDateMismatch: !!warning // If there's a date-related warning, we block the action
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Scan and Approve QR
exports.scanQRCode = async (req, res) => {
    try {
        const token = req.params.token || req.body.token;
        const { scannedBy } = req.body;
        const userId = parseInt(token);

        if (!token || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid or missing User ID/Token' });
        }

        // Concurrent scan prevention: Use a transaction or select for update
        await db.transaction(async (tx) => {
            const userRecord = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
            if (!userRecord.length) {
                throw new Error('User not found');
            }

            const user = userRecord[0];
            const scanCount = user.totalScans || 0;
            const maxScans = user.participantType === 'poster' ? 2 : 4;

            if (user.status === 'locked') {
                throw new Error('Token is Locked/Disabled');
            }

            if (scanCount >= maxScans) {
                throw new Error('All Meals Already Used');
            }

            // Date Validation
            const today = new Date().toISOString().split('T')[0];
            const currentDate = req.body.date || today;

            const day1Date = await getSetting('DAY1_DATE', '2026-03-27');
            const day2Date = await getSetting('DAY2_DATE', '2026-03-28');

            // Determine meal type and required date
            let mealKey = '';
            let mealLabel = '';
            let requiredDate = '';

            if (user.participantType === 'poster') {
                if (scanCount === 0) { mealKey = 'day1Breakfast'; mealLabel = 'Day1 Breakfast'; requiredDate = day1Date; }
                else if (scanCount === 1) { mealKey = 'day1Lunch'; mealLabel = 'Day1 Lunch'; requiredDate = day1Date; }
            } else {
                if (scanCount === 0) { mealKey = 'day1Breakfast'; mealLabel = 'Day1 Breakfast'; requiredDate = day1Date; }
                else if (scanCount === 1) { mealKey = 'day1Lunch'; mealLabel = 'Day1 Lunch'; requiredDate = day1Date; }
                else if (scanCount === 2) { mealKey = 'day2Breakfast'; mealLabel = 'Day2 Breakfast'; requiredDate = day2Date; }
                else if (scanCount === 3) { mealKey = 'day2Lunch'; mealLabel = 'Day2 Lunch'; requiredDate = day2Date; }
            }

            // STRICT RESTRICTION: Block if date doesn't match
            if (currentDate !== requiredDate) {
                throw new Error(`STRICT BLOCK: ${mealLabel} access is only valid on ${requiredDate}. (Current: ${currentDate})`);
            }

            // Update user scan count
            await tx.update(users).set({
                totalScans: scanCount + 1
            }).where(eq(users.id, userId));

            // Update meal status
            const statusUpdate = {};
            statusUpdate[mealKey] = 'used';
            await tx.update(mealStatus).set(statusUpdate).where(eq(mealStatus.userId, userId));

            // Log scan
            await tx.insert(scanLogs).values({
                userId: userId,
                scanNumber: scanCount + 1,
                mealType: mealLabel,
                scannedBy: scannedBy || 'volunteer'
            });
        });

        res.json({
            valid: true,
            message: 'Meal Approved'
        });

    } catch (error) {
        console.error(error);
        res.status(400).json({ valid: false, message: error.message });
    }
};

// Fetch Stats
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await db.select({ count: count() }).from(users);

        // Meal served stats
        const d1b = await db.select({ count: count() }).from(mealStatus).where(eq(mealStatus.day1Breakfast, 'used'));
        const d1l = await db.select({ count: count() }).from(mealStatus).where(eq(mealStatus.day1Lunch, 'used'));
        const d2b = await db.select({ count: count() }).from(mealStatus).where(eq(mealStatus.day2Breakfast, 'used'));
        const d2l = await db.select({ count: count() }).from(mealStatus).where(eq(mealStatus.day2Lunch, 'used'));

        const recentScans = await db.select({
            scanId: scanLogs.id,
            scanTime: scanLogs.scanTime,
            mealType: scanLogs.mealType,
            userName: users.name,
            expoId: users.expoId
        })
            .from(scanLogs)
            .leftJoin(users, eq(scanLogs.userId, users.id))
            .orderBy(desc(scanLogs.scanTime))
            .limit(10);

        res.json({
            stats: {
                totalRegistered: totalUsers[0].count,
                day1Breakfast: d1b[0].count,
                day1Lunch: d1l[0].count,
                day2Breakfast: d2b[0].count,
                day2Lunch: d2l[0].count,
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
            scanId: scanLogs.id,
            scanTime: scanLogs.scanTime,
            mealType: scanLogs.mealType,
            userName: users.name,
            expoId: users.expoId,
            scannedBy: scanLogs.scannedBy,
            scanNumber: scanLogs.scanNumber
        })
            .from(scanLogs)
            .leftJoin(users, eq(scanLogs.userId, users.id))
            .orderBy(desc(scanLogs.scanTime));

        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Download QRs
exports.downloadQRs = async (req, res) => {
    try {
        const { userIds } = req.body;
        let targetUsers;
        if (!userIds || userIds === 'all') {
            targetUsers = await db.select().from(users);
        } else {
            targetUsers = await db.select().from(users).where(inArray(users.id, userIds));
        }

        if (targetUsers.length === 0) {
            return res.status(404).json({ error: 'No users found' });
        }

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment('qrcodes.zip');
        archive.pipe(res);

        for (const user of targetUsers) {
            // QR stores only the user_id (as requested)
            const qrValue = String(user.id);
            const buffer = await QRCode.toBuffer(qrValue, {
                errorCorrectionLevel: 'H',
                margin: 1,
                width: 300
            });

            const filename = `${user.expoId || user.id}_${user.name.replace(/[^a-z0-9]/gi, '_')}.png`;
            archive.append(buffer, { name: filename });
        }

        await archive.finalize();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};

// Send QR via Email
exports.sendQRViaEmail = async (req, res) => {
    try {
        const { userId, subject, body } = req.body;
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(rows => rows[0]);
        if (!user || !user.email) return res.status(404).json({ error: "User or email not found" });

        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        const qrValue = `${baseUrl}/scan/${user.id}`;
        const qrBuffer = await QRCode.toBuffer(qrValue, {
            errorCorrectionLevel: 'H', margin: 1, width: 300
        });

        // Placeholder replacement
        const finalSubject = (subject || 'Your Food Access QR Code').replace(/{name}/g, user.name).replace(/{expoId}/g, user.expoId || user.id);
        const finalBody = (body || `<h2>Hello {name},</h2><p>Your meal QR code is attached.</p>`).replace(/{name}/g, user.name).replace(/{expoId}/g, user.expoId || user.id);

        const transporter = getTransporter();
        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: user.email,
            subject: finalSubject,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                    ${finalBody.replace(/\n/g, '<br/>')}
                    <div style="margin-top: 20px; text-align: center; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                        <p style="font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Your Digital Identity</p>
                        <img src="cid:qr" width="220" style="display: block; margin: 0 auto;"/>
                        <p style="font-size: 12px; color: #444; margin-top: 10px;"><b>Expo ID: ${user.expoId || user.id}</b></p>
                    </div>
                    <p style="font-size: 12px; color: #666; font-style: italic; margin-top: 20px;">
                        A downloadable copy of your QR code is also attached to this email for your convenience.
                    </p>
                </div>
            `,
            attachments: [
                { 
                    filename: 'identity.png', 
                    content: qrBuffer, 
                    cid: 'qr', 
                    contentDisposition: 'inline' 
                },
                { 
                    filename: `EXPO_QR_${user.expoId || user.id}.png`, 
                    content: qrBuffer, 
                    contentDisposition: 'attachment' 
                }
            ]
        });

        // Mark as sent in DB
        await db.update(users).set({ emailSent: 'yes' }).where(eq(users.id, user.id));

        res.json({ message: `Email sent to ${user.email}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Send Bulk Emails
exports.sendBulkQRViaEmail = async (req, res) => {
    try {
        const { userIds, subject, body, onlyUnsent } = req.body;
        
        let targetUsers = await db.select().from(users).where(
            onlyUnsent === true 
            ? sql`${users.email} IS NOT NULL AND ${users.email} != '' AND ${users.emailSent} = 'no'`
            : sql`${users.email} IS NOT NULL AND ${users.email} != ''`
        );
        if (userIds && userIds !== 'all') {
            const idSet = new Set(userIds.map(String));
            targetUsers = targetUsers.filter(u => idSet.has(String(u.id)));
        }

        const results = { sent: 0, failed: 0 };
        const transporter = getTransporter();
        let lastError = null;

        // Grouping logic: Process in chunks of 50 for large datasets (e.g., 1000 users)
        const chunkSize = 50;
        for (let i = 0; i < targetUsers.length; i += chunkSize) {
            const chunk = targetUsers.slice(i, i + chunkSize);
            console.log(`[BULK] PROCESING BATCH ${Math.floor(i / chunkSize) + 1}/${Math.ceil(targetUsers.length/chunkSize)} (${chunk.length} participants)`);

            // Send batch concurrently to be faster but stable
            const baseUrl = process.env.APP_URL || 'http://localhost:3000';
            await Promise.all(chunk.map(async (user) => {
                try {
                    const qrValue = `${baseUrl}/scan/${user.id}`;
                    const qrBuffer = await QRCode.toBuffer(qrValue);

                    const finalSubject = (subject || 'Your Food Access QR Code').replace(/{name}/g, user.name).replace(/{expoId}/g, user.expoId || user.id);
                    const finalBody = (body || `<h2>Hello {name},</h2><p>Your meal QR code is attached.</p>`).replace(/{name}/g, user.name).replace(/{expoId}/g, user.expoId || user.id);

                    await transporter.sendMail({
                        from: process.env.FROM_EMAIL,
                        to: user.email,
                        subject: finalSubject,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                                ${finalBody.replace(/\n/g, '<br/>')}
                                <div style="margin-top: 20px; text-align: center; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                                    <p style="font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Your Digital Identity</p>
                                    <img src="cid:qr" width="220" style="display: block; margin: 0 auto;"/>
                                    <p style="font-size: 12px; color: #444; margin-top: 10px;"><b>Expo ID: ${user.expoId || user.id}</b></p>
                                </div>
                                <p style="font-size: 12px; color: #666; font-style: italic; margin-top: 20px;">
                                    A downloadable copy of your QR code is also attached to this email for your convenience.
                                </p>
                            </div>
                        `,
                        attachments: [
                            { 
                                filename: 'identity.png', 
                                content: qrBuffer, 
                                cid: 'qr', 
                                contentDisposition: 'inline' 
                            },
                            { 
                                filename: `EXPO_QR_${user.expoId || user.id}.png`, 
                                content: qrBuffer, 
                                contentDisposition: 'attachment' 
                            }
                        ]
                    });
                    
                    // Mark as sent in DB
                    await db.update(users).set({ emailSent: 'yes' }).where(eq(users.id, user.id));
                    
                    results.sent++;
                } catch (err) {
                    console.error(`[BULK ERROR] ${user.email}:`, err.message);
                    lastError = err.message;
                    results.failed++;
                }
            }));

            console.log(`[BULK PROGRESS] Sent ${results.sent} of ${targetUsers.length} total.`);

            // Pause between batches to avoid throttle/spam limits (500ms)
            if (i + chunkSize < targetUsers.length) {
                await new Promise(res => setTimeout(res, 500));
            }
        }

        res.json({ ...results, lastError });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const usersList = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            mobile: users.mobile,
            expoId: users.expoId,
            qrCode: users.qrCode,
            participantType: users.participantType,
            totalScans: users.totalScans,
            status: users.status,
            emailSent: users.emailSent,
            createdAt: users.createdAt,
            mealStatus: {
                day1Breakfast: mealStatus.day1Breakfast,
                day1Lunch: mealStatus.day1Lunch,
                day2Breakfast: mealStatus.day2Breakfast,
                day2Lunch: mealStatus.day2Lunch,
            }
        })
            .from(users)
            .leftJoin(mealStatus, eq(users.id, mealStatus.userId));

        res.json(usersList);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, mobile, expoId, participantType, mealStatus: mealState } = req.body;

        // Transaction for consistency
        await db.transaction(async (tx) => {
            const inserted = await tx.insert(users).values({
                name, email, mobile, expoId,
                participantType: participantType || 'normal',
                status: req.body.status || 'active'
            }).returning({ id: users.id });

            const userId = inserted[0].id;

            // Set QR Code (using ID as string)
            await tx.update(users).set({ qrCode: String(userId) }).where(eq(users.id, userId));

            // Initialize Meal Status
            await tx.insert(mealStatus).values({
                userId,
                day1Breakfast: mealState?.day1Breakfast || 'not_used',
                day1Lunch: mealState?.day1Lunch || 'not_used',
                day2Breakfast: mealState?.day2Breakfast || 'not_used',
                day2Lunch: mealState?.day2Lunch || 'not_used'
            });

            // Calculate total scans if any were set manually
            let count = 0;
            if (mealState) {
                if (mealState.day1Breakfast === 'used') count++;
                if (mealState.day1Lunch === 'used') count++;
                if (mealState.day2Breakfast === 'used') count++;
                if (mealState.day2Lunch === 'used') count++;
            }
            if (count > 0) {
                await tx.update(users).set({ totalScans: count }).where(eq(users.id, userId));
            }
        });

        res.json({ message: "User created and initialized" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobile, expoId, participantType, mealStatus: mealState } = req.body;
        const userId = Number(id);

        await db.transaction(async (tx) => {
            // Update Core User Info
            await tx.update(users).set({
                name, email, mobile, expoId, participantType,
                status: req.body.status
            }).where(eq(users.id, userId));

            // Update Meal Status if provided
            if (mealState) {
                await tx.update(mealStatus).set({
                    day1Breakfast: mealState.day1Breakfast,
                    day1Lunch: mealState.day1Lunch,
                    day2Breakfast: mealState.day2Breakfast,
                    day2Lunch: mealState.day2Lunch
                }).where(eq(mealStatus.userId, userId));

                // Sync totalScans count based on current mealStatus
                let count = 0;
                if (mealState.day1Breakfast === 'used') count++;
                if (mealState.day1Lunch === 'used') count++;
                if (mealState.day2Breakfast === 'used') count++;
                if (mealState.day2Lunch === 'used') count++;

                await tx.update(users).set({ totalScans: count }).where(eq(users.id, userId));
            }
        });

        res.json({ message: "User profile updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = Number(id);
        await db.delete(scanLogs).where(eq(scanLogs.userId, userId));
        await db.delete(mealStatus).where(eq(mealStatus.userId, userId));
        await db.delete(users).where(eq(users.id, userId));
        res.json({ message: "User deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteScanRecord = async (req, res) => {
    try {
        const { id } = req.params;
        await db.delete(scanLogs).where(eq(scanLogs.id, id));
        res.json({ message: "Scan record deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Settings CRUD
exports.getSettings = async (req, res) => {
    try {
        const allSettings = await db.select().from(settings);
        const settingsMap = {};
        allSettings.forEach(s => settingsMap[s.key] = s.value);

        // Ensure defaults are present in response if not in DB
        if (!settingsMap['DAY1_DATE']) settingsMap['DAY1_DATE'] = '2026-03-27';
        if (!settingsMap['DAY2_DATE']) settingsMap['DAY2_DATE'] = '2026-03-28';

        res.json(settingsMap);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const newSettings = req.body; // e.g., { DAY1_DATE: '2026-03-27', ... }
        for (const [key, value] of Object.entries(newSettings)) {
            const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
            if (existing.length > 0) {
                await db.update(settings).set({ value }).where(eq(settings.key, key));
            } else {
                await db.insert(settings).values({ key, value });
            }
        }
        res.json({ message: "Settings updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
