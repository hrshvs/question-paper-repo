/**
 * QPR Contribution System - Frontend Logic
 */

// Configuration
const CONFIG = {
  WORKER_URL: "https://qpr-contribution-worker.turingclub.workers.dev",
  GITHUB_CLIENT_ID: "Ov23linzqUpdM2As790u",
  GITHUB_REPO_OWNER: "IISERM",
  GITHUB_REPO_NAME: "question-paper-repo",
  MAX_FILE_SIZE: 7.5 * 1024 * 1024,
  MAX_BATCH_SIZE: 7.5 * 1024 * 1024,
  ALLOWED_EXTENSIONS: [
    "pdf",
    "jpg",
    "jpeg",
    "png",
    "docx",
    "pptx",
    "xlsx",
    "zip",
    "txt",
    "ipynb",
    "py",
    "csv",
    "tsv",
    "html",
  ],
};

// State management
let state = {
  token: null,
  username: null,
  authType: null,
  userEmail: null,
  userName: null,
  userPhoto: null,
  uploadGroups: [],
  userForkName: null,
};

// Initialize theme toggle
function initThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle");
  const themeText = document.getElementById("theme-text");
  const sunIcon = document.getElementById("theme-icon-sun");
  const moonIcon = document.getElementById("theme-icon-moon");

  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  function updateThemeButton(theme) {
    if (theme === "dark") {
      themeText.textContent = "Light";
      sunIcon.style.display = "block";
      moonIcon.style.display = "none";
    } else {
      themeText.textContent = "Dark";
      sunIcon.style.display = "none";
      moonIcon.style.display = "block";
    }
  }

  updateThemeButton(savedTheme);

  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeButton(newTheme);
  });
}

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  console.log("═══════════════════════════════════════════════════");
  console.log("🚀 QPR Contribution Portal - Debug Mode");
  console.log("═══════════════════════════════════════════════════");
  console.log("Config:", {
    maxFileSize: `${(CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)} MB`,
    maxBatchSize: `${(CONFIG.MAX_BATCH_SIZE / (1024 * 1024)).toFixed(1)} MB`,
    allowedExtensions: CONFIG.ALLOWED_EXTENSIONS.join(", "),
  });
  console.log("═══════════════════════════════════════════════════");

  initThemeToggle();
  checkAuthStatus();
  setupEventListeners();
  addInitialUploadGroup();
});

// Check authentication status
function checkAuthStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const username = urlParams.get("username");
  const error = urlParams.get("error");

  if (error) {
    showError(`Authentication failed: ${error}`);
    return;
  }

  if (token && username) {
    state.token = token;
    state.username = username;
    state.authType = "github";
    localStorage.setItem("github_token", token);
    localStorage.setItem("github_username", username);
    localStorage.setItem("auth_type", "github");

    window.history.replaceState({}, document.title, window.location.pathname);

    showAuthenticatedUI();
    return;
  }

  const authType = localStorage.getItem("auth_type");

  if (authType === "google") {
    const userEmail = localStorage.getItem("user_email");
    const userName = localStorage.getItem("user_name");
    const userPhoto = localStorage.getItem("user_photo");

    if (userEmail && userName) {
      state.authType = "google";
      state.userEmail = userEmail;
      state.userName = userName;
      state.userPhoto = userPhoto;
      showAuthenticatedUI();
    }
  } else if (authType === "github") {
    const storedToken = localStorage.getItem("github_token");
    const storedUsername = localStorage.getItem("github_username");

    if (storedToken && storedUsername) {
      state.token = storedToken;
      state.username = storedUsername;
      state.authType = "github";
      showAuthenticatedUI();
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  document
    .getElementById("google-login-btn")
    .addEventListener("click", initiateGoogleLogin);
  document
    .getElementById("github-login-btn")
    .addEventListener("click", initiateGitHubLogin);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document
    .getElementById("add-folder-btn")
    .addEventListener("click", addUploadGroup);
  document
    .getElementById("contribution-form")
    .addEventListener("submit", handleSubmit);
  document.getElementById("retry-btn").addEventListener("click", resetForm);
  document
    .getElementById("contribute-more-btn")
    .addEventListener("click", resetForm);
  document.getElementById("copy-pr-link").addEventListener("click", copyPRLink);
}

// Initiate Google OAuth login
async function initiateGoogleLogin() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;

    const allowedDomain = "iisermohali.ac.in";
    if (!user.email.endsWith(`@${allowedDomain}`)) {
      await auth.signOut();
      showError(
        `Access restricted to ${allowedDomain} email addresses only.\n\nYour email: ${user.email}\n\nPlease use your IISER Mohali institute email or sign in with GitHub for external contributions.`
      );
      return;
    }

    state.authType = "google";
    state.userEmail = user.email;
    state.userName = user.displayName || user.email.split("@")[0];
    state.userPhoto = user.photoURL;

    localStorage.setItem("auth_type", "google");
    localStorage.setItem("user_email", user.email);
    localStorage.setItem("user_name", state.userName);
    localStorage.setItem("user_photo", user.photoURL || "");

    console.log("Google sign-in successful:", user.email);
    showAuthenticatedUI();
  } catch (error) {
    console.error("Google sign-in error:", error);
    if (error.code !== "auth/popup-closed-by-user") {
      showError(`Google sign-in failed: ${error.message}`);
    }
  }
}

// Initiate GitHub OAuth login
function initiateGitHubLogin() {
  const redirectUri = `${CONFIG.WORKER_URL}/auth/callback`;
  const scope = "public_repo";
  const state = Math.random().toString(36).substring(7);

  const authUrl =
    `https://github.com/login/oauth/authorize?` +
    `client_id=${CONFIG.GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${scope}&` +
    `state=${state}`;

  window.location.href = authUrl;
}

