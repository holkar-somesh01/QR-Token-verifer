const { google } = require('googleapis');

const getGoogleClients = (accessToken) => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });
    const gmail = google.gmail({ version: "v1", auth });

    return { drive, sheets, gmail };
};

const getOrCreateFolder = async (drive, folderName) => {
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: "files(id, name)",
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    const createRes = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
    });

    return createRes.data.id;
};

module.exports = { getGoogleClients, getOrCreateFolder };
