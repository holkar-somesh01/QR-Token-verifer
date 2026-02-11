# Google Sheet Scanner System (Client-Server Architecture)

## Setup Instructions

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the following APIs:
   - **Google Sheets API**
   - **Google Drive API**
   - **Gmail API**
4. Configure **OAuth Consent Screen**:
   - User Type: External.
   - Add Test Users.
   - Scopes:
     - `.../auth/drive.file`
     - `.../auth/spreadsheets`
     - `.../auth/gmail.send`
     - `.../auth/userinfo.email`
5. Create **Credentials** -> **OAuth Client ID** (Web Application):
   - Authorized Javascript Origins: `http://localhost:3000`
   - Authorized Redirect URIs: `http://localhost:3000/api/auth/callback/google`

### 2. Environment Variables
**Client (`client/.env.local`)**:
```
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
NEXTAUTH_SECRET=random_secret
NEXTAUTH_URL=http://localhost:3000
```

**Server (`server/.env`)**:
```
PORT=5000
GOOGLE_SHEET_ID=your_sheet_id
QR_STORAGE_FOLDER_NAME=App_QR_Storage
QR_SECRET_SALT=secret_salt
```

### 3. Running the Server to Backend
Open a terminal in `server/`:
```bash
cd server
npm install
npm run dev
```
The server runs on `http://localhost:5000`.

### 4. Running the Client
Open a terminal in `client/`:
```bash
cd client
npm install
npm run dev
```
The client runs on `http://localhost:3000`.

## Architecture Flow
1. **Auth**: Client authenticates with Google via NextAuth.
2. **Token Exchange**: Client retrieves the `accessToken` from the session.
3. **API Requests**: RTK Query (Redux) sends requests to `localhost:5000` with `Authorization: Bearer <token>`.
4. **Backend Logic**: Express server receives token, authenticates with Google APIs, and performs logic (Sync, Scan, Email).

## Troubleshooting

### Error 400: redirect_uri_mismatch
If you see this error when logging in with Google:
1. Go to **Google Cloud Console** > **APIs & Services** > **Credentials**.
2. Click the pencil icon next to your **OAuth 2.0 Client ID**.
3. Under **Authorized redirect URIs**, ensure you have added exactly:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Click **Save**. Updates may take a few minutes.