// Logout
async function logout() {
  if (state.authType === "google") {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Firebase sign-out error:", error);
    }
  }

  state.token = null;
  state.username = null;
  state.authType = null;
  state.userEmail = null;
  state.userName = null;
  state.userPhoto = null;

  localStorage.removeItem("github_token");
  localStorage.removeItem("github_username");
  localStorage.removeItem("auth_type");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_photo");

  document.getElementById("auth-section").style.display = "block";
  document.getElementById("user-section").style.display = "none";
  document.getElementById("upload-section").style.display = "none";
}

// Show authenticated UI
function showAuthenticatedUI() {
  const usernameElement = document.getElementById("username");

  if (state.authType === "google") {
    usernameElement.innerHTML = `<strong>${state.userName}</strong> (${state.userEmail})`;
  } else {
    usernameElement.textContent = state.username;
  }

  document.getElementById("auth-section").style.display = "none";
  document.getElementById("user-section").style.display = "block";
  document.getElementById("upload-section").style.display = "block";
}

// Add initial upload group
function addInitialUploadGroup() {
  addUploadGroup();
}

// Add upload group
function addUploadGroup() {
  const groupId = `group-${Date.now()}`;
  const groupIndex = state.uploadGroups.length;

  console.log(
    `[addUploadGroup] Creating new group: ${groupId} (index ${groupIndex})`
  );

  const groupHTML = `
        <div class="upload-group" id="${groupId}">
            <div class="upload-group-header">
                <h4>Folder ${groupIndex + 1}</h4>
                ${groupIndex > 0 ? `<button type="button" class="btn-remove" onclick="removeUploadGroup('${groupId}')">Remove</button>` : ""}
            </div>
            
            <!-- Path Builder -->
            <div class="path-builder">
                <div class="form-group">
                    <label for="${groupId}-subject">Subject <span class="required">*</span></label>
                    <select id="${groupId}-subject" class="form-select" required onchange="updatePathPreview('${groupId}')">
                        <option value="">Select Subject</option>
                        <option value="Biology">Biology</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="HSS">HSS</option>
                        <option value="IDC">IDC</option>
                        <option value="Math">Math</option>
                        <option value="Physics">Physics</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="${groupId}-coursecode">Course Code <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="${groupId}-coursecode" 
                        class="form-input"
                        placeholder="e.g., 403"
                        pattern="[0-9]{3}"
                        maxlength="3"
                        required
                        oninput="validateCourseCode('${groupId}')"
                        onchange="updatePathPreview('${groupId}')"
                    />
                    <small class="form-hint">3 digits only</small>
                </div>
                
                <div class="form-group">
                    <label for="${groupId}-year">Year <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="${groupId}-year" 
                        class="form-input"
                        placeholder="e.g., 2025"
                        pattern="[0-9]{4}"
                        maxlength="4"
                        required
                        oninput="validateYear('${groupId}')"
                        onchange="updatePathPreview('${groupId}')"
                    />
                    <small class="form-hint">4 digits only</small>
                </div>
                
                <div class="form-group">
                    <label for="${groupId}-customfolder">Additional Folder (optional)</label>
                    <input 
                        type="text" 
                        id="${groupId}-customfolder" 
                        class="form-input"
                        placeholder="e.g., Endsem, Quiz1, Assignments"
                        onchange="updatePathPreview('${groupId}')"
                    />
                    <small class="form-hint">Any folder name you want</small>
                </div>
                
                <div class="path-preview">
                    <strong>Path:</strong> <code id="${groupId}-path-display">Select options above</code>
                </div>
            </div>
            
            <div class="form-group">
                <div class="file-upload-actions">
                    <label for="${groupId}-files" style="margin:0">Files <span class="required">*</span></label>
                    <button type="button" class="btn-camera" onclick="openCamera('${groupId}')">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
                            <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
                        </svg>
                        Take Photo
                    </button>
                </div>
                <div class="file-upload-area" id="${groupId}-drop-zone">
                    <input 
                        type="file" 
                        id="${groupId}-files" 
                        class="file-input"
                        multiple 
                        accept=".pdf,.jpg,.jpeg,.png,.docx,.pptx,.xlsx,.zip,.txt"
                        onchange="handleFileSelect('${groupId}')"
                    />
                    <label for="${groupId}-files" class="file-upload-label">
                        <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                        </svg>
                        <span class="upload-text">Click to upload or drag and drop</span>
                        <span class="upload-hint">PDF, JPG, PNG, DOCX, PPTX, XLSX, ZIP (max 7.5 MB each)</span>
                    </label>
                </div>
                <div id="${groupId}-file-list" class="file-list"></div>
                
                <!-- Merge Button Area -->
                <div class="tools-bar">
                    <button type="button" class="btn-tool" onclick="openMergeTool('${groupId}')">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                            <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                        </svg>
                        Merge Images to PDF
                    </button>
                </div>
            </div>
        </div>
    `;

  document
    .getElementById("upload-groups")
    .insertAdjacentHTML("beforeend", groupHTML);
  state.uploadGroups.push({ id: groupId, files: [], fileNames: {} });

  console.log(
    `[addUploadGroup] ✅ Group created. Total groups: ${state.uploadGroups.length}`
  );

  // Setup drag and drop
  setupDragAndDrop(groupId);
}

// Remove upload group
window.removeUploadGroup = function (groupId) {
  const group = document.getElementById(groupId);
  if (group) {
    group.remove();
    state.uploadGroups = state.uploadGroups.filter((g) => g.id !== groupId);

    document.querySelectorAll(".upload-group").forEach((group, index) => {
      group.querySelector("h4").textContent = `Folder ${index + 1}`;
    });
  }
};

