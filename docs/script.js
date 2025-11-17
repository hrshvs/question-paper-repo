// Load and render the folder tree
document.addEventListener('DOMContentLoaded', async () => {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const treeEl = document.getElementById('folder-tree');
    const lastUpdatedEl = document.getElementById('last-updated');

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

        // Render the tree
        renderTree(data.folders, treeEl);

    } catch (error) {
        console.error('Error loading folder structure:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = 'Failed to load folder structure. Please try refreshing the page.';
        errorEl.style.display = 'block';
    }
});

function renderTree(items, parentElement, level = 0) {
    items.forEach(item => {
        if (item.isFile) {
            parentElement.appendChild(createFileElement(item));
        } else {
            parentElement.appendChild(createFolderElement(item, level));
        }
    });
}

function createFolderElement(folder, level) {
    const div = document.createElement('div');
    div.className = 'folder-item';

    const header = document.createElement('div');
    header.className = 'folder-header';

    // Toggle icon
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon';
    toggleIcon.textContent = '▼';

    // Folder icon
    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    icon.textContent = '📁';

    // Folder name
    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = folder.name;

    // Count badge
    const count = document.createElement('span');
    count.className = 'folder-count';
    const itemCount = folder.children ? folder.children.length : 0;
    count.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;

    header.appendChild(toggleIcon);
    header.appendChild(icon);
    header.appendChild(name);
    header.appendChild(count);

    div.appendChild(header);

    // Children container
    if (folder.children && folder.children.length > 0) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'folder-children';
        
        // Collapse deep levels by default (level > 1)
        if (level > 1) {
            childrenDiv.classList.add('collapsed');
            toggleIcon.classList.add('collapsed');
        }

        renderTree(folder.children, childrenDiv, level + 1);
        div.appendChild(childrenDiv);

        // Toggle functionality
        header.addEventListener('click', () => {
            childrenDiv.classList.toggle('collapsed');
            toggleIcon.classList.toggle('collapsed');
        });
    } else {
        // No children, remove toggle icon
        toggleIcon.style.visibility = 'hidden';
    }

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

    // File icon based on extension
    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = getFileIcon(file.name);

    // File name
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;

    link.appendChild(icon);
    link.appendChild(name);
    div.appendChild(link);

    return div;
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': '📄',
        'doc': '📝',
        'docx': '📝',
        'txt': '📝',
        'md': '📝',
        'png': '🖼️',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'gif': '🖼️',
        'zip': '📦',
        'rar': '📦',
        '7z': '📦',
        'ppt': '📊',
        'pptx': '📊',
        'xls': '📊',
        'xlsx': '📊',
    };
    return iconMap[ext] || '📄';
}

// Add search functionality (optional enhancement)
function addSearchFunctionality() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search folders and files...';
    searchInput.style.cssText = `
        width: 100%;
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        font-size: 1rem;
        font-family: inherit;
    `;

    const treeEl = document.getElementById('folder-tree');
    treeEl.parentElement.insertBefore(searchInput, treeEl);

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const allItems = treeEl.querySelectorAll('.folder-item, .file-item');

        allItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                item.style.display = '';
                // Expand parent folders
                let parent = item.closest('.folder-children');
                while (parent) {
                    parent.classList.remove('collapsed');
                    const toggle = parent.previousElementSibling?.querySelector('.toggle-icon');
                    if (toggle) toggle.classList.remove('collapsed');
                    parent = parent.parentElement.closest('.folder-children');
                }
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// Uncomment to enable search
// setTimeout(addSearchFunctionality, 100);
