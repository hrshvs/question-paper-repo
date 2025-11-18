# QPR Contribution Portal - Complete Setup Guide

This document provides a complete guide to set up the web-based contribution portal for the IISER Mohali Question Paper Repository.

## 🎯 What You're Building

A web interface that allows users to:
- Sign in with their GitHub account
- Upload multiple files to specific folder paths
- Automatically create a pull request to the main repository

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ A Cloudflare account (free tier)
- ✅ Node.js and npm installed (v16 or higher)
- ✅ Git installed
- ✅ Admin access to the GitHub repository
- ✅ Basic knowledge of command-line operations

---

## Quick Start

### 1️⃣ Install Wrangler

```powershell
npm install -g wrangler
```

### 2️⃣ Login to Cloudflare

```powershell
wrangler login
```

### 3️⃣ Create GitHub OAuth App

1. Visit: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Name:** QPR Contribution Portal
   - **Homepage:** https://iiserm.github.io/question-paper-repo
   - **Callback:** https://YOUR-WORKER.workers.dev/auth/callback (update later)
4. Save Client ID and Client Secret

### 4️⃣ Deploy Worker

```powershell
cd cloudflare-worker
npm install
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler deploy
```

### 5️⃣ Update Configuration

1. Update GitHub OAuth callback URL with your worker URL
2. Update `docs/contribute.js` with worker URL and Client ID
3. Commit and push changes

### 6️⃣ Test

Visit: https://iiserm.github.io/question-paper-repo/docs/contribute.html

---

## Detailed Setup

### Step 1: GitHub OAuth Application

GitHub OAuth allows users to authenticate so the system can create PRs on their behalf.

**Instructions:**

1. Navigate to: https://github.com/settings/developers

2. Click **"New OAuth App"** (or "OAuth Apps" → "New OAuth App")

3. Fill in the registration form:
   ```
   Application name: QPR Contribution Portal
   Homepage URL: https://iiserm.github.io/question-paper-repo
   Application description: Web portal for contributing to QPR (optional)
   Authorization callback URL: https://TEMP.workers.dev/auth/callback
   ```
   
   **Note:** We'll update the callback URL after deploying the worker

4. Click **"Register application"**

5. You'll see your **Client ID** - copy this

6. Click **"Generate a new client secret"** and copy the secret immediately
   - ⚠️ **Important:** You can only see the secret once!