// Setup drag and drop
function setupDragAndDrop(groupId) {
  const dropZone = document.getElementById(`${groupId}-drop-zone`);

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      () => {
        dropZone.classList.add("drag-over");
      },
      false
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      () => {
        dropZone.classList.remove("drag-over");
      },
      false
    );
  });

  dropZone.addEventListener(
    "drop",
    (e) => {
      const files = e.dataTransfer.files;
      const input = document.getElementById(`${groupId}-files`);
      input.files = files;
      handleFileSelect(groupId);
    },
    false
  );
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Handle file selection
window.handleFileSelect = function (groupId) {
  console.log(`[handleFileSelect] Starting for group: ${groupId}`);

  const input = document.getElementById(`${groupId}-files`);
  const newFiles = Array.from(input.files);
  const fileList = document.getElementById(`${groupId}-file-list`);

  console.log(`[handleFileSelect] New files selected:`, newFiles.length);
  newFiles.forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${file.name} (${formatFileSize(file.size)})`);
  });

  const group = state.uploadGroups.find((g) => g.id === groupId);
  const existingFiles = group ? [...group.files] : [];

  console.log(
    `[handleFileSelect] Existing files in state:`,
    existingFiles.length
  );
  existingFiles.forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${file.name} (${formatFileSize(file.size)})`);
  });

  const validNewFiles = [];
  const errors = [];
  const oversizedFiles = [];

  newFiles.forEach((file) => {
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      errors.push(`${file.name}: File too large (${sizeMB} MB, max 7.5 MB)`);
      oversizedFiles.push({ name: file.name, size: sizeMB });
      console.log(
        `[handleFileSelect] ❌ Rejected (too large): ${file.name} (${sizeMB} MB)`
      );
      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();
    if (!CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`${file.name}: Unsupported file type`);
      console.log(
        `[handleFileSelect] ❌ Rejected (unsupported type): ${file.name} (.${extension})`
      );
      return;
    }

    validNewFiles.push(file);
    console.log(`[handleFileSelect] ✅ Accepted: ${file.name}`);
  });

  const allFiles = [...existingFiles, ...validNewFiles];

  console.log(`[handleFileSelect] Total files after merge:`, allFiles.length);
  allFiles.forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${file.name} (${formatFileSize(file.size)})`);
  });

  if (errors.length > 0) {
    let errorMessage = "Some files were rejected:\n\n" + errors.join("\n");

    if (oversizedFiles.length > 0) {
      errorMessage += "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
      errorMessage += "📦 Files larger than 7.5 MB?\n\n";
      errorMessage += "Option 1: Compress your PDF using online tools\n";
      errorMessage += "Option 2: Create a Pull Request directly on GitHub:\n";
      errorMessage += "https://github.com/IISERM/question-paper-repo/pulls\n\n";
      errorMessage += "GitHub supports files up to 100 MB!";
    }

    alert(errorMessage);
    showOversizedFileWarning(groupId, oversizedFiles);
  } else {
    removeOversizedFileWarning(groupId);
  }

  if (group) {
    group.files = allFiles;

    allFiles.forEach((file, index) => {
      if (!group.fileNames[index]) {
        group.fileNames[index] = file.name;
        console.log(
          `[handleFileSelect] Set default name for file ${index}: ${file.name}`
        );
      }
    });
  }

  const dt = new DataTransfer();
  allFiles.forEach((file) => dt.items.add(file));
  input.files = dt.files;

  console.log(
    `[handleFileSelect] Updated input.files.length:`,
    input.files.length
  );

  fileList.innerHTML = allFiles
    .map((file, index) => {
      const customName = group.fileNames[index] || file.name;
      return `
        <div class="file-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
            </svg>
            <input 
                type="text" 
                class="file-name-input" 
                value="${customName}"
                onchange="updateFileName('${groupId}', ${index}, this.value)"
                title="Click to edit filename"
            />
            <span class="file-size">${formatFileSize(file.size)}</span>
            <button type="button" class="btn-remove-file" onclick="removeFile('${groupId}', ${index})" title="Remove file">×</button>
        </div>
        `;
    })
    .join("");

  console.log(
    `[handleFileSelect] ✅ Finished. Displaying ${allFiles.length} files.`
  );
};

// Remove file
window.removeFile = function (groupId, index) {
  console.log(
    `[removeFile] Removing file at index ${index} from group ${groupId}`
  );

  const group = state.uploadGroups.find((g) => g.id === groupId);
  if (group) {
    const removedFile = group.files[index];
    console.log(`[removeFile] Removing: ${removedFile.name}`);

    group.files.splice(index, 1);

    const newFileNames = {};
    Object.keys(group.fileNames).forEach((key) => {
      const keyIndex = parseInt(key);
      if (keyIndex < index) {
        newFileNames[keyIndex] = group.fileNames[keyIndex];
      } else if (keyIndex > index) {
        newFileNames[keyIndex - 1] = group.fileNames[keyIndex];
      }
    });
    group.fileNames = newFileNames;

    console.log(`[removeFile] Files remaining:`, group.files.length);
    group.files.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file.name}`);
    });

    const input = document.getElementById(`${groupId}-files`);
    const dt = new DataTransfer();
    group.files.forEach((file) => dt.items.add(file));
    input.files = dt.files;

    const fileList = document.getElementById(`${groupId}-file-list`);
    fileList.innerHTML = group.files
      .map((file, idx) => {
        const customName = group.fileNames[idx] || file.name;
        return `
            <div class="file-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                </svg>
                <input 
                    type="text" 
                    class="file-name-input" 
                    value="${customName}"
                    onchange="updateFileName('${groupId}', ${idx}, this.value)"
                    title="Click to edit filename"
                />
                <span class="file-size">${formatFileSize(file.size)}</span>
                <button type="button" class="btn-remove-file" onclick="removeFile('${groupId}', ${idx})" title="Remove file">×</button>
            </div>
            `;
      })
      .join("");

    console.log(`[removeFile] ✅ File removed successfully`);
  }
};

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Show warning for oversized files
function showOversizedFileWarning(groupId, oversizedFiles) {
  removeOversizedFileWarning(groupId);

  const group = document.getElementById(groupId);
  if (!group) return;

  const fileNames = oversizedFiles
    .map((f) => `${f.name} (${f.size} MB)`)
    .join(", ");

  const warningHTML = `
        <div class="warning-notice" id="${groupId}-warning">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <div>
                <p>
                    <strong>Files too large:</strong> ${fileNames}
                    <br><br>
                    <strong>Options:</strong><br>
                    • Compress your PDF using online tools (recommended)<br>
                    • <a href="https://github.com/IISERM/question-paper-repo/pulls" target="_blank" rel="noopener" class="notice-link">Create a Pull Request on GitHub</a> (supports up to 100 MB)
                </p>
            </div>
        </div>
    `;

  const fileList = document.getElementById(`${groupId}-file-list`);
  fileList.insertAdjacentHTML("afterend", warningHTML);
}

