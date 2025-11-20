/**
 * QPR Contribution System - Frontend Logic
 */

// Configuration
const CONFIG = {
    WORKER_URL: 'https://qpr-contribution-worker.turingclub.workers.dev',
    GITHUB_CLIENT_ID: 'Ov23linzqUpdM2As790u',
    GITHUB_REPO_OWNER: 'IISERM',
    GITHUB_REPO_NAME: 'question-paper-repo',
    MAX_FILE_SIZE: 7.5 * 1024 * 1024, // 7.5 MB per file (becomes ~10MB when base64 encoded)
    MAX_BATCH_SIZE: 7.5 * 1024 * 1024, // 7.5 MB raw file size limit per batch (allows 1 max-size file per batch)
    ALLOWED_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'pptx', 'xlsx', 'zip', 'txt', 'ipynb', 'py'],
};

// State management
let state = {
    token: null,
    username: null,
    authType: null, // 'google' or 'github'
    userEmail: null, // For Google auth
    userName: null, // For Google auth (display name)
    userPhoto: null, // For Google auth (profile photo)
    uploadGroups: [],
    userForkName: null,
};

// Initialize theme toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeText = document.getElementById('theme-text');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    function updateThemeButton(theme) {
        if (theme === 'dark') {
            themeText.textContent = 'Light';
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            themeText.textContent = 'Dark';
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
    
    updateThemeButton(savedTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButton(newTheme);
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 QPR Contribution Portal - Debug Mode');
    console.log('═══════════════════════════════════════════════════');
    console.log('Config:', {
        maxFileSize: `${(CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)} MB`,
        maxBatchSize: `${(CONFIG.MAX_BATCH_SIZE / (1024 * 1024)).toFixed(1)} MB`,
        allowedExtensions: CONFIG.ALLOWED_EXTENSIONS.join(', ')
    });
    console.log('═══════════════════════════════════════════════════');
    
    initThemeToggle();
    checkAuthStatus();
    setupEventListeners();
    addInitialUploadGroup();
});

// Check authentication status from URL or localStorage
function checkAuthStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const username = urlParams.get('username');
    const error = urlParams.get('error');

    if (error) {
        showError(`Authentication failed: ${error}`);
        return;
    }

    // Check for GitHub OAuth callback
    if (token && username) {
        // Store credentials
        state.token = token;
        state.username = username;
        state.authType = 'github';
        localStorage.setItem('github_token', token);
        localStorage.setItem('github_username', username);
        localStorage.setItem('auth_type', 'github');
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        showAuthenticatedUI();
        return;
    }

    // Check localStorage for existing auth
    const authType = localStorage.getItem('auth_type');
    
    if (authType === 'google') {
        // Restore Google auth state
        const userEmail = localStorage.getItem('user_email');
        const userName = localStorage.getItem('user_name');
        const userPhoto = localStorage.getItem('user_photo');
        
        if (userEmail && userName) {
            state.authType = 'google';
            state.userEmail = userEmail;
            state.userName = userName;
            state.userPhoto = userPhoto;
            showAuthenticatedUI();
        }
    } else if (authType === 'github') {
        // Restore GitHub auth state
        const storedToken = localStorage.getItem('github_token');
        const storedUsername = localStorage.getItem('github_username');
        
        if (storedToken && storedUsername) {
            state.token = storedToken;
            state.username = storedUsername;
            state.authType = 'github';
            showAuthenticatedUI();
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('google-login-btn').addEventListener('click', initiateGoogleLogin);
    document.getElementById('github-login-btn').addEventListener('click', initiateGitHubLogin);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('add-folder-btn').addEventListener('click', addUploadGroup);
    document.getElementById('contribution-form').addEventListener('submit', handleSubmit);
    document.getElementById('retry-btn').addEventListener('click', resetForm);
    document.getElementById('contribute-more-btn').addEventListener('click', resetForm);
    document.getElementById('copy-pr-link').addEventListener('click', copyPRLink);
}

// Initiate Google OAuth login (Firebase)
async function initiateGoogleLogin() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        // Check if email is from allowed domain
        const allowedDomain = 'iisermohali.ac.in';
        if (!user.email.endsWith(`@${allowedDomain}`)) {
            // Sign out immediately
            await auth.signOut();
            showError(`Access restricted to ${allowedDomain} email addresses only.\n\nYour email: ${user.email}\n\nPlease use your IISER Mohali institute email or sign in with GitHub for external contributions.`);
            return;
        }
        
        // Store Google auth info
        state.authType = 'google';
        state.userEmail = user.email;
        state.userName = user.displayName || user.email.split('@')[0];
        state.userPhoto = user.photoURL;
        
        // Store in localStorage
        localStorage.setItem('auth_type', 'google');
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('user_name', state.userName);
        localStorage.setItem('user_photo', user.photoURL || '');
        
        console.log('Google sign-in successful:', user.email);
        showAuthenticatedUI();
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        if (error.code !== 'auth/popup-closed-by-user') {
            showError(`Google sign-in failed: ${error.message}`);
        }
    }
}