7. Store these safely (you'll need them in Step 3)

---

### Step 2: Install and Configure Wrangler

Wrangler is Cloudflare's CLI tool for managing Workers.

**Installation:**

```powershell
# Install globally
npm install -g wrangler

# Verify installation
wrangler --version
```

**Login to Cloudflare:**

```powershell
wrangler login
```

This opens your browser and asks you to authorize Wrangler.

**Select Account:**

If you have multiple Cloudflare accounts, select the one you want to use.

---

### Step 3: Deploy the Cloudflare Worker

**Navigate to the worker directory:**

```powershell
cd cloudflare-worker
```

**Install dependencies:**

```powershell
npm install
```

**Optional: Customize worker name**

Edit `wrangler.toml` if you want a different name:
```toml
name = "qpr-contribution-worker"  # Change this if desired
```

**Add GitHub secrets:**

```powershell
# Add Client ID
wrangler secret put GITHUB_CLIENT_ID
# When prompted, paste your Client ID

# Add Client Secret
wrangler secret put GITHUB_CLIENT_SECRET
# When prompted, paste your Client Secret
```

**Deploy the worker:**

```powershell
wrangler deploy
```

**Copy the worker URL from the output:**
```
Published qpr-contribution-worker (1.23 sec)
  https://qpr-contribution-worker.YOUR-SUBDOMAIN.workers.dev
                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                    THIS IS YOUR WORKER URL
```

---

### Step 4: Update GitHub OAuth Callback

Now that you have your worker URL, update the GitHub OAuth app:

1. Go back to: https://github.com/settings/developers
2. Click on **"QPR Contribution Portal"**
3. Update **Authorization callback URL** to:
   ```
   https://qpr-contribution-worker.YOUR-SUBDOMAIN.workers.dev/auth/callback
   ```
   (Replace with YOUR actual worker URL)
4. Click **"Update application"**

---

### Step 5: Update Frontend Configuration

Edit `docs/contribute.js` and update the configuration at the top:

**Find these lines (around line 6-7):**

```javascript
const CONFIG = {
    WORKER_URL: 'https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev', // UPDATE THIS
    GITHUB_CLIENT_ID: 'YOUR_GITHUB_CLIENT_ID', // UPDATE THIS
    GITHUB_REPO_OWNER: 'IISERM',
    GITHUB_REPO_NAME: 'question-paper-repo',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
    ALLOWED_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'pptx', 'xlsx', 'zip', 'txt'],
};
```

**Update to:**

```javascript
const CONFIG = {
    WORKER_URL: 'https://qpr-contribution-worker.YOUR-SUBDOMAIN.workers.dev',  // Your actual worker URL
    GITHUB_CLIENT_ID: 'abc123def456',  // Your actual Client ID
    GITHUB_REPO_OWNER: 'IISERM',
    GITHUB_REPO_NAME: 'question-paper-repo',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
    ALLOWED_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'pptx', 'xlsx', 'zip', 'txt'],
};
```

---

### Step 6: Deploy to GitHub Pages

**Commit your changes:**

```powershell
git add docs/contribute.html docs/contribute.js docs/index.html docs/styles.css
git commit -m "Add web-based contribution portal"
git push origin main
```

**Wait for GitHub Pages to deploy** (usually takes 1-2 minutes)

---

### Step 7: Test the Portal

1. Visit: https://iiserm.github.io/question-paper-repo/docs/contribute.html

2. Click **"Sign in with GitHub"**

3. Authorize the application

4. Try uploading a test file:
   - Folder path: `Test/999/2025`
   - Upload a small PDF file
   - PR title: `Test: Upload system verification`
   - Click "Create Pull Request"

5. Verify the PR was created in your repository

6. Close/merge the test PR

---

## Configuration

### Environment Variables (Worker)

Set via `wrangler secret put`:

| Secret | Description | Required |
|--------|-------------|----------|
| `GITHUB_CLIENT_ID` | OAuth Client ID from GitHub | Yes |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret from GitHub | Yes |

### Configuration Variables (wrangler.toml)

```toml
GITHUB_REPO_OWNER = "IISERM"
GITHUB_REPO_NAME = "question-paper-repo"
FRONTEND_URL = "https://iiserm.github.io/question-paper-repo"
```

### Frontend Configuration (contribute.js)

```javascript
WORKER_URL: 'https://your-worker.workers.dev'
GITHUB_CLIENT_ID: 'your_client_id'
MAX_FILE_SIZE: 10 * 1024 * 1024  // 10 MB (free tier limit)
ALLOWED_EXTENSIONS: ['pdf', 'jpg', ...]
```

---

## Testing

### Test Checklist

- [ ] OAuth login works
- [ ] Can select folder path
- [ ] Can upload files (under 10 MB)
- [ ] File validation works (rejects large files)
- [ ] Can add multiple folders
- [ ] Progress indicators show
- [ ] PR is created successfully
- [ ] PR has correct title and description
- [ ] Files are in correct paths
- [ ] Success page shows PR link
- [ ] Can sign out and sign in again

### Test in Different Browsers

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile browser

---

## Troubleshooting

### Issue: "Failed to authenticate"

**Cause:** OAuth configuration mismatch

**Solutions:**
1. Verify callback URL in GitHub OAuth app matches worker URL exactly
2. Check that Client ID in `contribute.js` is correct
3. Verify secrets are set: `wrangler secret list`

---

### Issue: CORS errors in browser console

**Cause:** CORS not configured correctly

**Solutions:**
1. Check `FRONTEND_URL` in `wrangler.toml` matches your GitHub Pages URL
2. Redeploy worker: `wrangler deploy`
3. Clear browser cache and try again

---

### Issue: "Request entity too large"

**Cause:** File exceeds 10 MB limit

**Solutions:**
1. This is a Cloudflare free tier limitation
2. Either upgrade to paid plan ($5/mo for 100 MB limit)
3. Or instruct users to compress/reduce file sizes

---

### Issue: Worker not responding

**View worker logs:**
```powershell
wrangler tail
```

Then try the operation again to see real-time logs.

**Check worker status:**
Visit Cloudflare Dashboard → Workers & Pages → Your Worker

---

### Issue: PR not created

**Possible causes:**
1. User doesn't have permission to fork
2. Repository name/owner incorrect
3. Branch already exists
4. GitHub API rate limit

**Debug:**
```powershell
wrangler tail
```

Check the logs for specific error messages.

---

## Maintenance

### Viewing Worker Logs

Real-time logs:
```powershell
wrangler tail
```

### Updating the Worker

1. Make changes to `cloudflare-worker/src/index.js`
2. Deploy:
   ```powershell
   cd cloudflare-worker
   wrangler deploy
   ```

### Updating Secrets

```powershell
wrangler secret put SECRET_NAME
```

### Viewing Secrets

```powershell
wrangler secret list
```

### Worker Analytics

View in Cloudflare Dashboard:
- Workers & Pages → Your Worker → Analytics
- See request count, errors, CPU time

### Monitoring PR Activity

Monitor PRs created through the portal:
- All PRs will have: `*This PR was created via the QPR Contribution Portal*` in description
- Check for unusual activity
- Set up GitHub Actions for automated checks if needed

---

## Security Best Practices

1. ✅ **Never commit secrets** - Always use `wrangler secret put`
2. ✅ **Client Secret stays on server** - Never exposed to frontend
3. ✅ **CORS properly configured** - Only allows requests from GitHub Pages
4. ✅ **OAuth tokens are short-lived** - Users must re-auth periodically
5. ✅ **File size validation** - Both client and server-side
6. ✅ **File type validation** - Prevents malicious uploads
7. ✅ **Rate limiting** - GitHub API handles rate limiting automatically

---

## Cost Analysis

### Cloudflare Workers (Free Tier)

- ✅ 100,000 requests/day
- ✅ 10 MB request size
- ✅ Unlimited workers
- ✅ No credit card required

**Estimated usage:**
- Assuming 50 contributions/day
- Each contribution = ~10 API calls
- Total: 500 requests/day
- **Well within free tier limits!**

### GitHub Pages

- ✅ Free for public repositories
- ✅ Unlimited bandwidth (fair use)

### GitHub API

- ✅ 5,000 requests/hour (authenticated)
- ✅ Free for public repositories

**Total Cost: $0/month** ✨

---

## Upgrading (Optional)

### To Support Larger Files (30 MB)

Upgrade Cloudflare Workers to Paid Plan:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click "Upgrade" → Workers Paid ($5/month)
3. Benefits:
   - 10 million requests/month
   - 100 MB request size
   - Priority support

Update `contribute.js`:
```javascript
MAX_FILE_SIZE: 30 * 1024 * 1024  // 30 MB
```

Update `contribute.html` upload hint text to reflect new limit.

---

## Support & Resources

### Documentation

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub REST API](https://docs.github.com/en/rest)

### Getting Help

1. Check browser console for error messages
2. Check worker logs: `wrangler tail`
3. Open an issue in the repository
4. Contact Cloudflare support (if paid plan)

---

## FAQ

**Q: Can users without GitHub accounts contribute?**
A: No, GitHub authentication is required to create PRs.

**Q: Can I use a different OAuth provider?**
A: The current system is designed for GitHub. Supporting others would require significant changes.

**Q: What happens if someone uploads malicious files?**
A: All files go through PR review before being merged. Repository maintainers review every contribution.

**Q: Can I customize the file size limit?**
A: Yes, but you need Cloudflare Workers paid plan for limits above 10 MB.

**Q: How do I disable the contribution portal temporarily?**
A: Remove the "Contribute" link from `index.html` or delete the worker.

**Q: Can I track who contributed what?**
A: Yes, all contributions are tracked through GitHub PRs, showing the contributor's username.

---

## Conclusion

You now have a fully functional web-based contribution portal! Users can easily upload files through a beautiful interface, and you get well-organized PRs.

**What's Next:**

1. ✅ Announce the portal to your community
2. ✅ Monitor PRs and merge contributions
3. ✅ Gather feedback and iterate
4. ✅ Enjoy watching the repository grow!

If you encounter any issues, refer to the troubleshooting section or open an issue in the repository.

Happy contributing! 🎉📚