// Remove oversized file warning
function removeOversizedFileWarning(groupId) {
  const warning = document.getElementById(`${groupId}-warning`);
  if (warning) {
    warning.remove();
  }
}

// Update path preview
window.updatePathPreview = function (groupId) {
  const subject = document.getElementById(`${groupId}-subject`).value;
  const courseCode = document.getElementById(`${groupId}-coursecode`).value;
  const year = document.getElementById(`${groupId}-year`).value;
  const customFolder = document
    .getElementById(`${groupId}-customfolder`)
    .value.trim();

  const pathDisplay = document.getElementById(`${groupId}-path-display`);

  if (subject && courseCode && year) {
    let path = `${subject}/${courseCode}/${year}`;
    if (customFolder) {
      path += `/${customFolder}`;
    }
    pathDisplay.textContent = path;
    pathDisplay.style.color = "var(--success-color)";
  } else {
    pathDisplay.textContent = "Select options above";
    pathDisplay.style.color = "var(--text-muted)";
  }
};

// Validate course code
window.validateCourseCode = function (groupId) {
  const input = document.getElementById(`${groupId}-coursecode`);
  const value = input.value;
  input.value = value.replace(/\D/g, "").slice(0, 3);
  updatePathPreview(groupId);
};

// Validate year
window.validateYear = function (groupId) {
  const input = document.getElementById(`${groupId}-year`);
  const value = input.value;
  input.value = value.replace(/\D/g, "").slice(0, 4);
  updatePathPreview(groupId);
};

// Update filename
window.updateFileName = function (groupId, index, newName) {
  console.log(
    `[updateFileName] Group: ${groupId}, Index: ${index}, New name: ${newName}`
  );

  const group = state.uploadGroups.find((g) => g.id === groupId);
  if (group) {
    const originalName = group.files[index].name;
    const sanitized = newName.trim();
    if (sanitized) {
      group.fileNames[index] = sanitized;
      console.log(
        `[updateFileName] ✅ Updated: "${originalName}" → "${sanitized}"`
      );
    } else {
      group.fileNames[index] = originalName;
      const input = document.querySelector(
        `#${groupId}-file-list .file-item:nth-child(${index + 1}) .file-name-input`
      );
      if (input) {
        input.value = originalName;
      }
      console.log(
        `[updateFileName] ⚠️ Empty name, reverted to: "${originalName}"`
      );
    }
  }
};

// Get folder path from form inputs
function getFolderPath(groupId) {
  const subject = document.getElementById(`${groupId}-subject`).value;
  const courseCode = document.getElementById(`${groupId}-coursecode`).value;
  const year = document.getElementById(`${groupId}-year`).value;
  const customFolder = document
    .getElementById(`${groupId}-customfolder`)
    .value.trim();

  if (!subject || !courseCode || !year) {
    return null;
  }

  let path = `${subject}/${courseCode}/${year}`;
  if (customFolder) {
    path += `/${customFolder}`;
  }

  return path;
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();

  const validation = validateForm();
  if (!validation.valid) {
    alert(validation.message);
    return;
  }

  const prTitle = document.getElementById("pr-title").value.trim();
  const prDescription = document.getElementById("pr-description").value.trim();

  if (state.authType === "google") {
    await handleDirectContribution(prTitle, prDescription);
  } else {
    await handleGitHubContribution(prTitle, prDescription);
  }
}

// Calculate size of a file with base64 encoding overhead
function calculateBase64Size(file) {
  return Math.ceil(file.size * 1.33);
}

// Build complete upload groups list
function buildCompleteUploadGroupsList(allUploadedFiles) {
  const groupedByPath = {};

  allUploadedFiles.forEach(({ folderPath, fileName }) => {
    if (!groupedByPath[folderPath]) {
      groupedByPath[folderPath] = [];
    }
    groupedByPath[folderPath].push(fileName);
  });

  return Object.entries(groupedByPath).map(([folderPath, fileNames]) => ({
    folderPath,
    files: fileNames.map((name) => ({ name })),
  }));
}

