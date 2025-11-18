/**
 * QPR Contribution System - Frontend Logic
 */

// Configuration
const CONFIG = {
    WORKER_URL: 'https://qpr-contribution-worker.qpr-iiserm.workers.dev/auth/callback',
    GITHUB_CLIENT_ID: 'Ov23linzqUpdM2As790u',
    GITHUB_REPO_OWNER: 'IISERM',
    GITHUB_REPO_NAME: 'question-paper-repo',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
    ALLOWED_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'pptx', 'xlsx', 'zip', 'txt', 'ipynb', 'py'],
};

// State management
let state = {
    token: null,
    username: null,
    uploadGroups: [],
    userForkName: null,
};

// Initialize theme toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeText = document.getElementById('theme-text');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    
    const savedTheme = localStorage.getItem('theme') || 'light';
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

    if (token && username) {
        // Store credentials
        state.token = token;
        state.username = username;
        localStorage.setItem('github_token', token);
        localStorage.setItem('github_username', username);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        showAuthenticatedUI();
    } else {
        // Check localStorage
        const storedToken = localStorage.getItem('github_token');
        const storedUsername = localStorage.getItem('github_username');
        
        if (storedToken && storedUsername) {
            state.token = storedToken;
            state.username = storedUsername;
            showAuthenticatedUI();
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('github-login-btn').addEventListener('click', initiateGitHubLogin);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('add-folder-btn').addEventListener('click', addUploadGroup);
    document.getElementById('contribution-form').addEventListener('submit', handleSubmit);
    document.getElementById('retry-btn').addEventListener('click', resetForm);
    document.getElementById('contribute-more-btn').addEventListener('click', resetForm);
    document.getElementById('copy-pr-link').addEventListener('click', copyPRLink);
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
function logout() {
    state.token = null;
    state.username = null;
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_username');
    
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('user-section').style.display = 'none';
    document.getElementById('upload-section').style.display = 'none';
}

// Show authenticated UI
function showAuthenticatedUI() {
    document.getElementById('username').textContent = state.username;
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
    
    const groupHTML = `
        <div class="upload-group" id="${groupId}">
            <div class="upload-group-header">
                <h4>Folder ${groupIndex + 1}</h4>
                ${groupIndex > 0 ? `<button type="button" class="btn-remove" onclick="removeUploadGroup('${groupId}')">Remove</button>` : ''}
            </div>
            <div class="form-group">
                <label for="${groupId}-path">Folder Path <span class="required">*</span></label>
                <input 
                    type="text" 
                    id="${groupId}-path" 
                    class="folder-path-input"
                    placeholder="e.g., Physics/403/2025" 
                    required
                />
                <small class="form-hint">Format: Subject/CourseCode/Year (e.g., Math/201/2024)</small>
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
                        <span class="upload-hint">PDF, JPG, PNG, DOCX, PPTX, XLSX, ZIP (max 10 MB each)</span>
                    </label>
                </div>
                <div id="${groupId}-file-list" class="file-list"></div>
            </div>
        </div>
    `;
    
    document.getElementById('upload-groups').insertAdjacentHTML('beforeend', groupHTML);
    state.uploadGroups.push({ id: groupId, files: [] });
    
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
    const input = document.getElementById(`${groupId}-files`);
    const files = Array.from(input.files);
    const fileList = document.getElementById(`${groupId}-file-list`);
    
    // Validate files
    const validFiles = [];
    const errors = [];
    
    files.forEach(file => {
        // Check file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            errors.push(`${file.name}: File too large (max 10 MB)`);
            return;
        }
        
        // Check file extension
        const extension = file.name.split('.').pop().toLowerCase();
        if (!CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
            errors.push(`${file.name}: Unsupported file type`);
            return;
        }
        
        validFiles.push(file);
    });
    
    // Show errors
    if (errors.length > 0) {
        alert('Some files were rejected:\n\n' + errors.join('\n'));
    }
    
    // Update state
    const group = state.uploadGroups.find(g => g.id === groupId);
    if (group) {
        group.files = validFiles;
    }
    
    // Display files
    fileList.innerHTML = validFiles.map((file, index) => `
        <div class="file-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
            </svg>
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
            <button type="button" class="btn-remove-file" onclick="removeFile('${groupId}', ${index})">×</button>
        </div>
    `).join('');
};

// Remove file
window.removeFile = function(groupId, index) {
    const group = state.uploadGroups.find(g => g.id === groupId);
    if (group) {
        group.files.splice(index, 1);
        
        // Update file input
        const input = document.getElementById(`${groupId}-files`);
        const dt = new DataTransfer();
        group.files.forEach(file => dt.items.add(file));
        input.files = dt.files;
        
        // Refresh display
        handleFileSelect(groupId);
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
    
    // Show progress
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
            const folderPath = document.getElementById(`${group.id}-path`).value.trim();
            
            for (const file of group.files) {
                updateProgress(
                    `Uploading ${file.name}...`,
                    30 + Math.floor((uploadedFiles / totalFiles) * 50)
                );
                
                await uploadFile(
                    state.userForkName,
                    `${folderPath}/${file.name}`,
                    file,
                    branchName
                );
                
                uploadedFiles++;
            }
        }
        
        // Step 5: Create pull request
        updateProgress('Creating pull request...', 90);
        
        const filesList = state.uploadGroups.map(group => {
            const path = document.getElementById(`${group.id}-path`).value.trim();
            return `- **${path}/**:\n${group.files.map(f => `  - ${f.name}`).join('\n')}`;
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
    if (!state.token) {
        return { valid: false, message: 'Please sign in with GitHub first' };
    }
    
    // Check if at least one group has files
    const hasFiles = state.uploadGroups.some(g => g.files.length > 0);
    if (!hasFiles) {
        return { valid: false, message: 'Please select at least one file to upload' };
    }
    
    // Check if all groups with files have folder paths
    for (const group of state.uploadGroups) {
        if (group.files.length > 0) {
            const pathInput = document.getElementById(`${group.id}-path`);
            if (!pathInput.value.trim()) {
                return { valid: false, message: 'Please specify folder path for all groups with files' };
            }
            
            // Validate folder path format
            const path = pathInput.value.trim();
            if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+/.test(path)) {
                return { valid: false, message: `Invalid folder path format: ${path}\nUse format: Subject/CourseCode/Year` };
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

