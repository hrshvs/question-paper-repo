// Load and render the folder tree
document.addEventListener('DOMContentLoaded', async () => {
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

        // Calculate statistics
        let totalFolders = 0;
        let totalFiles = 0;
        let totalCourses = 0;

        function countItems(item) {
            if (item.isFile) {
                totalFiles++;
            } else {
                totalFolders++;
                if (item.children) {
                    item.children.forEach(countItems);
                }
            }
        }

        data.folders.forEach(folder => {
            countItems(folder);
            // Count direct children that are not files as courses
            if (folder.children) {
                totalCourses += folder.children.filter(c => !c.isFile).length;
            }
        });

        // Update stats
        document.getElementById('total-folders').textContent = data.folders.length;
        document.getElementById('total-courses').textContent = totalCourses;
        document.getElementById('total-files').textContent = totalFiles;

        // Find current folder
        let currentFolder = null;
        if (currentPath) {
            currentFolder = findFolderByPath(data.folders, currentPath);
        }

        // Update page title if in a subfolder
        if (currentFolder) {
            document.querySelector('h2').textContent = currentFolder.name;
            document.querySelector('.intro-section p').textContent = `Browse the contents of ${currentFolder.name}`;
            
            // Add breadcrumb navigation
            addBreadcrumbs(currentPath);
        }

        // Render the tree
        const itemsToRender = currentFolder ? currentFolder.children : data.folders;
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
    
    introSection.insertBefore(breadcrumbDiv, introSection.firstChild);
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

    // Folder name
    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = folder.name;

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
    link.className = 'file-link';
    link.href = `https://github.com/IISERM/question-paper-repo/blob/main/${file.path}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    // File name
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;

    link.appendChild(name);
    div.appendChild(link);

    return div;
}
