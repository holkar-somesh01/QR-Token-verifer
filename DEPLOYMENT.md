# Google Sheet Scanner - Live Deployment Guide

This project consists of a **Next.js Frontend** and an **Express Backend**.

## 1. GitHub Setup
1. Create a new repository on GitHub.
2. Run the following commands in your terminal:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

## 2. Backend Deployment (Vercel)
1. Go to [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your GitHub repository.
3. **Configure Project**:
   - **Project Name**: `google-sheet-scanner-api` (or similar)
   - **Root Directory**: `server`
   - **Framework Preset**: `Other`
4. **Environment Variables**: Add all variables from `server/.env`:
   - `ADMIN_ID`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
   - `DATABASE_URL`
   - `NODE_ENV`: `production`
5. Click **Deploy**.
6. Copy the deployed URL (e.g., `https://google-sheet-scanner-api.vercel.app`).

## 3. Frontend Deployment (Vercel)
1. Go to Vercel and click **Add New Project**.
2. Select the **same** GitHub repository.
3. **Configure Project**:
   - **Project Name**: `google-sheet-scanner`
   - **Root Directory**: `client`
   - **Framework Preset**: `Next.js`
4. **Environment Variables**: Add variables from `client/.env.local` plus the API URL:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`: Your frontend URL (e.g., `https://google-sheet-scanner.vercel.app`)
   - `NEXT_PUBLIC_API_URL`: The URL you copied from the **Backend Deployment** (e.g., `https://google-sheet-scanner-api.vercel.app/api`)
5. Click **Deploy**.

## 4. Google Cloud Console Update
1. Update your **Authorized Redirect URIs** in Google Cloud Console to include:
   - `https://your-frontend-url.vercel.app/api/auth/callback/google`
2. Update **Authorized Javascript Origins**:
   - `https://your-frontend-url.vercel.app`
