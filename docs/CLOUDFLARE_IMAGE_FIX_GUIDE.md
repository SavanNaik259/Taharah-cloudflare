# Firebase Storage CORS Setup for Cloudflare Pages

To allow your Cloudflare Pages site to load images directly from Firebase Storage without CORS errors, you must set a CORS policy on your bucket.

### 1. Create a `cors.json` file
Create a file named `cors.json` on your local machine with the following content:

```json
[
  {
    "origin": ["https://taharah-cloudflarei.pages.dev", "http://localhost:5000"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

### 2. Apply the policy using gsutil
Open your terminal (with Google Cloud SDK installed) and run:

```bash
gsutil cors set cors.json gs://studio-7642357109-d9026.firebasestorage.app
```

### 3. Alternative: Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **Cloud Storage > Buckets**.
3. Select `studio-7642357109-d9026.firebasestorage.app`.
4. Go to the **Permissions** tab.
5. Ensure `allUsers` has the `Storage Object Viewer` role if you want truly public images (bypassing the need for tokens for simple reads).

### 4. Cloudflare Environment Variables
Make sure these are set in the Cloudflare Pages Dashboard under **Settings > Variables**:
- `FIREBASE_STORAGE_BUCKET`: `studio-7642357109-d9026.firebasestorage.app`
- `FIREBASE_PROJECT_ID`: `studio-7642357109-d9026`
