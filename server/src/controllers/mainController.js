const { getGoogleClients, getOrCreateFolder } = require('../config/googleUtils');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Readable } = require('stream');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const QR_SECRET_SALT = process.env.QR_SECRET_SALT || "default_salt";
const QR_STORAGE_FOLDER_NAME = process.env.QR_STORAGE_FOLDER_NAME || "App_QR_Storage";

exports.syncSheet = async (req, res) => {
    try {
        const { drive, sheets } = getGoogleClients(req.accessToken);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: "Sheet1!A:G",
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) return res.status(200).json({ message: "No data" });

        const updates = [];
        const folderId = await getOrCreateFolder(drive, QR_STORAGE_FOLDER_NAME);

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const studentId = row[0];
            const qrUrl = row[3];

            if (studentId && (!qrUrl || qrUrl === "")) {
                const hash = crypto.createHmac("sha256", QR_SECRET_SALT).update(studentId).digest("hex");
                const qrBuffer = await QRCode.toBuffer(hash, {
                    errorCorrectionLevel: 'H', margin: 1, width: 300
                });

                const fileMetadata = { name: `${studentId}_QR.png`, parents: [folderId] };
                const media = { mimeType: "image/png", body: Readable.from(qrBuffer) };

                const file = await drive.files.create({
                    requestBody: fileMetadata, media: media, fields: "id, webViewLink",
                });

                updates.push({
                    range: `Sheet1!D${i + 1}`,
                    values: [[file.data.webViewLink]],
                });
            }
        }

        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: GOOGLE_SHEET_ID,
                requestBody: { valueInputOption: "USER_ENTERED", data: updates },
            });
        }

        res.json({ message: "Sync complete", updated: updates.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.scanQR = async (req, res) => {
    try {
        const { hash, deviceId } = req.body;
        const { sheets } = getGoogleClients(req.accessToken);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: "Sheet1!A:G",
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) return res.status(404).json({ error: "No data" });

        let foundIndex = -1;
        let studentData = null;

        for (let i = 1; i < rows.length; i++) {
            const sid = rows[i][0];
            const computedHash = crypto.createHmac("sha256", QR_SECRET_SALT).update(sid).digest("hex");
            if (computedHash === hash) {
                foundIndex = i;
                studentData = rows[i];
                break;
            }
        }

        if (foundIndex === -1) {
            return res.json({ status: "error", message: "Invalid Ticket" });
        }

        const status = studentData[4];
        if (status && status.toLowerCase() === "scanned") {
            return res.json({
                status: "warning",
                message: "Already Checked-in",
                student: { name: studentData[1], id: studentData[0] }
            });
        }

        const timestamp = new Date().toISOString();
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `Sheet1!E${foundIndex + 1}:G${foundIndex + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [["Scanned", timestamp, deviceId || "Unknown"]] }
        });

        res.json({
            status: "success",
            message: "Check-in Successful",
            student: { name: studentData[1], id: studentData[0] }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const { sheets } = getGoogleClients(req.accessToken);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: "Sheet1!A:G",
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) return res.json({ total: 0, scanned: 0, recent: [] });

        const dataRows = rows.slice(1);
        const total = dataRows.length;
        const scanned = dataRows.filter((r) => r[4] && r[4].toLowerCase() === "scanned");

        const recent = scanned.sort((a, b) => {
            const tA = new Date(a[5]).getTime();
            const tB = new Date(b[5]).getTime();
            return tB - tA;
        }).slice(0, 5).map((r) => ({
            name: r[1], id: r[0], time: r[5]
        }));

        res.json({ total, scannedCount: scanned.length, recent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.sendEmails = async (req, res) => {
    try {
        const { studentIds } = req.body;
        const { sheets, gmail, drive } = getGoogleClients(req.accessToken);

        const sheetRes = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: "Sheet1!A:G",
        });
        const rows = sheetRes.data.values;
        if (!rows) return res.status(404).json({ error: "No data" });

        const studentsToSend = rows.slice(1).filter((r) => studentIds.includes(r[0]));
        const results = [];

        for (const student of studentsToSend) {
            try {
                const [id, name, email, qrLink] = student;
                if (!email || !qrLink) {
                    results.push({ id, status: 'skipped' });
                    continue;
                }

                let fileId = "";
                if (qrLink.includes("id=")) {
                    fileId = qrLink.split("id=")[1].split("&")[0];
                } else if (qrLink.includes("/d/")) {
                    fileId = qrLink.split("/d/")[1].split("/")[0];
                }

                if (!fileId) continue;

                const imgRes = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
                const base64Image = Buffer.from(imgRes.data).toString('base64');
                const boundary = "NextPart_001";

                const message = [
                    `To: ${email}`,
                    `Subject: Event Ticket`,
                    `MIME-Version: 1.0`,
                    `Content-Type: multipart/related; boundary="${boundary}"`,
                    ``,
                    `--${boundary}`,
                    `Content-Type: text/html; charset="UTF-8"`,
                    ``,
                    `<html><body><h2>Hello ${name}</h2><img src="cid:qrImage"/></body></html>`,
                    ``,
                    `--${boundary}`,
                    `Content-Type: image/png`,
                    `Content-Transfer-Encoding: base64`,
                    `Content-ID: <qrImage>`,
                    ``,
                    base64Image,
                    ``,
                    `--${boundary}--`
                ].join("\n");

                const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
                results.push({ id, status: 'sent' });
            } catch (err) {
                results.push({ id: student[0], status: 'error' });
            }
        }
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
