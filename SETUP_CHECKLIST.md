# 📋 Contribution Portal Setup Checklist

Print this or keep it open while setting up!

---

## ☑️ Pre-Setup

- [ ] Have a Cloudflare account (free)
- [ ] Have Node.js installed
- [ ] Have Git installed
- [ ] Have admin access to GitHub repo

---

## 1️⃣ Install Wrangler

```powershell
npm install -g wrangler
```

- [ ] Wrangler installed
- [ ] Run `wrangler --version` to verify

---

## 2️⃣ Login to Cloudflare

```powershell
wrangler login
```

- [ ] Logged in to Cloudflare
- [ ] Browser authorization completed

---

## 3️⃣ Create GitHub OAuth App

Visit: https://github.com/settings/developers

Settings:
```
Name: QPR Contribution Portal
Homepage: https://iiserm.github.io/question-paper-repo
Callback: https://TEMP.workers.dev/auth/callback
```

- [ ] OAuth app created
- [ ] **Client ID saved:** `_________________`
- [ ] **Client Secret saved:** `_________________`

⚠️ **Important:** Save these securely!

---

## 4️⃣ Deploy Worker

```powershell
cd cloudflare-worker
npm install
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler deploy
```

- [ ] Dependencies installed
- [ ] Client ID secret added
- [ ] Client Secret secret added
- [ ] Worker deployed
- [ ] **Worker URL saved:** `_________________`

---

## 5️⃣ Update GitHub OAuth Callback

Visit: https://github.com/settings/developers

Update callback URL to:
```
https://YOUR-WORKER-URL.workers.dev/auth/callback
```

- [ ] Callback URL updated
- [ ] Changes saved

---

## 6️⃣ Update Frontend Config

Edit `docs/contribute.js` (lines 6-7):

```javascript
WORKER_URL: 'https://YOUR-ACTUAL-WORKER-URL.workers.dev',
GITHUB_CLIENT_ID: 'your_actual_client_id',
```

- [ ] WORKER_URL updated
- [ ] GITHUB_CLIENT_ID updated
- [ ] File saved

---

## 7️⃣ Deploy to GitHub

```powershell
git add .
git commit -m "Add contribution portal"
git push origin main
```

- [ ] Changes committed
- [ ] Changes pushed
- [ ] GitHub Pages deployed (wait 1-2 min)

---

## 8️⃣ Test the Portal

Visit: https://iiserm.github.io/question-paper-repo/docs/contribute.html

- [ ] Page loads correctly
- [ ] "Sign in with GitHub" button works
- [ ] OAuth redirect works
- [ ] Returns to contribution page
- [ ] Username displayed after login
- [ ] Can add folder paths
- [ ] Can upload files
- [ ] File validation works
- [ ] Can add multiple folders
- [ ] PR creation works
- [ ] Success page shows
- [ ] PR link is correct
- [ ] Can view created PR

---

## 9️⃣ Verify PR

Check your repository:

- [ ] PR was created
- [ ] Files are in correct paths
- [ ] PR has correct title
- [ ] PR description is formatted
- [ ] PR mentions contribution portal
- [ ] Can merge or close PR

---

## 🎉 Setup Complete!

- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Ready to announce to community

---

## 📝 Important URLs to Save

| Item | URL |
|------|-----|
| GitHub OAuth App | https://github.com/settings/developers |
| Worker Dashboard | https://dash.cloudflare.com |
| Contribution Portal | https://iiserm.github.io/question-paper-repo/docs/contribute.html |
| Worker URL | `_________________` |
| Repository | https://github.com/IISERM/question-paper-repo |

---

## 🔧 Commands to Remember

```powershell
# View worker logs
wrangler tail

# Update worker
cd cloudflare-worker
wrangler deploy

# View secrets
wrangler secret list

# Update secret
wrangler secret put SECRET_NAME
```

---

## 🆘 Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| OAuth fails | Check callback URL, verify Client ID |
| CORS error | Redeploy worker: `wrangler deploy` |
| File too large | Free tier limit is 10 MB |
| Worker not responding | Check logs: `wrangler tail` |
| PR not created | Check worker logs for errors |

---

## 📊 Success Metrics

After launch, track:

- [ ] Number of PRs created via portal
- [ ] Number of unique contributors
- [ ] File upload success rate
- [ ] User feedback
- [ ] Error rate in logs

---

## 🎯 Post-Launch Tasks

- [ ] Announce to community
- [ ] Monitor first few contributions
- [ ] Review and merge PRs
- [ ] Gather user feedback
- [ ] Make improvements as needed

---

## 📚 Documentation Reference

- **Quick Setup:** `QUICK_START.md`
- **Detailed Setup:** `CONTRIBUTION_PORTAL_SETUP.md`
- **Worker Management:** `cloudflare-worker/README.md`
- **Summary:** `CONTRIBUTION_PORTAL_SUMMARY.md`

---

## ✨ You're All Set!

🎉 Contribution portal is live!  
📚 Users can now easily contribute!  
🚀 Watch your repository grow!

**Questions?** Check the documentation files above.

**Issues?** Open a GitHub issue or check worker logs.

**Happy contributing!** 🎊