// Initiate GitHub OAuth login
function initiateGitHubLogin() {
    const redirectUri = `${CONFIG.WORKER_URL}/auth/callback`;
    const scope = 'public_repo';
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${CONFIG.GITHUB_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${scope}&` +
        `state=${state}`;
    
    window.location.href = authUrl;
}

// Logout
async function logout() {
    // Sign out from Firebase if using Google auth
    if (state.authType === 'google') {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Firebase sign-out error:', error);
        }
    }
    
    // Clear state
    state.token = null;
    state.username = null;
    state.authType = null;
    state.userEmail = null;
    state.userName = null;
    state.userPhoto = null;
    
    // Clear localStorage
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_username');
    localStorage.removeItem('auth_type');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_photo');
    
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('user-section').style.display = 'none';
    document.getElementById('upload-section').style.display = 'none';
}

// Show authenticated UI
function showAuthenticatedUI() {
    const usernameElement = document.getElementById('username');
    
    if (state.authType === 'google') {
        // Display Google user info (without profile photo)
        usernameElement.innerHTML = `<strong>${state.userName}</strong> (${state.userEmail})`;
    } else {
        // Display GitHub username
        usernameElement.textContent = state.username;
    }
    
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('user-section').style.display = 'block';
    document.getElementById('upload-section').style.display = 'block';
}

// Add initial upload group
function addInitialUploadGroup() {
    addUploadGroup();
}

// Add upload group
function addUploadGroup() {
    const groupId = `group-${Date.now()}`;
    const groupIndex = state.uploadGroups.length;
    
    console.log(`[addUploadGroup] Creating new group: ${groupId} (index ${groupIndex})`);
    
    const groupHTML = `
        <div class="upload-group" id="${groupId}">
            <div class="upload-group-header">
                <h4>Folder ${groupIndex + 1}</h4>
                ${groupIndex > 0 ? `<button type="button" class="btn-remove" onclick="removeUploadGroup('${groupId}')">Remove</button>` : ''}
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
                <label for="${groupId}-files">Files <span class="required">*</span></label>
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
            </div>
        </div>
    `;
    
    document.getElementById('upload-groups').insertAdjacentHTML('beforeend', groupHTML);
    state.uploadGroups.push({ id: groupId, files: [], fileNames: {} });
    
    console.log(`[addUploadGroup] ✅ Group created. Total groups: ${state.uploadGroups.length}`);
    
    // Setup drag and drop
    setupDragAndDrop(groupId);
}

// Remove upload group
window.removeUploadGroup = function(groupId) {
    const group = document.getElementById(groupId);
    if (group) {
        group.remove();
        state.uploadGroups = state.uploadGroups.filter(g => g.id !== groupId);
        
        // Renumber remaining groups
        document.querySelectorAll('.upload-group').forEach((group, index) => {
            group.querySelector('h4').textContent = `Folder ${index + 1}`;
        });
    }
};

// Setup drag and drop
function setupDragAndDrop(groupId) {
    const dropZone = document.getElementById(`${groupId}-drop-zone`);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });
    
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        const input = document.getElementById(`${groupId}-files`);
        input.files = files;
        handleFileSelect(groupId);
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Handle file selection
window.handleFileSelect = function(groupId) {
    console.log(`[handleFileSelect] Starting for group: ${groupId}`);
    
    const input = document.getElementById(`${groupId}-files`);
    const newFiles = Array.from(input.files);
    const fileList = document.getElementById(`${groupId}-file-list`);
    
    console.log(`[handleFileSelect] New files selected:`, newFiles.length);
    newFiles.forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file.name} (${formatFileSize(file.size)})`);
    });
    
    // Get existing files from state
    const group = state.uploadGroups.find(g => g.id === groupId);
    const existingFiles = group ? [...group.files] : [];
    
    console.log(`[handleFileSelect] Existing files in state:`, existingFiles.length);
    existingFiles.forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file.name} (${formatFileSize(file.size)})`);
    });
    
    // Validate new files
    const validNewFiles = [];
    const errors = [];
    const oversizedFiles = [];
    
    newFiles.forEach(file => {
        // Check file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            errors.push(`${file.name}: File too large (${sizeMB} MB, max 7.5 MB)`);
            oversizedFiles.push({ name: file.name, size: sizeMB });
            console.log(`[handleFileSelect] ❌ Rejected (too large): ${file.name} (${sizeMB} MB)`);
            return;
        }
        
        // Check file extension
        const extension = file.name.split('.').pop().toLowerCase();
        if (!CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
            errors.push(`${file.name}: Unsupported file type`);
            console.log(`[handleFileSelect] ❌ Rejected (unsupported type): ${file.name} (.${extension})`);
            return;
        }
        
        validNewFiles.push(file);
        console.log(`[handleFileSelect] ✅ Accepted: ${file.name}`);
    });
    
    // Combine existing files with new valid files
    const allFiles = [...existingFiles, ...validNewFiles];
    
    console.log(`[handleFileSelect] Total files after merge:`, allFiles.length);
    allFiles.forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file.name} (${formatFileSize(file.size)})`);
    });
    
    // Show errors with helpful message for oversized files
    if (errors.length > 0) {
        let errorMessage = 'Some files were rejected:\n\n' + errors.join('\n');
        
        if (oversizedFiles.length > 0) {
            errorMessage += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            errorMessage += '📦 Files larger than 7.5 MB?\n\n';
            errorMessage += 'Option 1: Compress your PDF using online tools\n';
            errorMessage += 'Option 2: Create a Pull Request directly on GitHub:\n';
            errorMessage += 'https://github.com/IISERM/question-paper-repo/pulls\n\n';
            errorMessage += 'GitHub supports files up to 100 MB!';
        }
        
        alert(errorMessage);
        
        // Show persistent warning banner if there are oversized files
        showOversizedFileWarning(groupId, oversizedFiles);
    } else {
        // Remove warning if all files are valid
        removeOversizedFileWarning(groupId);
    }
    
    // Update state with ALL files (existing + new)
    if (group) {
        group.files = allFiles;
        
        // Initialize custom names for new files (preserve existing custom names)
        allFiles.forEach((file, index) => {
            if (!group.fileNames[index]) {
                group.fileNames[index] = file.name;
                console.log(`[handleFileSelect] Set default name for file ${index}: ${file.name}`);
            }
        });
    }
    
    // Update the file input to contain all files
    const dt = new DataTransfer();
    allFiles.forEach(file => dt.items.add(file));
    input.files = dt.files;
    
    console.log(`[handleFileSelect] Updated input.files.length:`, input.files.length);
    
    // Display all files with editable names
    fileList.innerHTML = allFiles.map((file, index) => {
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
    }).join('');
    
    console.log(`[handleFileSelect] ✅ Finished. Displaying ${allFiles.length} files.`);
};

