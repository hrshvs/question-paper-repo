#!/usr/bin/env node
// This script generates the folder structure data for the website
// It should be run during the GitHub Actions build process

const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = [".git", "node_modules", "docs", "cloudflare-worker"];
const ROOT_DIR = path.join(__dirname, "..");

function getDirectoryTree(dir, relativePath = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const structure = {
    name: path.basename(dir),
    path: relativePath,
    children: [],
  };

  entries.forEach((entry) => {
    if (IGNORE_DIRS.includes(entry.name)) return;

    const fullPath = path.join(dir, entry.name);
    const entryRelativePath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      const subTree = getDirectoryTree(fullPath, entryRelativePath);
      structure.children.push(subTree);
    } else {
      structure.children.push({
        name: entry.name,
        path: entryRelativePath,
        isFile: true,
      });
    }
  });

  // Sort children: directories first, then files, both alphabetically
  structure.children.sort((a, b) => {
    if (a.isFile && !b.isFile) return 1;
    if (!a.isFile && b.isFile) return -1;
    return a.name.localeCompare(b.name);
  });

  return structure;
}

// Generate the tree structure
const tree = getDirectoryTree(ROOT_DIR);

// Remove the root level, just get its children
const data = {
  generated: new Date().toISOString(),
  folders: tree.children.filter((item) => !item.isFile),
};

// Write to data.json
const outputPath = path.join(__dirname, "data.json");
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log("Tree structure generated successfully!");
console.log(`Output: ${outputPath}`);
