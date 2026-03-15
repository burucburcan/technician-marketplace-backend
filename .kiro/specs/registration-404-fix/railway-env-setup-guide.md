# Railway Environment Variables Setup Guide

## Task 3.1: Configure VITE_API_URL in Railway

### Problem
The frontend `.env.production` file has the correct `VITE_API_URL` configuration locally, but Railway doesn't automatically read this file. Environment variables must be manually configured in Railway's dashboard for the web-frontend service.

### Current Configuration (Local)
```
VITE_API_URL=https://technician-marketplacebackend-production.up.railway.app
```

### Steps to Configure Railway Environment Variables

#### 1. Access Railway Dashboard
1. Go to https://railway.app/
2. Log in with your GitHub account
3. Navigate to your project: `technician-marketplace`

#### 2. Select Web Frontend Service
1. In the Railway dashboard, you should see multiple services:
   - `backend` (already deployed)
   - `web-frontend` (needs environment variable configuration)
2. Click on the `web-frontend` service

#### 3. Add Environment Variables
1. Click on the "Variables" tab in the web-frontend service
2. Click "New Variable" or "Add Variable"
3. Add the following environment variables:

```
VITE_API_URL=https://technician-marketplacebackend-production.up.railway.app
VITE_GOOGLE_MAPS_API_KEY=AIzaSyBrZPsrae-PpwnGoEoAnt78EqtRX6BWCQg
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51T56ZO4EhvnAGmXnkaGkOaHfWIvwyhyPPCgD4uQ0vK0Eiw1y2haAPQRiHUh0SMArXHZYd2h6MhQsX5PCU110hybd00yWiHaJTU
```

**CRITICAL**: Make sure `VITE_API_URL` is set exactly as shown above, including the `https://` protocol and without a trailing slash.

#### 4. Verify Environment Variables
After adding the variables, verify they appear in the list:
- ✅ `VITE_API_URL` = `https://technician-marketplacebackend-production.up.railway.app`
- ✅ `VITE_GOOGLE_MAPS_API_KEY` = (your API key)
- ✅ `VITE_STRIPE_PUBLISHABLE_KEY` = (your publishable key)

#### 5. Important Notes

**Vite Environment Variables:**
- Vite requires environment variables to be available at **build time**, not runtime
- Variables must be prefixed with `VITE_` to be exposed to the client
- Railway will automatically trigger a rebuild when environment variables are added or changed

**Build Process:**
- When you add/update environment variables, Railway will automatically trigger a new deployment
- The build process will include the environment variables
- The built JavaScript bundle will have the correct `VITE_API_URL` value

#### 6. Verify Deployment
After adding the environment variables:
1. Railway will automatically trigger a new deployment
2. Monitor the build logs to ensure the build completes successfully
3. Check the deployment logs for any errors
4. Once deployed, the frontend should use the correct API URL

### Expected Outcome
After completing this task:
- ✅ `VITE_API_URL` is configured in Railway's dashboard
- ✅ Railway triggers a new build with the environment variable
- ✅ The deployed frontend includes the correct API URL
- ✅ Registration requests will be sent to the correct endpoint

### Verification
To verify the environment variable is correctly loaded:
1. Open the deployed frontend in a browser
2. Open DevTools Console
3. Type: `import.meta.env.VITE_API_URL`
4. Should return: `https://technician-marketplacebackend-production.up.railway.app`

If it returns `undefined`, the environment variable was not loaded during the build.

### Troubleshooting

**If the variable doesn't appear to be loaded:**
1. Verify the variable name is exactly `VITE_API_URL` (case-sensitive)
2. Verify the variable is set in the **web-frontend** service (not backend)
3. Check Railway build logs for any errors
4. Try triggering a manual redeploy after adding the variable

**If Railway doesn't auto-deploy after adding variables:**
1. Go to the web-frontend service
2. Click "Deploy" → "Redeploy"
3. Monitor the build logs

### Next Steps
After completing this task:
- Proceed to Task 3.2: Add build-time validation for VITE_API_URL
- This will ensure future builds fail early if the variable is missing