// Remove file
window.removeFile = function(groupId, index) {
    console.log(`[removeFile] Removing file at index ${index} from group ${groupId}`);
    
    const group = state.uploadGroups.find(g => g.id === groupId);
    if (group) {
        const removedFile = group.files[index];
        console.log(`[removeFile] Removing: ${removedFile.name}`);
        
        group.files.splice(index, 1);
        
        // Update fileNames mapping
        const newFileNames = {};
        Object.keys(group.fileNames).forEach(key => {
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
        
        // Update file input
        const input = document.getElementById(`${groupId}-files`);
        const dt = new DataTransfer();
        group.files.forEach(file => dt.items.add(file));
        input.files = dt.files;
        
        // Refresh display (but prevent handleFileSelect from re-processing)
        // Instead, just re-render the list
        const fileList = document.getElementById(`${groupId}-file-list`);
        fileList.innerHTML = group.files.map((file, idx) => {
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
        }).join('');
        
        console.log(`[removeFile] ✅ File removed successfully`);
    }
};

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Show warning for oversized files
function showOversizedFileWarning(groupId, oversizedFiles) {
    // Remove existing warning if any
    removeOversizedFileWarning(groupId);
    
    const group = document.getElementById(groupId);
    if (!group) return;
    
    const fileNames = oversizedFiles.map(f => `${f.name} (${f.size} MB)`).join(', ');
    
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
    fileList.insertAdjacentHTML('afterend', warningHTML);
}

// Remove oversized file warning
function removeOversizedFileWarning(groupId) {
    const warning = document.getElementById(`${groupId}-warning`);
    if (warning) {
        warning.remove();
    }
}

// Update path preview
window.updatePathPreview = function(groupId) {
    const subject = document.getElementById(`${groupId}-subject`).value;
    const courseCode = document.getElementById(`${groupId}-coursecode`).value;
    const year = document.getElementById(`${groupId}-year`).value;
    const customFolder = document.getElementById(`${groupId}-customfolder`).value.trim();
    
    const pathDisplay = document.getElementById(`${groupId}-path-display`);
    
    if (subject && courseCode && year) {
        let path = `${subject}/${courseCode}/${year}`;
        if (customFolder) {
            path += `/${customFolder}`;
        }
        pathDisplay.textContent = path;
        pathDisplay.style.color = 'var(--success-color)';
    } else {
        pathDisplay.textContent = 'Select options above';
        pathDisplay.style.color = 'var(--text-muted)';
    }
};

// Validate course code (3 digits only)
window.validateCourseCode = function(groupId) {
    const input = document.getElementById(`${groupId}-coursecode`);
    const value = input.value;
    
    // Remove non-digits
    input.value = value.replace(/\D/g, '').slice(0, 3);
    
    // Update path preview
    updatePathPreview(groupId);
};

// Validate year (4 digits only)
window.validateYear = function(groupId) {
    const input = document.getElementById(`${groupId}-year`);
    const value = input.value;
    
    // Remove non-digits
    input.value = value.replace(/\D/g, '').slice(0, 4);
    
    // Update path preview
    updatePathPreview(groupId);
};

// Update filename
window.updateFileName = function(groupId, index, newName) {
    console.log(`[updateFileName] Group: ${groupId}, Index: ${index}, New name: ${newName}`);
    
    const group = state.uploadGroups.find(g => g.id === groupId);
    if (group) {
        const originalName = group.files[index].name;
        
        // Sanitize filename
        const sanitized = newName.trim();
        if (sanitized) {
            group.fileNames[index] = sanitized;
            console.log(`[updateFileName] ✅ Updated: "${originalName}" → "${sanitized}"`);
        } else {
            // Revert to original if empty
            group.fileNames[index] = originalName;
            const input = document.querySelector(`#${groupId}-file-list .file-item:nth-child(${index + 1}) .file-name-input`);
            if (input) {
                input.value = originalName;
            }
            console.log(`[updateFileName] ⚠️ Empty name, reverted to: "${originalName}"`);
        }
    }
};

// Get folder path from form inputs
function getFolderPath(groupId) {
    const subject = document.getElementById(`${groupId}-subject`).value;
    const courseCode = document.getElementById(`${groupId}-coursecode`).value;
    const year = document.getElementById(`${groupId}-year`).value;
    const customFolder = document.getElementById(`${groupId}-customfolder`).value.trim();
    
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
    
    // Validate form
    const validation = validateForm();
    if (!validation.valid) {
        alert(validation.message);
        return;
    }
    
    // Get PR details
    const prTitle = document.getElementById('pr-title').value.trim();
    const prDescription = document.getElementById('pr-description').value.trim();
    
    // Route to appropriate flow based on auth type
    if (state.authType === 'google') {
        await handleDirectContribution(prTitle, prDescription);
    } else {
        await handleGitHubContribution(prTitle, prDescription);
    }
}

// Calculate size of a file with base64 encoding overhead
function calculateBase64Size(file) {
    // Base64 encoding increases size by ~33%
    return Math.ceil(file.size * 1.33);
}

// Build complete upload groups list for PR description
function buildCompleteUploadGroupsList(allUploadedFiles) {
    // Group files by folder path
    const groupedByPath = {};
    
    allUploadedFiles.forEach(({ folderPath, fileName }) => {
        if (!groupedByPath[folderPath]) {
            groupedByPath[folderPath] = [];
        }
        groupedByPath[folderPath].push(fileName);
    });
    
    // Convert to array format
    return Object.entries(groupedByPath).map(([folderPath, fileNames]) => ({
        folderPath,
        files: fileNames.map(name => ({ name })),
    }));
}

// Batch files to stay under MAX_BATCH_SIZE
function createBatches(uploadGroupsData, fileObjects) {
    const batches = [];
    let currentBatch = [];
    let currentBatchSize = 0;
    
    console.log('[createBatches] Starting batching process...');
    console.log(`[createBatches] MAX_BATCH_SIZE: ${(CONFIG.MAX_BATCH_SIZE / (1024 * 1024)).toFixed(2)} MB`);
    
    // Flatten all files with their metadata
    const allFiles = [];
    uploadGroupsData.forEach((group, groupIdx) => {
        group.files.forEach((fileData, fileIdx) => {
            const fileObj = fileObjects[groupIdx][fileIdx];
            const fileSize = calculateBase64Size(fileObj);
            const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
            const originalSizeMB = (fileObj.size / (1024 * 1024)).toFixed(2);
            
            console.log(`[createBatches] File: ${fileData.name}`);
            console.log(`  Original: ${originalSizeMB} MB → Base64: ${fileSizeMB} MB`);
            
            allFiles.push({
                groupIdx,
                folderPath: group.folderPath,
                fileData,
                fileObj,
                fileSize
            });
        });
    });
    
    console.log(`[createBatches] Total files to batch: ${allFiles.length}`);
    
    // Split into batches
    for (const item of allFiles) {
        const itemSizeMB = (item.fileSize / (1024 * 1024)).toFixed(2);
        const maxBatchMB = (CONFIG.MAX_BATCH_SIZE / (1024 * 1024)).toFixed(2);
        
        // If single file exceeds batch size, put it in its own batch (but allow it)
        if (item.fileSize > CONFIG.MAX_BATCH_SIZE) {
            console.log(`[createBatches] ⚠️ File ${item.fileData.name} (${itemSizeMB} MB) exceeds batch limit (${maxBatchMB} MB)`);
            console.log(`[createBatches]    → Creating dedicated batch for this file`);
            
            if (currentBatch.length > 0) {
                console.log(`[createBatches]    → Saving current batch with ${currentBatch.length} file(s)`);
                batches.push(currentBatch);
                currentBatch = [];
                currentBatchSize = 0;
            }
            batches.push([item]);
            console.log(`[createBatches]    → Batch #${batches.length} created (1 oversized file)`);
            continue;
        }
        
        // If adding this file would exceed limit, start new batch
        if (currentBatchSize + item.fileSize > CONFIG.MAX_BATCH_SIZE && currentBatch.length > 0) {
            console.log(`[createBatches] Adding ${item.fileData.name} would exceed limit, creating new batch`);
            batches.push(currentBatch);
            console.log(`[createBatches] Batch #${batches.length} created (${currentBatch.length} file(s))`);
            currentBatch = [];
            currentBatchSize = 0;
        }
        
        console.log(`[createBatches] Adding ${item.fileData.name} to current batch`);
        currentBatch.push(item);
        currentBatchSize += item.fileSize;
    }
    
    // Add remaining files
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
        console.log(`[createBatches] Final batch #${batches.length} created (${currentBatch.length} file(s))`);
    }
    
    console.log(`[createBatches] ✅ Total batches created: ${batches.length}`);
    batches.forEach((batch, idx) => {
        const batchSizeMB = (batch.reduce((sum, item) => sum + item.fileSize, 0) / (1024 * 1024)).toFixed(2);
        console.log(`  Batch ${idx + 1}: ${batch.length} file(s), ${batchSizeMB} MB`);
        batch.forEach(item => {
            const sizeMB = (item.fileSize / (1024 * 1024)).toFixed(2);
            console.log(`    - ${item.fileData.name} (${sizeMB} MB)`);
        });
    });
    
    return batches;
}

// Handle direct contribution (Google auth flow)
async function handleDirectContribution(prTitle, prDescription) {
    showProgress('Starting direct contribution...', 0);
    
    try {
        // Prepare upload groups data
        const uploadGroupsData = state.uploadGroups.map(group => {
            const folderPath = getFolderPath(group.id);
            if (!folderPath) {
                throw new Error('Please fill in all required path fields');
            }
            return {
                folderPath: folderPath,
                files: group.files.map((file, index) => ({
                    name: group.fileNames[index] || file.name,
                    content: null, // Will be filled below
                })),
            };
        });
        
        // Keep file objects for batching
        const fileObjects = state.uploadGroups.map(group => group.files);
        
        // Create batches based on size
        updateProgress('Preparing files...', 5);
        const batches = createBatches(uploadGroupsData, fileObjects);
        
        console.log(`Split into ${batches.length} batch(es)`);
        
        let branchName = null;
        let totalFilesProcessed = 0;
        const totalFiles = batches.reduce((sum, batch) => sum + batch.length, 0);
        
        // Keep track of all uploaded files for PR description
        const allUploadedFiles = [];
        
        console.log('═══════════════════════════════════════════════════');
        console.log('📤 Starting batch upload process');
        console.log(`Total batches: ${batches.length}`);
        console.log(`Total files: ${totalFiles}`);
        console.log('═══════════════════════════════════════════════════');
        
        // Process each batch
        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
            const batch = batches[batchIdx];
            const isLastBatch = batchIdx === batches.length - 1;
            
            console.log(`\n[Batch ${batchIdx + 1}/${batches.length}] Starting...`);
            console.log(`  Files in this batch: ${batch.length}`);
            console.log(`  Branch name: ${branchName || 'NEW (will be created)'}`);
            console.log(`  Should create PR: ${isLastBatch}`);
            
            updateProgress(
                `Uploading batch ${batchIdx + 1}/${batches.length}...`,
                10 + Math.floor((batchIdx / batches.length) * 70)
            );
            
            // Convert batch files to base64
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
            
            // Convert to array format expected by worker
            const batchUploadGroups = Object.entries(batchGroups).map(([folderPath, files]) => ({
                folderPath,
                files,
            }));
            
            // Track uploaded files for PR description
            batchUploadGroups.forEach(group => {
                group.files.forEach(file => {
                    allUploadedFiles.push({
                        folderPath: group.folderPath,
                        fileName: file.name,
                    });
                });
            });
            
            console.log(`[Batch ${batchIdx + 1}] Total files tracked so far: ${allUploadedFiles.length}`);
            
            // For the last batch, send info about ALL uploaded files for PR description
            let uploadGroupsForPR = undefined;
            if (isLastBatch) {
                uploadGroupsForPR = buildCompleteUploadGroupsList(allUploadedFiles);
                console.log(`[Batch ${batchIdx + 1}] 📋 Complete file list for PR description:`);
                uploadGroupsForPR.forEach(group => {
                    console.log(`  ${group.folderPath}/`);
                    group.files.forEach(f => console.log(`    - ${f.name}`));
                });
            }
            
            console.log(`[Batch ${batchIdx + 1}] Sending to worker...`);
            
            const requestPayload = {
                userEmail: state.userEmail,
                userName: state.userName,
                uploadGroups: batchUploadGroups, // Current batch files to upload
                uploadGroupsForPR: isLastBatch ? uploadGroupsForPR : undefined, // All files for PR description
                prTitle: prTitle,
                prDescription: prDescription,
                branchName: branchName, // Use existing branch for subsequent batches
                shouldCreatePR: isLastBatch, // Only create PR on last batch
                batchInfo: {
                    current: batchIdx + 1,
                    total: batches.length,
                },
            };
            console.log(`  Request payload:`, {
                uploadGroups: batchUploadGroups.length,
                branchName: requestPayload.branchName,
                shouldCreatePR: requestPayload.shouldCreatePR,
                batchInfo: requestPayload.batchInfo
            });
            
            // Send batch to worker
            const response = await fetch(`${CONFIG.WORKER_URL}/api/contribute-direct`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            });
            
            if (!response.ok) {
                const error = await response.json();
                console.error(`[Batch ${batchIdx + 1}] ❌ Upload failed:`, error);
                throw new Error(error.error || 'Failed to upload batch');
            }
            
            const result = await response.json();
            console.log(`[Batch ${batchIdx + 1}] ✅ Upload successful`);
            console.log(`  Response:`, {
                branch: result.branch,
                prCreated: !!result.pr,
                filesUploaded: result.filesUploaded?.length || 0
            });
            
            // Store branch name from first batch
            if (batchIdx === 0) {
                branchName = result.branch;
                console.log(`[Batch ${batchIdx + 1}] 🌿 Branch created: ${branchName}`);
                console.log(`  → This branch will be reused for remaining batches`);
            }
            
            totalFilesProcessed += batch.length;
            console.log(`[Batch ${batchIdx + 1}] Progress: ${totalFilesProcessed}/${totalFiles} files uploaded`);
            
            // Show PR result on last batch
            if (isLastBatch) {
                if (result.pr) {
                    console.log(`[Batch ${batchIdx + 1}] 🎉 PR created: ${result.pr.html_url}`);
                    updateProgress('Complete!', 100);
                    
                    setTimeout(() => {
                        showSuccess(result.pr.html_url);
                    }, 500);
                } else {
                    console.error(`[Batch ${batchIdx + 1}] ⚠️ Last batch but no PR returned!`);
                }
            }
        }
        
        console.log('═══════════════════════════════════════════════════');
        console.log('✅ All batches uploaded successfully');
        console.log('═══════════════════════════════════════════════════');
        
    } catch (error) {
        console.error('Direct contribution error:', error);
        showError(error.message || 'An unexpected error occurred');
    }
}