// Batch files to stay under MAX_BATCH_SIZE
function createBatches(uploadGroupsData, fileObjects) {
  const batches = [];
  let currentBatch = [];
  let currentBatchSize = 0;

  console.log("[createBatches] Starting batching process...");
  console.log(
    `[createBatches] MAX_BATCH_SIZE: ${(CONFIG.MAX_BATCH_SIZE / (1024 * 1024)).toFixed(2)} MB`
  );

  const allFiles = [];
  uploadGroupsData.forEach((group, groupIdx) => {
    group.files.forEach((fileData, fileIdx) => {
      const fileObj = fileObjects[groupIdx][fileIdx];
      const fileSize = calculateBase64Size(fileObj);
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      const originalSizeMB = (fileObj.size / (1024 * 1024)).toFixed(2);

      console.log(`[createBatches] File: ${fileData.name}`);
      console.log(
        `  Original: ${originalSizeMB} MB → Base64: ${fileSizeMB} MB`
      );

      allFiles.push({
        groupIdx,
        folderPath: group.folderPath,
        fileData,
        fileObj,
        fileSize,
      });
    });
  });

  console.log(`[createBatches] Total files to batch: ${allFiles.length}`);

  for (const item of allFiles) {
    const itemSizeMB = (item.fileSize / (1024 * 1024)).toFixed(2);
    const maxBatchMB = (CONFIG.MAX_BATCH_SIZE / (1024 * 1024)).toFixed(2);

    if (item.fileSize > CONFIG.MAX_BATCH_SIZE) {
      console.log(
        `[createBatches] ⚠️ File ${item.fileData.name} (${itemSizeMB} MB) exceeds batch limit (${maxBatchMB} MB)`
      );
      console.log(
        `[createBatches]    → Creating dedicated batch for this file`
      );

      if (currentBatch.length > 0) {
        console.log(
          `[createBatches]    → Saving current batch with ${currentBatch.length} file(s)`
        );
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }
      batches.push([item]);
      console.log(
        `[createBatches]    → Batch #${batches.length} created (1 oversized file)`
      );
      continue;
    }

    if (
      currentBatchSize + item.fileSize > CONFIG.MAX_BATCH_SIZE &&
      currentBatch.length > 0
    ) {
      console.log(
        `[createBatches] Adding ${item.fileData.name} would exceed limit, creating new batch`
      );
      batches.push(currentBatch);
      console.log(
        `[createBatches] Batch #${batches.length} created (${currentBatch.length} file(s))`
      );
      currentBatch = [];
      currentBatchSize = 0;
    }

    console.log(
      `[createBatches] Adding ${item.fileData.name} to current batch`
    );
    currentBatch.push(item);
    currentBatchSize += item.fileSize;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
    console.log(
      `[createBatches] Final batch #${batches.length} created (${currentBatch.length} file(s))`
    );
  }

  console.log(`[createBatches] ✅ Total batches created: ${batches.length}`);
  batches.forEach((batch, idx) => {
    const batchSizeMB = (
      batch.reduce((sum, item) => sum + item.fileSize, 0) /
      (1024 * 1024)
    ).toFixed(2);
    console.log(
      `  Batch ${idx + 1}: ${batch.length} file(s), ${batchSizeMB} MB`
    );
    batch.forEach((item) => {
      const sizeMB = (item.fileSize / (1024 * 1024)).toFixed(2);
      console.log(`    - ${item.fileData.name} (${sizeMB} MB)`);
    });
  });

  return batches;
}

