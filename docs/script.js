// Theme toggle functionality
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeText = document.getElementById('theme-text');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update button state
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
    
    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButton(newTheme);
    });
}

// Load and render the folder tree
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme toggle
    initThemeToggle();
    
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const treeEl = document.getElementById('folder-tree');
    const lastUpdatedEl = document.getElementById('last-updated');

    // Get current path from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentPath = urlParams.get('path') || '';

    try {
        // Fetch the data
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error('Failed to load folder structure');
        }

        const data = await response.json();
        
        // Hide loading
        loadingEl.style.display = 'none';

        // Update last updated time
        if (data.generated) {
            const date = new Date(data.generated);
            lastUpdatedEl.textContent = date.toLocaleString();
        }

        // Find current folder
        let currentFolder = null;
        if (currentPath) {
            currentFolder = findFolderByPath(data.folders, currentPath);
        }

        // Update page title and add breadcrumb if in a subfolder
        if (currentFolder) {
            document.getElementById('page-title').textContent = currentFolder.name;
            document.getElementById('page-description').textContent = '';
            
            // Add breadcrumb navigation after the title
            addBreadcrumbs(currentPath);
        }

        // Render the tree
        let itemsToRender = currentFolder ? currentFolder.children : data.folders;
        // Filter out .github folder from root level
        if (!currentFolder) {
            itemsToRender = itemsToRender.filter(item => item.name !== '.github');
        }
        renderTree(itemsToRender, treeEl, currentPath);

    } catch (error) {
        console.error('Error loading folder structure:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = 'Failed to load folder structure. Please try refreshing the page.';
        errorEl.style.display = 'block';
    }
});

function findFolderByPath(folders, path) {
    const parts = path.split('/');
    let current = folders;
    let folder = null;

    for (const part of parts) {
        if (!current) break;
        folder = current.find(item => item.name === part && !item.isFile);
        if (!folder) return null;
        current = folder.children;
    }

    return folder;
}

function addBreadcrumbs(currentPath) {
    const introSection = document.querySelector('.intro-section');
    const breadcrumbDiv = document.createElement('div');
    breadcrumbDiv.className = 'breadcrumb';
    
    const parts = currentPath.split('/');
    let pathSoFar = '';
    
    // Home link
    const homeLink = document.createElement('a');
    homeLink.href = 'index.html';
    homeLink.textContent = 'Home';
    breadcrumbDiv.appendChild(homeLink);
    
    // Add separator and path parts
    parts.forEach((part, index) => {
        const separator = document.createElement('span');
        separator.textContent = ' / ';
        separator.className = 'breadcrumb-separator';
        breadcrumbDiv.appendChild(separator);
        
        pathSoFar += (pathSoFar ? '/' : '') + part;
        
        if (index === parts.length - 1) {
            // Current page - no link
            const current = document.createElement('span');
            current.textContent = part;
            current.className = 'breadcrumb-current';
            breadcrumbDiv.appendChild(current);
        } else {
            // Link to parent
            const link = document.createElement('a');
            link.href = `index.html?path=${encodeURIComponent(pathSoFar)}`;
            link.textContent = part;
            breadcrumbDiv.appendChild(link);
        }
    });
    
    // Append breadcrumb after the description
    introSection.appendChild(breadcrumbDiv);
}

function renderTree(items, parentElement, basePath = '') {
    if (!items || items.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = 'No items in this folder.';
        emptyMsg.className = 'empty-message';
        parentElement.appendChild(emptyMsg);
        return;
    }

    items.forEach(item => {
        if (item.isFile) {
            parentElement.appendChild(createFileElement(item));
        } else {
            parentElement.appendChild(createFolderElement(item, basePath));
        }
    });
}

function createFolderElement(folder, basePath) {
    const div = document.createElement('div');
    div.className = 'folder-item';

    const link = document.createElement('a');
    link.className = 'folder-link';
    const newPath = basePath ? `${basePath}/${folder.name}` : folder.name;
    link.href = `index.html?path=${encodeURIComponent(newPath)}`;

    // Folder name with icon
    const name = document.createElement('span');
    name.className = 'folder-name';
    
    // Add folder icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'item-icon folder-icon');
    icon.setAttribute('viewBox', '0 0 16 16');
    icon.setAttribute('fill', 'currentColor');
    icon.innerHTML = '<path d="M.54 3.87L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4H2.19z"/>';
    
    name.appendChild(icon);
    name.appendChild(document.createTextNode(folder.name));

    // Count badge
    const count = document.createElement('span');
    count.className = 'folder-count';
    const itemCount = folder.children ? folder.children.length : 0;
    count.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;

    link.appendChild(name);
    link.appendChild(count);
    div.appendChild(link);

    return div;
}

function createFileElement(file) {
    const div = document.createElement('div');
    div.className = 'file-item';

    const link = document.createElement('a');
    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith('.pdf');
    
    // Use different classes for PDF vs other files
    link.className = isPdf ? 'file-link' : 'file-link file-link-other';
    link.href = `https://github.com/IISERM/question-paper-repo/raw/main/${file.path}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    // File name with icon
    const name = document.createElement('span');
    name.className = 'file-name';
    
    // Determine file type and icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', isPdf ? 'item-icon file-icon' : 'item-icon file-icon file-icon-other');
    icon.setAttribute('viewBox', '0 0 16 16');
    icon.setAttribute('fill', 'currentColor');
    
    if (isPdf) {
        // PDF icon
        icon.innerHTML = '<path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/><path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>';
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.gif') || fileName.endsWith('.webp')) {
        // Image icon
        icon.innerHTML = '<path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>';
    } else {
        // Generic file icon
        icon.innerHTML = '<path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM4.5 9a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM4 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 1 0-1h4a.5.5 0 0 1 0 1h-4z"/>';
    }
    
    name.appendChild(icon);
    name.appendChild(document.createTextNode(file.name));

    link.appendChild(name);
    div.appendChild(link);

    return div;
}