// Handle GitHub contribution (existing fork-based flow)
async function handleGitHubContribution(prTitle, prDescription) {
    showProgress('Starting contribution process...', 0);
    
    try {
        // Step 1: Check for existing fork
        updateProgress('Checking for existing fork...', 10);
        const forkExists = await checkFork();
        
        let fork;
        if (forkExists) {
            updateProgress('Using existing fork...', 20);
            fork = { owner: { login: state.username } };
        } else {
            // Step 2: Fork the repository
            updateProgress('Forking repository...', 20);
            fork = await forkRepository();
        }
        
        state.userForkName = fork.owner.login;
        
        // Step 3: Create a new branch
        updateProgress('Creating new branch...', 30);
        const branchName = `contribution-${Date.now()}`;
        await createBranch(state.userForkName, branchName);
        
        // Step 4: Upload files
        const totalFiles = state.uploadGroups.reduce((sum, g) => sum + g.files.length, 0);
        let uploadedFiles = 0;
        
        for (const group of state.uploadGroups) {
            const folderPath = getFolderPath(group.id);
            if (!folderPath) {
                throw new Error('Please fill in all required path fields');
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
        
        // Step 5: Create pull request
        updateProgress('Creating pull request...', 90);
        
        const filesList = state.uploadGroups.map(group => {
            const path = getFolderPath(group.id);
            const fileNames = group.files.map((f, i) => group.fileNames[i] || f.name);
            return `- **${path}/**:\n${fileNames.map(name => `  - ${name}`).join('\n')}`;
        }).join('\n\n');
        
        const prBody = `${prDescription ? prDescription + '\n\n' : ''}### Files Added:\n${filesList}\n\n---\n*This PR was created via the QPR Contribution Portal*`;
        
        const pr = await createPullRequest(
            state.userForkName,
            branchName,
            prTitle,
            prBody
        );
        
        updateProgress('Complete!', 100);
        
        // Show success
        setTimeout(() => {
            showSuccess(pr.html_url);
        }, 500);
        
    } catch (error) {
        console.error('Contribution error:', error);
        showError(error.message || 'An unexpected error occurred');
    }
}

// Validate form
function validateForm() {
    // Check if authenticated
    if (!state.authType) {
        return { valid: false, message: 'Please sign in first (Google or GitHub)' };
    }
    
    // Additional validation for Google auth
    if (state.authType === 'google' && !state.userEmail) {
        return { valid: false, message: 'Google authentication incomplete. Please sign in again.' };
    }
    
    // Additional validation for GitHub auth
    if (state.authType === 'github' && !state.token) {
        return { valid: false, message: 'GitHub authentication incomplete. Please sign in again.' };
    }
    
    // Check if at least one group has files
    const hasFiles = state.uploadGroups.some(g => g.files.length > 0);
    if (!hasFiles) {
        return { valid: false, message: 'Please select at least one file to upload' };
    }
    
    // Check if all groups with files have valid paths
    for (const group of state.uploadGroups) {
        if (group.files.length > 0) {
            const subject = document.getElementById(`${group.id}-subject`).value;
            const courseCode = document.getElementById(`${group.id}-coursecode`).value;
            const year = document.getElementById(`${group.id}-year`).value;
            
            if (!subject) {
                return { valid: false, message: 'Please select a subject for all file groups' };
            }
            
            if (!courseCode || courseCode.length !== 3) {
                return { valid: false, message: 'Please enter a valid 3-digit course code for all file groups' };
            }
            
            if (!year || year.length !== 4) {
                return { valid: false, message: 'Please enter a valid 4-digit year for all file groups' };
            }
        }
    }
    
    // Check PR title
    const prTitle = document.getElementById('pr-title').value.trim();
    if (!prTitle) {
        return { valid: false, message: 'Please provide a pull request title' };
    }
    
    return { valid: true };
}

// API calls
async function makeAPICall(endpoint, options = {}) {
    const response = await fetch(`${CONFIG.WORKER_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`,
            ...options.headers,
        },
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }
    
    return response.json();
}

async function checkFork() {
    const result = await makeAPICall('/api/check-fork');
    return result.exists;
}

async function forkRepository() {
    return makeAPICall('/api/fork', { method: 'POST' });
}

async function createBranch(owner, branchName) {
    return makeAPICall('/api/create-branch', {
        method: 'POST',
        body: JSON.stringify({
            owner,
            repo: CONFIG.GITHUB_REPO_NAME,
            branchName,
        }),
    });
}

async function uploadFile(owner, path, file, branch) {
    // Convert file to base64
    const base64Content = await fileToBase64(file);
    
    return makeAPICall('/api/upload-file', {
        method: 'POST',
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
    return makeAPICall('/api/create-pr', {
        method: 'POST',
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
            // Remove data URL prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// UI state management
function showProgress(message, percent) {
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('progress-section').style.display = 'block';
    updateProgress(message, percent);
}

function updateProgress(message, percent) {
    document.getElementById('progress-message').textContent = message;
    document.getElementById('progress-fill').style.width = `${percent}%`;
    document.getElementById('progress-percent').textContent = `${percent}%`;
}

function showSuccess(prUrl) {
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'block';
    
    const prLink = document.getElementById('pr-link');
    prLink.href = prUrl;
    prLink.setAttribute('data-url', prUrl);
}

function showError(message) {
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'none';
    document.getElementById('error-section').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

function resetForm() {
    document.getElementById('error-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'none';
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('upload-section').style.display = 'block';
    
    // Clear form
    document.getElementById('contribution-form').reset();
    document.getElementById('upload-groups').innerHTML = '';
    state.uploadGroups = [];
    addInitialUploadGroup();
}

function copyPRLink() {
    const prLink = document.getElementById('pr-link');
    const url = prLink.getAttribute('data-url');
    
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copy-pr-link');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