// Handle direct contribution
async function handleDirectContribution(prTitle, prDescription) {
  showProgress("Starting direct contribution...", 0);

  try {
    const uploadGroupsData = state.uploadGroups.map((group) => {
      const folderPath = getFolderPath(group.id);
      if (!folderPath) {
        throw new Error("Please fill in all required path fields");
      }
      return {
        folderPath: folderPath,
        files: group.files.map((file, index) => ({
          name: group.fileNames[index] || file.name,
          content: null,
        })),
      };
    });

    const fileObjects = state.uploadGroups.map((group) => group.files);

    updateProgress("Preparing files...", 5);
    const batches = createBatches(uploadGroupsData, fileObjects);

    console.log(`Split into ${batches.length} batch(es)`);

    let branchName = null;
    let totalFilesProcessed = 0;
    const totalFiles = batches.reduce((sum, batch) => sum + batch.length, 0);
    const allUploadedFiles = [];

    console.log("═══════════════════════════════════════════════════");
    console.log("📤 Starting batch upload process");
    console.log(`Total batches: ${batches.length}`);
    console.log(`Total files: ${totalFiles}`);
    console.log("═══════════════════════════════════════════════════");

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const isLastBatch = batchIdx === batches.length - 1;

      console.log(`\n[Batch ${batchIdx + 1}/${batches.length}] Starting...`);
      console.log(`  Files in this batch: ${batch.length}`);
      console.log(`  Branch name: ${branchName || "NEW (will be created)"}`);
      console.log(`  Should create PR: ${isLastBatch}`);

      updateProgress(
        `Uploading batch ${batchIdx + 1}/${batches.length}...`,
        10 + Math.floor((batchIdx / batches.length) * 70)
      );

      console.log(`[Batch ${batchIdx + 1}] Converting files to base64...`);
      const batchGroups = {};
      for (const item of batch) {
        const base64Content = await fileToBase64(item.fileObj);

        if (!batchGroups[item.folderPath]) {
          batchGroups[item.folderPath] = [];
        }

        batchGroups[item.folderPath].push({
          name: item.fileData.name,
          content: base64Content,
        });
        console.log(`  ✅ Converted: ${item.fileData.name}`);
      }

      const batchUploadGroups = Object.entries(batchGroups).map(
        ([folderPath, files]) => ({
          folderPath,
          files,
        })
      );

      batchUploadGroups.forEach((group) => {
        group.files.forEach((file) => {
          allUploadedFiles.push({
            folderPath: group.folderPath,
            fileName: file.name,
          });
        });
      });

      console.log(
        `[Batch ${batchIdx + 1}] Total files tracked so far: ${allUploadedFiles.length}`
      );

      let uploadGroupsForPR = undefined;
      if (isLastBatch) {
        uploadGroupsForPR = buildCompleteUploadGroupsList(allUploadedFiles);
        console.log(
          `[Batch ${batchIdx + 1}] 📋 Complete file list for PR description:`
        );
        uploadGroupsForPR.forEach((group) => {
          console.log(`  ${group.folderPath}/`);
          group.files.forEach((f) => console.log(`    - ${f.name}`));
        });
      }

      console.log(`[Batch ${batchIdx + 1}] Sending to worker...`);

      const requestPayload = {
        userEmail: state.userEmail,
        userName: state.userName,
        uploadGroups: batchUploadGroups,
        uploadGroupsForPR: isLastBatch ? uploadGroupsForPR : undefined,
        prTitle: prTitle,
        prDescription: prDescription,
        branchName: branchName,
        shouldCreatePR: isLastBatch,
        batchInfo: {
          current: batchIdx + 1,
          total: batches.length,
        },
      };
      console.log(`  Request payload:`, {
        uploadGroups: batchUploadGroups.length,
        branchName: requestPayload.branchName,
        shouldCreatePR: requestPayload.shouldCreatePR,
        batchInfo: requestPayload.batchInfo,
      });

      const response = await fetch(
        `${CONFIG.WORKER_URL}/api/contribute-direct`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error(`[Batch ${batchIdx + 1}] ❌ Upload failed:`, error);
        throw new Error(error.error || "Failed to upload batch");
      }

      const result = await response.json();
      console.log(`[Batch ${batchIdx + 1}] ✅ Upload successful`);
      console.log(`  Response:`, {
        branch: result.branch,
        prCreated: !!result.pr,
        filesUploaded: result.filesUploaded?.length || 0,
      });

      if (batchIdx === 0) {
        branchName = result.branch;
        console.log(`[Batch ${batchIdx + 1}] 🌿 Branch created: ${branchName}`);
        console.log(`  → This branch will be reused for remaining batches`);
      }

      totalFilesProcessed += batch.length;
      console.log(
        `[Batch ${batchIdx + 1}] Progress: ${totalFilesProcessed}/${totalFiles} files uploaded`
      );

      if (isLastBatch) {
        if (result.pr) {
          console.log(
            `[Batch ${batchIdx + 1}] 🎉 PR created: ${result.pr.html_url}`
          );
          updateProgress("Complete!", 100);

          setTimeout(() => {
            showSuccess(result.pr.html_url);
          }, 500);
        } else {
          console.error(
            `[Batch ${batchIdx + 1}] ⚠️ Last batch but no PR returned!`
          );
        }
      }
    }

    console.log("═══════════════════════════════════════════════════");
    console.log("✅ All batches uploaded successfully");
    console.log("═══════════════════════════════════════════════════");
  } catch (error) {
    console.error("Direct contribution error:", error);
    showError(error.message || "An unexpected error occurred");
  }
}

// Handle GitHub contribution
async function handleGitHubContribution(prTitle, prDescription) {
  showProgress("Starting contribution process...", 0);

  try {
    updateProgress("Checking for existing fork...", 10);
    const forkExists = await checkFork();

    let fork;
    if (forkExists) {
      updateProgress("Using existing fork...", 20);
      fork = { owner: { login: state.username } };
    } else {
      updateProgress("Forking repository...", 20);
      fork = await forkRepository();
    }

    state.userForkName = fork.owner.login;

    updateProgress("Creating new branch...", 30);
    const branchName = `contribution-${Date.now()}`;
    await createBranch(state.userForkName, branchName);

    const totalFiles = state.uploadGroups.reduce(
      (sum, g) => sum + g.files.length,
      0
    );
    let uploadedFiles = 0;

    for (const group of state.uploadGroups) {
      const folderPath = getFolderPath(group.id);
      if (!folderPath) {
        throw new Error("Please fill in all required path fields");
      }

      for (let i = 0; i < group.files.length; i++) {
        const file = group.files[i];
        const fileName = group.fileNames[i] || file.name;

        updateProgress(
          `Uploading ${fileName}...`,
          30 + Math.floor((uploadedFiles / totalFiles) * 50)
        );

        await uploadFile(
          state.userForkName,
          `${folderPath}/${fileName}`,
          file,
          branchName
        );

        uploadedFiles++;
      }
    }

    updateProgress("Creating pull request...", 90);

    const filesList = state.uploadGroups
      .map((group) => {
        const path = getFolderPath(group.id);
        const fileNames = group.files.map(
          (f, i) => group.fileNames[i] || f.name
        );
        return `- **${path}/**:\n${fileNames.map((name) => `  - ${name}`).join("\n")}`;
      })
      .join("\n\n");

    const prBody = `${prDescription ? prDescription + "\n\n" : ""}### Files Added:\n${filesList}\n\n---\n*This PR was created via the QPR Contribution Portal*`;

    const pr = await createPullRequest(
      state.userForkName,
      branchName,
      prTitle,
      prBody
    );

    updateProgress("Complete!", 100);

    setTimeout(() => {
      showSuccess(pr.html_url);
    }, 500);
  } catch (error) {
    console.error("Contribution error:", error);
    showError(error.message || "An unexpected error occurred");
  }
}

