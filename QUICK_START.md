# QPR Contribution Portal - Quick Start 🚀

Get the contribution portal running in under 10 minutes!

## ⚡ Fast Track Setup

### 1. Install Wrangler
```powershell
npm install -g wrangler
wrangler login
```

### 2. Create GitHub OAuth App
1. Visit: https://github.com/settings/developers
2. Click "New OAuth App"
3. Settings:
   - Name: `QPR Contribution Portal`
   - Homepage: `https://iiserm.github.io/question-paper-repo`
   - Callback: `https://PLACEHOLDER.workers.dev/auth/callback` (update later)
4. Save **Client ID** and **Client Secret**

### 3. Deploy Worker
```powershell
cd cloudflare-worker
npm install

# Add secrets
wrangler secret put GITHUB_CLIENT_ID
# Paste Client ID

wrangler secret put GITHUB_CLIENT_SECRET
# Paste Client Secret

# Deploy
wrangler deploy
```

📝 **Copy your worker URL from the output!**

### 4. Update GitHub OAuth
1. Go back to: https://github.com/settings/developers
2. Click your OAuth app
3. Update callback to: `https://YOUR-WORKER-URL.workers.dev/auth/callback`
4. Save

### 5. Update Frontend
Edit `docs/contribute.js` (lines 6-7):
```javascript
WORKER_URL: 'https://YOUR-ACTUAL-WORKER-URL.workers.dev',
GITHUB_CLIENT_ID: 'your_actual_client_id',
```

### 6. Push & Test
```powershell
git add .
git commit -m "Add contribution portal"
git push
```

Visit: https://iiserm.github.io/question-paper-repo/docs/contribute.html

---

## 🎯 What Users Can Do

✅ Sign in with GitHub  
✅ Upload multiple files  
✅ Organize files into folders  
✅ Create PRs automatically  
✅ Track contribution status  

---

## 📊 File Limits (Free Tier)

- **Max file size:** 10 MB per file
- **Supported formats:** PDF, JPG, PNG, DOCX, PPTX, XLSX, ZIP, TXT
- **Daily requests:** 100,000 (more than enough!)

---

## 🔧 Troubleshooting

**OAuth fails?**
- Check callback URL matches exactly
- Verify Client ID in contribute.js

**CORS errors?**
- Run: `wrangler deploy` again
- Clear browser cache

**Need logs?**
```powershell
wrangler tail
```

---

## 📚 Full Documentation

See `CONTRIBUTION_PORTAL_SETUP.md` for detailed setup guide.

See `cloudflare-worker/README.md` for worker management.

---

## 💰 Cost

**$0/month** - Everything runs on free tiers! 🎉

---

## 🆘 Need Help?

1. Check browser console (F12)
2. Check worker logs: `wrangler tail`
3. Read full docs: `CONTRIBUTION_PORTAL_SETUP.md`
4. Open GitHub issue

---

**That's it! Happy contributing!** 🎊

