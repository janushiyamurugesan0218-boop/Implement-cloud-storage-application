// Initialize IndexedDB Database
let db;
const dbRequest = indexedDB.open("CloudStorageDB", 1);

dbRequest.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id", autoIncrement: true });
    }
};

dbRequest.onsuccess = (event) => {
    db = event.target.result;
    displayFiles(); // Load existing files on startup
};

dbRequest.onerror = (event) => {
    console.error("Database error:", event.target.error);
};

// DOM Elements
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const fileGrid = document.getElementById("file-grid");

// Event Listeners for File Uploads
fileInput.addEventListener("change", handleFileSelect);
dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", handleDrop);

// Handle regular file input selection
function handleFileSelect(e) {
    const files = e.target.files;
    processFiles(files);
}

// Handle Drag and Drop
function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const files = e.dataTransfer.files;
    processFiles(files);
}

// Save files into IndexedDB
function processFiles(files) {
    for (let file of files) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const fileData = {
                name: file.name,
                size: formatBytes(file.size),
                type: file.type,
                content: e.target.result // Base64 data string
            };

            const transaction = db.transaction(["files"], "readwrite");
            const store = transaction.objectStore("files");
            store.add(fileData);

            transaction.oncomplete = () => {
                displayFiles();
            };
        };
        
        reader.readAsDataURL(file); // Reads file data
    }
}

// Retrieve and Display Files from Database
function displayFiles() {
    fileGrid.innerHTML = ""; // Clear existing UI list
    
    const transaction = db.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const request = store.openCursor();

    request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            const file = cursor.value;
            const fileCard = document.createElement("div");
            fileCard.className = "file-card";
            
            // Choose file emoji icon based on type
            let icon = "📄";
            if (file.type.startsWith("image/")) icon = "🖼️";
            if (file.type.startsWith("video/")) icon = "🎥";
            if (file.type.startsWith("audio/")) icon = "🎵";
            if (file.type.includes("pdf")) icon = "📕";

            fileCard.innerHTML = `
                <div class="file-icon">${icon}</div>
                <div class="file-name" title="${file.name}">${file.name}</div>
                <div class="file-size">${file.size}</div>
                <div class="card-actions">
                    <button class="btn-action" onclick="downloadFile('${file.content}', '${file.name}')">Download</button>
                    <button class="btn-action btn-delete" onclick="deleteFile(${file.id})">Delete</button>
                </div>
            `;
            
            fileGrid.appendChild(fileCard);
            cursor.continue();
        }
    };
}

// Download File Action
function downloadFile(base64Data, filename) {
    const link = document.createElement("a");
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Delete File Action
function deleteFile(id) {
    const transaction = db.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");
    store.delete(id);

    transaction.oncomplete = () => {
        displayFiles();
    };
}

// Helper: Format file sizes cleanly
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}