// Validate form
function validateForm() {
  if (!state.authType) {
    return { valid: false, message: "Please sign in first (Google or GitHub)" };
  }

  if (state.authType === "google" && !state.userEmail) {
    return {
      valid: false,
      message: "Google authentication incomplete. Please sign in again.",
    };
  }

  if (state.authType === "github" && !state.token) {
    return {
      valid: false,
      message: "GitHub authentication incomplete. Please sign in again.",
    };
  }

  const hasFiles = state.uploadGroups.some((g) => g.files.length > 0);
  if (!hasFiles) {
    return {
      valid: false,
      message: "Please select at least one file to upload",
    };
  }

  for (const group of state.uploadGroups) {
    if (group.files.length > 0) {
      const subject = document.getElementById(`${group.id}-subject`).value;
      const courseCode = document.getElementById(
        `${group.id}-coursecode`
      ).value;
      const year = document.getElementById(`${group.id}-year`).value;

      if (!subject) {
        return {
          valid: false,
          message: "Please select a subject for all file groups",
        };
      }

      if (!courseCode || courseCode.length !== 3) {
        return {
          valid: false,
          message:
            "Please enter a valid 3-digit course code for all file groups",
        };
      }

      if (!year || year.length !== 4) {
        return {
          valid: false,
          message: "Please enter a valid 4-digit year for all file groups",
        };
      }
    }
  }

  const prTitle = document.getElementById("pr-title").value.trim();
  if (!prTitle) {
    return { valid: false, message: "Please provide a pull request title" };
  }

  return { valid: true };
}

// API calls
async function makeAPICall(endpoint, options = {}) {
  const response = await fetch(`${CONFIG.WORKER_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

async function checkFork() {
  const result = await makeAPICall("/api/check-fork");
  return result.exists;
}

async function forkRepository() {
  return makeAPICall("/api/fork", { method: "POST" });
}

async function createBranch(owner, branchName) {
  return makeAPICall("/api/create-branch", {
    method: "POST",
    body: JSON.stringify({
      owner,
      repo: CONFIG.GITHUB_REPO_NAME,
      branchName,
    }),
  });
}

async function uploadFile(owner, path, file, branch) {
  const base64Content = await fileToBase64(file);

  return makeAPICall("/api/upload-file", {
    method: "POST",
    body: JSON.stringify({
      owner,
      repo: CONFIG.GITHUB_REPO_NAME,
      path,
      content: base64Content,
      message: `Add ${file.name}`,
      branch,
    }),
  });
}

async function createPullRequest(owner, branch, title, body) {
  return makeAPICall("/api/create-pr", {
    method: "POST",
    body: JSON.stringify({
      owner,
      branch,
      title,
      body,
    }),
  });
}

// Utility: Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// UI state management
function showProgress(message, percent) {
  document.getElementById("upload-section").style.display = "none";
  document.getElementById("progress-section").style.display = "block";
  updateProgress(message, percent);
}

function updateProgress(message, percent) {
  document.getElementById("progress-message").textContent = message;
  document.getElementById("progress-fill").style.width = `${percent}%`;
  document.getElementById("progress-percent").textContent = `${percent}%`;
}

function showSuccess(prUrl) {
  document.getElementById("progress-section").style.display = "none";
  document.getElementById("success-section").style.display = "block";

  const prLink = document.getElementById("pr-link");
  prLink.href = prUrl;
  prLink.setAttribute("data-url", prUrl);
}

function showError(message) {
  document.getElementById("upload-section").style.display = "none";
  document.getElementById("progress-section").style.display = "none";
  document.getElementById("success-section").style.display = "none";
  document.getElementById("error-section").style.display = "block";
  document.getElementById("error-message").textContent = message;
}

function resetForm() {
  document.getElementById("error-section").style.display = "none";
  document.getElementById("success-section").style.display = "none";
  document.getElementById("progress-section").style.display = "none";
  document.getElementById("upload-section").style.display = "block";

  document.getElementById("contribution-form").reset();
  document.getElementById("upload-groups").innerHTML = "";
  state.uploadGroups = [];
  addInitialUploadGroup();
}

function copyPRLink() {
  const prLink = document.getElementById("pr-link");
  const url = prLink.getAttribute("data-url");

  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById("copy-pr-link");
    const originalText = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

// ==========================================
// CAMERA FUNCTIONALITY
// ==========================================
let currentCameraStream = null;
let activeCameraGroupId = null;

window.openCamera = async function (groupId) {
  activeCameraGroupId = groupId;
  const modal = document.getElementById("camera-modal");
  const video = document.getElementById("camera-stream");
  const captureBtn = document.getElementById("capture-btn");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    currentCameraStream = stream;
    video.srcObject = stream;
    modal.style.display = "flex";

    captureBtn.onclick = () => capturePhoto(groupId);
  } catch (err) {
    console.error("Camera error:", err);
    alert("Could not access camera. Please ensure permissions are granted.");
  }
};

window.closeCamera = function () {
  const modal = document.getElementById("camera-modal");
  modal.style.display = "none";

  if (currentCameraStream) {
    currentCameraStream.getTracks().forEach((track) => {
      track.stop();
    });
    currentCameraStream = null;
  }
  activeCameraGroupId = null;
};

function capturePhoto(groupId) {
  const video = document.getElementById("camera-stream");
  const canvas = document.getElementById("camera-canvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(
    (blob) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = new File([blob], `capture-${timestamp}.jpg`, {
        type: "image/jpeg",
      });

      addFileToGroup(groupId, file);
      closeCamera();
    },
    "image/jpeg",
    0.85
  );
}

// Helper to programmatically add a file to a group
function addFileToGroup(groupId, file) {
  const group = state.uploadGroups.find((g) => g.id === groupId);
  if (!group) return;

  group.files.push(file);

  const index = group.files.length - 1;
  group.fileNames[index] = file.name;

  const input = document.getElementById(`${groupId}-files`);
  const dt = new DataTransfer();
  group.files.forEach((f) => {
    dt.items.add(f);
  });
  input.files = dt.files;

  const fileList = document.getElementById(`${groupId}-file-list`);
  fileList.innerHTML = group.files
    .map((f, idx) => {
      const customName = group.fileNames[idx] || f.name;
      return `
        <div class="file-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
            </svg>
            <input type="text" class="file-name-input" value="${customName}"
                onchange="updateFileName('${groupId}', ${idx}, this.value)" />
            <span class="file-size">${formatFileSize(f.size)}</span>
            <button type="button" class="btn-remove-file" onclick="removeFile('${groupId}', ${idx})">×</button>
        </div>`;
    })
    .join("");
}

// ==========================================
// MERGE TOOL (IMAGE TO PDF)
// ==========================================
let activeMergeGroupId = null;
let mergeCandidates = []; // { file, index, originalName }

window.openMergeTool = function (groupId) {
  const group = state.uploadGroups.find((g) => g.id === groupId);
  if (!group || group.files.length === 0) {
    alert("No files in this folder to merge.");
    return;
  }

  // Filter for images
  mergeCandidates = [];
  group.files.forEach((file, index) => {
    const name = group.fileNames[index] || file.name;
    if (file.type.startsWith("image/") || name.match(/\.(jpg|jpeg|png)$/i)) {
      mergeCandidates.push({
        file,
        index,
        name,
        selected: true,
      });
    }
  });

  if (mergeCandidates.length < 1) {
    alert("No image files found in this folder to merge.");
    return;
  }

  activeMergeGroupId = groupId;
  renderMergeList();

  // Reset filename
  const timestamp = new Date().toISOString().slice(0, 10);
  document.getElementById("merge-filename").value =
    `Scanned_Doc_${timestamp}.pdf`;

  document.getElementById("merge-modal").style.display = "flex";
};

window.closeMergeTool = function () {
  document.getElementById("merge-modal").style.display = "none";
  activeMergeGroupId = null;
  mergeCandidates = [];
};

function renderMergeList() {
  const container = document.getElementById("merge-list");

  container.innerHTML = mergeCandidates
    .map((item, i) => {
      // Only create blob URL if selected (for efficiency) or just create for all
      // We need it for the thumbnail
      const url = URL.createObjectURL(item.file);

      return `
        <div class="merge-item ${item.selected ? "" : "disabled"}">
            <input type="checkbox" 
                ${item.selected ? "checked" : ""} 
                onchange="toggleMergeItem(${i})"
                style="transform: scale(1.2); cursor: pointer;">
            
            <img src="${url}" class="merge-thumb" onload="URL.revokeObjectURL(this.src)">
            
            <div class="merge-info">
                <span class="merge-name">${item.name}</span>
                <span class="merge-size">${formatFileSize(item.file.size)}</span>
            </div>
            
            <div class="merge-controls">
                <button type="button" class="btn-icon-small" 
                    onclick="moveMergeItem(${i}, -1)" 
                    ${i === 0 ? "disabled" : ""}>↑</button>
                <button type="button" class="btn-icon-small" 
                    onclick="moveMergeItem(${i}, 1)" 
                    ${i === mergeCandidates.length - 1 ? "disabled" : ""}>↓</button>
            </div>
        </div>`;
    })
    .join("");
}

window.toggleMergeItem = function (index) {
  mergeCandidates[index].selected = !mergeCandidates[index].selected;
  renderMergeList(); // Re-render to update styles
};

window.moveMergeItem = function (index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= mergeCandidates.length) return;

  // Swap
  const temp = mergeCandidates[index];
  mergeCandidates[index] = mergeCandidates[newIndex];
  mergeCandidates[newIndex] = temp;

  renderMergeList();
};

window.executeMerge = async function () {
  const selectedItems = mergeCandidates.filter((i) => i.selected);
  if (selectedItems.length === 0) {
    alert("Please select at least one image.");
    return;
  }

  const btn = document.querySelector("#merge-modal .btn-primary");
  const originalText = btn.textContent;
  btn.textContent = "Generating PDF...";
  btn.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.deletePage(1); // Start clean

    for (const item of selectedItems) {
      const imgData = await fileToBase64(item.file);
      const imgProps = doc.getImageProperties(imgData);

      // Calculate fit to A4 (210 x 297 mm)
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgRatio = imgProps.width / imgProps.height;
      const pageRatio = pdfWidth / pdfHeight;

      let w, h;
      // Fit logic
      if (imgRatio > pageRatio) {
        w = pdfWidth;
        h = w / imgRatio;
      } else {
        h = pdfHeight;
        w = h * imgRatio;
      }

      // Center image
      const x = (pdfWidth - w) / 2;
      const y = (pdfHeight - h) / 2;

      doc.addPage();
      doc.addImage(imgData, "JPEG", x, y, w, h);
    }

    // Save
    const filenameInput = document
      .getElementById("merge-filename")
      .value.trim();
    const filename = filenameInput.endsWith(".pdf")
      ? filenameInput
      : filenameInput + ".pdf";
    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

    // Add to group
    addFileToGroup(activeMergeGroupId, pdfFile);

    // Delete originals if requested
    const shouldDelete = document.getElementById(
      "merge-delete-originals"
    ).checked;
    if (shouldDelete) {
      // We need to remove files from the group based on their ORIGINAL index
      // Since removing modifies indices, we must delete from highest index to lowest
      const indicesToRemove = selectedItems
        .map((i) => i.index)
        .sort((a, b) => b - a);

      indicesToRemove.forEach((idx) => {
        removeFile(activeMergeGroupId, idx);
      });
    }

    closeMergeTool();
  } catch (error) {
    console.error("Merge failed:", error);
    alert("Failed to generate PDF: " + error.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};
