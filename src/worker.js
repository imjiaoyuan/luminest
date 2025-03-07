export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // 处理 favicon.ico 请求
        if (path === '/favicon.ico') {
            const favicon = await env.MY_BUCKET.get('favicon.ico');
            if (favicon) {
                const response = new Response(favicon.body, {
                    headers: {
                        'Content-Type': 'image/x-icon',
                        'Cache-Control': 'public, max-age=31536000'
                    }
                });
                // 添加 CORS 头
                response.headers.set('Access-Control-Allow-Origin', '*');
                return response;
            }
            // 如果没有找到图标，返回404
            return new Response('Not Found', { status: 404 });
        }

        // 处理静态文件路由
        if (path === '/' || path === '/index.html') {
            return new Response(INDEX_HTML, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        if (path === '/admin') {
            return new Response(ADMIN_HTML, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        if (path === '/static/style.css') {
            return new Response(STYLE_CSS, {
                headers: { 'Content-Type': 'text/css' }
            });
        }
        if (path === '/static/script.js') {
            return new Response(SCRIPT_JS, {
                headers: { 'Content-Type': 'application/javascript' }
            });
        }

        // API 路由
        if (path === '/api/upload' && request.method === 'POST') {
            return handleUpload(request, env);
        }
        if (path === '/api/images' && request.method === 'GET') {
            return handleListImages(request, env);
        }
        if (path.startsWith('/api/delete/') && request.method === 'DELETE') {
            const filename = path.split('/').pop();
            return handleDeleteImage(filename, env);
        }
        if (path.startsWith('/api/move/') && request.method === 'POST') {
            const filename = path.split('/').pop();
            return handleMoveImage(filename, request, env);
        }
        if (path.startsWith('/api/rename/') && request.method === 'POST') {
            const filename = path.split('/').pop();
            return handleRenameImage(filename, request, env);
        }

        return new Response('Not Found', { status: 404 });
    }
};

// 静态文件内容
const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>R2 图床 - 简单高效的图片托管服务</title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <div class="container">
        <header class="main-header">
            <div class="header-content">
                <h1>R2 图床</h1>
                <p class="subtitle">简单高效的图片托管服务</p>
            </div>
            <nav class="header-nav">
                <a href="/admin" class="btn primary">图片管理</a>
            </nav>
        </header>
        
        <div class="card upload-section">
            <div class="card-header">
                <div class="section-title">
                    <h2>上传图片</h2>
                    <p class="section-desc">支持拖拽或点击上传，图片将自动保存到选定文件夹</p>
                </div>
                <div class="folder-select-group">
                    <select id="folderSelect">
                        <option value="">选择存储位置...</option>
                    </select>
                    <button id="newFolderBtn" class="btn">新建文件夹</button>
                </div>
            </div>
            
            <div class="upload-options">
                <label>
                    <input type="checkbox" id="useTimestamp" checked>
                    使用时间戳重命名
                </label>
            </div>
            
            <div class="upload-area" id="dropZone">
                <input type="file" id="fileInput" accept="image/*" multiple hidden>
                <div class="upload-hint">
                    <svg class="upload-icon" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    <p>点击或拖拽图片到此处上传</p>
                    <p class="sub-hint">支持 JPG、PNG、GIF 等常见图片格式</p>
                </div>
            </div>
        </div>

        <div class="card recent-uploads">
            <div class="card-header">
                <div class="section-title">
                    <h2>最近上传</h2>
                    <p class="section-desc">展示最近上传的 5 张图片</p>
                </div>
            </div>
            <div class="recent-grid" id="imageList">
                <!-- 最新5张图片将在这里显示 -->
            </div>
        </div>
    </div>
    <script src="/static/script.js"></script>
</body>
</html>`;

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图片管理 - R2 图床</title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <div class="container">
        <div class="card header-card">
            <header class="main-header">
                <div class="header-content">
                    <h1>图片管理</h1>
                    <p class="subtitle">管理您上传的所有图片</p>
                </div>
                <div class="header-actions">
                    <div class="action-group">
                        <button id="selectAllBtn" class="btn">全选</button>
                        <button id="uploadBtn" class="btn primary">上传图片</button>
                    </div>
                    <div class="action-group">
                        <select id="moveToFolder" class="folder-select">
                            <option value="">移动到...</option>
                        </select>
                        <button id="moveBtn" class="btn" disabled>移动</button>
                        <button id="deleteBtn" class="btn danger">删除</button>
                    </div>
                    <a href="/" class="btn">返回首页</a>
                    <input type="file" id="fileInput" multiple hidden>
                </div>
            </header>
        </div>

        <div class="card">
            <div class="image-grid" id="imageGrid">
                <!-- 图片列表将通过 JavaScript 动态加载 -->
            </div>
        </div>
    </div>
    <script src="/static/script.js"></script>
</body>
</html>`;

const STYLE_CSS = `
:root {
    --primary-color: #4a90e2;
    --primary-dark: #357abd;
    --danger-color: #e74c3c;
    --danger-dark: #c0392b;
    --gray-color: #95a5a6;
    --gray-dark: #7f8c8d;
    --text-color: #2c3e50;
    --text-light: #7f8c8d;
    --border-color: #e1e1e1;
    --background-color: #f5f7fa;
    --success-color: #2ecc71;
    --card-shadow: 0 2px 4px rgba(0,0,0,0.1);
    --transition-speed: 0.2s;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
}

.main-header {
    margin-bottom: 40px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: var(--card-shadow);
}

.header-content {
    flex: 1;
}

h1 {
    font-size: 32px;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 8px;
}

.subtitle {
    color: var(--text-light);
    font-size: 16px;
}

.section-title h2 {
    font-size: 20px;
    font-weight: 500;
    margin-bottom: 4px;
}

.section-desc {
    color: var(--text-light);
    font-size: 14px;
}

.card {
    background: white;
    border-radius: 8px;
    border: none;
    margin-bottom: 12px;
    box-shadow: var(--card-shadow);
    transition: box-shadow var(--transition-speed);
    overflow: visible;
}

.card.header-card {
    position: sticky;
    top: 0;
    z-index: 100;
    margin-bottom: 12px;
    backdrop-filter: blur(8px);
    background: rgba(255, 255, 255, 0.95);
}

.card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.card-header {
    padding: 24px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all var(--transition-speed);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--gray-color);
    color: white;
    min-width: 100px;
    gap: 8px;
}

.btn:hover {
    background: var(--gray-dark);
    transform: translateY(-1px);
}

.btn.primary {
    background: var(--primary-color);
}

.btn.primary:hover {
    background: var(--primary-dark);
}

.btn.danger {
    background: var(--danger-color);
}

.btn.danger:hover {
    background: var(--danger-dark);
}

.btn:disabled {
    background: var(--gray-color);
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.header-actions {
    display: flex;
    gap: 16px;
    align-items: center;
}

.action-group {
    display: flex;
    gap: 12px;
    align-items: center;
    padding-right: 16px;
    border-right: 1px solid var(--border-color);
}

.action-group:last-child {
    border-right: none;
    padding-right: 0;
}

.folder-select {
    padding: 10px 16px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
    background: white;
    color: var(--text-color);
    min-width: 180px;
    transition: all var(--transition-speed);
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 16px;
    padding-right: 32px;
}

.folder-select:hover, .folder-select:focus {
    border-color: var(--primary-color);
    outline: none;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}

.image-item {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    border: 1px solid var(--border-color);
    transition: all var(--transition-speed);
    box-shadow: var(--card-shadow);
}

.image-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.image-preview {
    width: 100%;
    height: 200px;
    object-fit: cover;
    transition: transform var(--transition-speed);
}

.image-item:hover .image-preview {
    transform: scale(1.05);
}

.image-info {
    padding: 16px;
    background: rgba(255, 255, 255, 0.95);
}

.image-name {
    font-size: 14px;
    margin-bottom: 4px;
    color: var(--text-color);
    word-break: break-all;
    font-weight: 500;
}

.image-url {
    font-size: 12px;
    color: var(--text-light);
    word-break: break-all;
}

.image-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity var(--transition-speed);
}

.image-item:hover .image-actions {
    opacity: 1;
}

.action-btn {
    padding: 6px 12px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all var(--transition-speed);
    backdrop-filter: blur(4px);
}

.action-btn:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
}

.image-checkbox-wrapper {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 1;
    opacity: 0;
    transition: opacity var(--transition-speed);
}

.image-item:hover .image-checkbox-wrapper {
    opacity: 1;
}

.image-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    border-radius: 4px;
    border: 2px solid var(--primary-color);
    appearance: none;
    position: relative;
    transition: all var(--transition-speed);
    background: transparent;
}

.image-checkbox:checked {
    background: var(--primary-color);
}

.image-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 2px;
    width: 4px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    z-index: 1000;
    animation: fadeInOut 3s ease-in-out forwards;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
}

.notification.success {
    background: var(--success-color);
}

.notification.error {
    background: var(--danger-color);
}

.loading {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(74, 144, 226, 0.1);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    100% { transform: rotate(360deg); }
}

@keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(20px); }
    10% { opacity: 1; transform: translateY(0); }
    90% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
}

.upload-section {
    position: relative;
    padding-bottom: 24px;
}

.upload-options {
    padding: 0 36px;
    margin: 24px 0;
    position: relative;
    z-index: 1;
}

.upload-area {
    border: 2px dashed var(--primary-color);
    border-radius: 8px;
    margin: 0 36px 36px;
    padding: 64px 48px;
    text-align: center;
    background: white;
    transition: all var(--transition-speed);
    cursor: pointer;
    position: relative;
}

.upload-area:hover {
    background: var(--background-color);
    border-color: var(--primary-dark);
    transform: translateY(-1px);
}

.upload-hint {
    color: var(--text-light);
    margin-bottom: 16px;
}

.upload-icon {
    width: 64px;
    height: 64px;
    margin-bottom: 24px;
    fill: var(--primary-color);
    transition: transform var(--transition-speed);
}

.upload-area:hover .upload-icon {
    transform: translateY(-4px);
}

.sub-hint {
    font-size: 14px;
    margin-top: 12px;
    color: var(--text-light);
}

.folder-select-group {
    display: flex;
    gap: 12px;
    align-items: center;
}

.recent-grid {
    display: flex;
    gap: 20px;
    padding: 24px;
    overflow-x: auto;
}

.image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 24px;
    padding: 24px;
}

.image-item {
    position: relative;
    border-radius: 4px;
    overflow: hidden;
    background: white;
    border: 1px solid var(--border-color);
    transition: background 0.2s;
    flex: 0 0 calc(20% - 16px);
    min-width: 200px;
}

.image-item:hover {
    background: var(--background-color);
}

.image-preview {
    width: 100%;
    height: 150px;
    object-fit: cover;
}

.image-info {
    padding: 16px;
}

.image-name {
    font-size: 14px;
    margin-bottom: 4px;
    color: var(--text-color);
    word-break: break-all;
}

.image-url {
    font-size: 12px;
    color: var(--text-light);
    word-break: break-all;
}

.copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 6px 12px;
    background: rgba(52, 152, 219, 0.9);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s;
}

.image-item:hover .copy-btn {
    opacity: 1;
}

.image-item .move-btn {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 6px 12px;
    background: rgba(52, 152, 219, 0.9);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s;
}

.image-item:hover .move-btn {
    opacity: 1;
}

.image-item .move-btn:hover {
    background: rgba(41, 128, 185, 0.9);
}

.btn:disabled {
    background: var(--gray-color);
    opacity: 0.6;
    cursor: not-allowed;
}

.folder-menu {
    position: absolute;
    top: 40px;
    left: 8px;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 8px 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 100;
    display: none;
}

.folder-menu.show {
    display: block;
}

.folder-menu-item {
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
}

.folder-menu-item:hover {
    background: var(--background-color);
}

.folder-menu-divider {
    height: 1px;
    background: var(--border-color);
    margin: 4px 0;
}

.copy-success {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: rgba(46, 204, 113, 0.9);
    color: white;
    border-radius: 4px;
    font-size: 14px;
    animation: fadeInOut 2s ease-in-out forwards;
}

@keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(20px); }
    20% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
}

@media (max-width: 768px) {
    .header-actions {
        flex-direction: column;
        gap: 12px;
    }
    
    .action-group {
        border-right: none;
        padding-right: 0;
        width: 100%;
    }
    
    .folder-select {
        width: 100%;
    }

    .image-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        padding: 16px;
    }

    .card {
        margin-bottom: 10px;
    }

    .upload-area {
        margin: 0 20px 24px;
        padding: 48px 24px;
    }
    
    .upload-options {
        padding: 0 20px;
        margin: 20px 0;
    }

    .card.header-card {
        margin: 0 -20px 12px;
        padding: 0 20px;
        border-radius: 0;
    }

    .upload-icon {
        width: 48px;
        height: 48px;
        margin-bottom: 20px;
    }
}
`;

// 修改 SCRIPT_JS 中的相关逻辑
const SCRIPT_JS = `
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        class BaseHandler {
            showLoading() {
                const loading = document.createElement('div');
                loading.className = 'loading';
                loading.innerHTML = '<div class="loading-spinner"></div>';
                document.body.appendChild(loading);
                return loading;
            }

            hideLoading(loading) {
                loading && loading.remove();
            }

            showMessage(message, type = 'success') {
                const notification = document.createElement('div');
                notification.className = \`notification \${type}\`;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }

            async copyToClipboard(text, type) {
                try {
                    await navigator.clipboard.writeText(text);
                    this.showMessage(type === 'md' ? 'Markdown链接已复制' : '图片链接已复制', 'success');
                } catch (err) {
                    console.error('Failed to copy:', err);
                    this.showMessage('复制失败', 'error');
                }
            }
        }

        class ImageUploader extends BaseHandler {
            constructor() {
                super();
                this.dropZone = document.getElementById('dropZone');
                this.fileInput = document.getElementById('fileInput');
                this.imageList = document.getElementById('imageList');
                this.folderSelect = document.getElementById('folderSelect');
                this.newFolderBtn = document.getElementById('newFolderBtn');
                
                this.initEventListeners();
                this.loadImages();
                this.loadFolders();
            }

            async loadFolders() {
                try {
                    const response = await fetch('/api/images', {
                        cache: 'no-store'
                    });
                    const images = await response.json();
                    
                    // 只获取文件夹，不包含文件
                    const folders = new Set(['blog']);  // 添加默认的 blog 文件夹
                    images.forEach(image => {
                        const parts = image.name.split('/');
                        if (parts.length > 1) {
                            folders.add(parts[0]);
                        }
                    });
                    
                    this.folderSelect.innerHTML = '<option value="">选择存储位置...</option>';
                    
                    // 确保 blog 文件夹在最前面
                    const sortedFolders = Array.from(folders).sort();
                    sortedFolders.forEach(folder => {
                        const option = document.createElement('option');
                        option.value = folder;
                        option.textContent = folder;
                        if (folder === 'blog') {
                            option.selected = true;  // 默认选中 blog 文件夹
                        }
                        this.folderSelect.appendChild(option);
                    });

                    // 添加新建文件夹选项
                    const newFolderOption = document.createElement('option');
                    newFolderOption.value = "new";
                    newFolderOption.textContent = "新建文件夹...";
                    this.folderSelect.appendChild(newFolderOption);
                } catch (error) {
                    console.error('Failed to load folders:', error);
                    this.showMessage('加载文件夹失败', 'error');
                }
            }

            initEventListeners() {
                // 点击上传区域触发文件选择
                this.dropZone.addEventListener('click', () => {
                    this.fileInput.click();
                });

                // 监听文件选择
                this.fileInput.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        this.handleFiles(e.target.files);
                    }
                });

                // 拖拽相关事件
                this.dropZone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    this.dropZone.classList.add('dragover');
                });

                this.dropZone.addEventListener('dragleave', () => {
                    this.dropZone.classList.remove('dragover');
                });

                this.dropZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    this.dropZone.classList.remove('dragover');
                    if (e.dataTransfer.files.length > 0) {
                        this.handleFiles(e.dataTransfer.files);
                    }
                });

                // 修改文件夹选择的事件监听
                this.folderSelect.onchange = (e) => {
                    if (e.target.value === 'new') {
                        const folderName = prompt('请输入新文件夹名称：')?.trim();
                        if (folderName) {
                            if (!/^[a-zA-Z0-9_\-]+$/.test(folderName)) {
                                this.showMessage('文件夹名称只能包含字母、数字、下划线和横线', 'error');
                                this.folderSelect.value = '';
                                return;
                            }
                            const option = document.createElement('option');
                            option.value = folderName;
                            option.textContent = folderName;
                            this.folderSelect.insertBefore(option, this.folderSelect.lastChild);
                            this.folderSelect.value = folderName;
                        } else {
                            this.folderSelect.value = '';
                        }
                    }
                };

                this.newFolderBtn.onclick = () => {
                    const folderName = prompt('请输入新文件夹名称：')?.trim();
                    if (folderName) {
                        if (!/^[a-zA-Z0-9_\-]+$/.test(folderName)) {
                            this.showMessage('文件夹名称只能包含字母、数字、下划线和横线', 'error');
                            return;
                        }
                        const option = document.createElement('option');
                        option.value = folderName;
                        option.textContent = folderName;
                        this.folderSelect.insertBefore(option, this.folderSelect.lastChild);
                        this.folderSelect.value = folderName;
                    }
                };
            }

            async loadImages() {
                const loading = this.showLoading();
                try {
                    const response = await fetch('/api/images');
                    if (!response.ok) throw new Error('Failed to load images');
                    
                    const images = await response.json();
                    
                    // 按上传时间从新到旧排序
                    images.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
                    
                    this.imageList.innerHTML = '';
                    // 只显示前5张图片
                    images.slice(0, 5).forEach(image => {
                        this.addImageToList(image, false);
                    });
                } catch (error) {
                    console.error('Failed to load images:', error);
                } finally {
                    this.hideLoading(loading);
                }
            }

            async handleFiles(files) {
                if (files.length === 0) return;
                
                const loading = this.showLoading();
                const useTimestamp = document.getElementById('useTimestamp').checked;
                const folder = this.folderSelect.value;
                
                if (folder === 'new') {
                    this.showMessage('请先选择或创建文件夹', 'error');
                    this.hideLoading(loading);
                    return;
                }
                
                let successCount = 0;
                let errorCount = 0;

                for (const file of files) {
                    if (!file.type.startsWith('image/')) {
                        errorCount++;
                        continue;
                    }
                    
                    try {
                        const formData = new FormData();
                        let filename;
                        
                        if (useTimestamp) {
                            const now = new Date();
                            const timestamp = now.getFullYear().toString() +
                                (now.getMonth() + 1).toString().padStart(2, '0') +
                                now.getDate().toString().padStart(2, '0') +
                                now.getHours().toString().padStart(2, '0') +
                                now.getMinutes().toString().padStart(2, '0') +
                                now.getSeconds().toString().padStart(2, '0');
                            const ext = file.name.split('.').pop().toLowerCase();
                            filename = folder ? \`\${folder}/\${timestamp}.\${ext}\` : \`\${timestamp}.\${ext}\`;
                        } else {
                            filename = folder ? \`\${folder}/\${file.name}\` : file.name;
                        }
                        
                        formData.append('file', file);
                        formData.append('filename', filename);
                        
                        const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (response.ok) {
                            const image = await response.json();
                            this.addImageToList(image, true);
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    } catch (error) {
                        console.error('Upload failed:', error);
                        errorCount++;
                    }
                }
                
                this.hideLoading(loading);
                this.fileInput.value = '';
                
                if (successCount > 0) {
                    this.showMessage(\`成功上传 \${successCount} 个文件\${errorCount > 0 ? \`，\${errorCount} 个失败\` : ''}\`);
                } else if (errorCount > 0) {
                    this.showMessage(\`上传失败：\${errorCount} 个文件上传失败\`, 'error');
                }
            }

            addImageToList(image, isNewUpload = true) {
                const item = document.createElement('div');
                item.className = 'image-item';
                item.dataset.filename = image.name;
                
                const mdLink = \`![image](\${image.url})\`;
                
                item.innerHTML = \`
                    <img src="\${image.url}" alt="\${image.name}" class="image-preview">
                    <div class="image-info">
                        <div class="image-name">\${image.name}</div>
                        <div class="image-url">\${image.url}</div>
                    </div>
                    <div class="image-actions">
                        <button class="action-btn copy-url" data-url="\${image.url}">复制链接</button>
                        <button class="action-btn copy-md" data-md="\${mdLink}">复制MD</button>
                    </div>
                \`;

                // 添加复制按钮的事件监听
                const copyUrlBtn = item.querySelector('.copy-url');
                const copyMdBtn = item.querySelector('.copy-md');
                
                copyUrlBtn.addEventListener('click', () => this.copyToClipboard(image.url, 'url'));
                copyMdBtn.addEventListener('click', () => this.copyToClipboard(mdLink, 'md'));
                
                if (this.imageList.firstChild) {
                    this.imageList.insertBefore(item, this.imageList.firstChild);
                } else {
                    this.imageList.appendChild(item);
                }
                
                while (this.imageList.children.length > 5) {
                    this.imageList.lastChild.remove();
                }

                // 只在新上传时自动复制链接
                if (isNewUpload) {
                    this.copyToClipboard(mdLink, 'md');
                }
            }
        }

        class ImageManager extends BaseHandler {
            constructor() {
                super();
                this.imageGrid = document.getElementById('imageGrid');
                this.selectAllBtn = document.getElementById('selectAllBtn');
                this.deleteBtn = document.getElementById('deleteBtn');
                this.moveToFolder = document.getElementById('moveToFolder');
                this.moveBtn = document.getElementById('moveBtn');
                this.selectedImages = new Set();
                
                this.initEventListeners();
                this.loadImages();
                this.loadFolders();
                
                // 添加懒加载相关属性
                this.observer = null;
                this.initLazyLoading();
            }

            initEventListeners() {
                this.selectAllBtn.onclick = () => this.toggleSelectAll();
                this.deleteBtn.onclick = () => this.deleteSelected();
                this.moveBtn.onclick = () => this.moveSelected();
                
                this.moveToFolder.onchange = (e) => {
                    if (e.target.value === 'new') {
                        const folderName = prompt('请输入新文件夹名称：');
                        if (folderName) {
                            const option = document.createElement('option');
                            option.value = folderName;
                            option.textContent = folderName;
                            this.moveToFolder.insertBefore(option, this.moveToFolder.lastChild);
                            this.moveToFolder.value = folderName;
                        } else {
                            this.moveToFolder.value = '';
                        }
                    }
                    this.updateButtonStates();
                };
            }

            async loadImages() {
                const loading = this.showLoading();
                try {
                    const response = await fetch('/api/images', {
                        cache: 'no-store'  // 禁用缓存
                    });
                    if (!response.ok) throw new Error('Failed to load images');
                    
                    const images = await response.json();
                    
                    // 按上传时间从新到旧排序
                    images.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

                    this.imageGrid.innerHTML = '';  // 清空现有图片
                    images.forEach(image => {
                        const item = this.renderImage(image);
                        this.imageGrid.appendChild(item);
                    });
                } catch (error) {
                    console.error('Failed to load images:', error);
                } finally {
                    this.hideLoading(loading);
                }
            }

            async loadFolders() {
                try {
                    const response = await fetch('/api/images', {
                        cache: 'no-store'
                    });
                    const images = await response.json();
                    
                    // 只获取文件夹，不包含文件
                    const folders = new Set();
                    images.forEach(image => {
                        const parts = image.name.split('/');
                        if (parts.length > 1) {
                            folders.add(parts[0]);
                        }
                    });
                    
                    this.moveToFolder.innerHTML = '<option value="">选择目标文件夹...</option>';
                    Array.from(folders).sort().forEach(folder => {
                        const option = document.createElement('option');
                        option.value = folder;
                        option.textContent = folder;
                        this.moveToFolder.appendChild(option);
                    });

                    const newFolderOption = document.createElement('option');
                    newFolderOption.value = "new";
                    newFolderOption.textContent = "新建文件夹...";
                    this.moveToFolder.appendChild(newFolderOption);
                } catch (error) {
                    console.error('Failed to load folders:', error);
                    this.showMessage('加载文件夹失败', 'error');
                }
            }

            initLazyLoading() {
                // 创建 Intersection Observer
                this.observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src) {
                                img.src = img.dataset.src;
                                img.removeAttribute('data-src');
                                this.observer.unobserve(img);
                            }
                        }
                    });
                }, {
                    root: null,
                    rootMargin: '50px',
                    threshold: 0.1
                });
            }

            renderImage(image) {
                const item = document.createElement('div');
                item.className = 'image-item';
                item.dataset.filename = image.name;
                
                const mdLink = \`![image](\${image.url})\`;
                
                item.innerHTML = \`
                    <div class="image-checkbox-wrapper">
                        <input type="checkbox" class="image-checkbox" \${this.selectedImages.has(image.name) ? 'checked' : ''}>
                    </div>
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" 
                         data-src="\${image.url}" 
                         alt="\${image.name}" 
                         class="image-preview">
                    <div class="image-info">
                        <div class="image-name">\${image.name}</div>
                        <div class="image-url">\${image.url}</div>
                    </div>
                    <div class="image-actions">
                        <button class="action-btn" onclick="window.imageManager.copyToClipboard('\${image.url}', 'url')">复制链接</button>
                        <button class="action-btn" onclick="window.imageManager.copyToClipboard('\${mdLink}', 'md')">复制MD</button>
                    </div>
                \`;

                // 添加复选框事件监听
                const checkbox = item.querySelector('.image-checkbox');
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        this.selectedImages.add(image.name);
                    } else {
                        this.selectedImages.delete(image.name);
                    }
                    this.updateButtonStates();
                });

                // 为图片添加懒加载观察
                const img = item.querySelector('.image-preview');
                if (img) {
                    this.observer.observe(img);
                }

                return item;
            }

            updateButtonStates() {
                const hasSelection = this.selectedImages.size > 0;
                this.deleteBtn.disabled = !hasSelection;
                this.moveBtn.disabled = !hasSelection || !this.moveToFolder.value;
            }

            toggleSelectAll() {
                const checkboxes = this.imageGrid.querySelectorAll('.image-checkbox');
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                
                checkboxes.forEach(checkbox => {
                    checkbox.checked = !allChecked;
                    const filename = checkbox.closest('.image-item').dataset.filename;
                    if (!allChecked) {
                        this.selectedImages.add(filename);
                    } else {
                        this.selectedImages.delete(filename);
                    }
                });
                
                this.updateButtonStates();
            }

            async deleteSelected() {
                if (this.selectedImages.size === 0) {
                    this.showMessage('请先选择要删除的图片', 'error');
                    return;
                }

                if (!confirm(\`确定要删除选中的 \${this.selectedImages.size} 个文件吗？\`)) return;

                const loading = this.showLoading();
                let successCount = 0;
                let errorCount = 0;

                try {
                    const promises = Array.from(this.selectedImages).map(async filename => {
                        try {
                            // 对文件名进行 URL 编码，但保留斜杠
                            const encodedFilename = filename.split('/')
                                .map(part => encodeURIComponent(part))
                                .join('/');

                            const response = await fetch(\`/api/delete/\${encodedFilename}\`, {
                                method: 'DELETE',
                                cache: 'no-store'
                            });

                            if (response.ok) {
                                successCount++;
                            } else {
                                errorCount++;
                                console.error(\`Failed to delete \${filename}: \${response.status}\`);
                            }
                        } catch (error) {
                            errorCount++;
                            console.error(\`Failed to delete \${filename}:\`, error);
                        }
                    });

                    await Promise.all(promises);
                    
                    if (successCount > 0) {
                        this.selectedImages.clear();
                        this.updateButtonStates();
                        await this.loadImages();
                        this.showMessage(\`成功删除 \${successCount} 个文件\${errorCount > 0 ? \`，\${errorCount} 个失败\` : ''}\`);
                    } else {
                        this.showMessage('删除失败', 'error');
                    }
                } catch (error) {
                    console.error('Failed to delete images:', error);
                    this.showMessage('删除失败', 'error');
                } finally {
                    this.hideLoading(loading);
                }
            }

            async moveSelected() {
                if (this.selectedImages.size === 0) {
                    this.showMessage('请先选择要移动的图片', 'error');
                    return;
                }

                const folder = this.moveToFolder.value;
                if (!folder) {
                    this.showMessage('请选择目标文件夹', 'error');
                    return;
                }

                if (folder === 'new') {
                    this.showMessage('请先创建新文件夹', 'error');
                    return;
                }

                if (!confirm(\`确定要将选中的 \${this.selectedImages.size} 个文件移动到 "\${folder}" 文件夹吗？\`)) return;

                const loading = this.showLoading();
                let successCount = 0;
                let errorCount = 0;

                try {
                    const promises = Array.from(this.selectedImages).map(async filename => {
                        try {
                            const response = await fetch(\`/api/move/\${filename}\`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ folder }),
                                cache: 'no-store'
                            });

                            if (response.ok) {
                                successCount++;
                            } else {
                                errorCount++;
                            }
                        } catch (error) {
                            errorCount++;
                            console.error(\`Failed to move \${filename}:\`, error);
                        }
                    });

                    await Promise.all(promises);
                    
                    if (successCount > 0) {
                        this.selectedImages.clear();
                        this.updateButtonStates();
                        await this.loadImages();
                        this.showMessage(\`成功移动 \${successCount} 个文件\${errorCount > 0 ? \`，\${errorCount} 个失败\` : ''}\`);
                    } else {
                        this.showMessage('移动失败', 'error');
                    }
                } catch (error) {
                    console.error('Failed to move images:', error);
                    this.showMessage('移动失败', 'error');
                } finally {
                    this.hideLoading(loading);
                }
            }
        }

        // 根据页面路径初始化对应的类
        if (window.location.pathname === '/admin') {
            window.imageManager = new ImageManager();
        } else {
            window.imageUploader = new ImageUploader();
        }
    });
})();
`;

// API 处理函数
async function handleUpload(request, env) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const filename = formData.get('filename');
        
        if (!file) {
            return new Response('No file uploaded', { status: 400 });
        }

        await env.MY_BUCKET.put(filename, file, {
            httpMetadata: { 
                contentType: file.type,
                cacheControl: 'public, max-age=31536000'
            }
        });

        const url = `${env.R2_DOMAIN}/${filename}`;
        return new Response(JSON.stringify({ 
            filename,
            url,
            size: file.size,
            type: file.type
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({error: err.message}), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleListImages(request, env) {
    try {
        const list = await env.MY_BUCKET.list();
        
        if (!list || !list.objects) {
            return new Response(JSON.stringify([]), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
        }

        const images = list.objects.map(obj => ({
            name: obj.key,
            url: `${env.R2_DOMAIN}/${obj.key}`,
            size: obj.size,
            uploaded: obj.uploaded.toISOString(), // 确保上传时间被正确转换
            type: obj.httpMetadata?.contentType || 'image/*'
        }));

        // 按上传时间从新到旧排序
        images.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

        return new Response(JSON.stringify(images), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            }
        });
    }
}

async function handleDeleteImage(filename, env) {
    try {
        // 对文件名进行 URL 解码
        const decodedFilename = decodeURIComponent(filename);

        // 检查文件是否存在
        const object = await env.MY_BUCKET.head(decodedFilename);
        if (!object) {
            return new Response(JSON.stringify({ error: 'File not found' }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                }
            });
        }

        // 删除文件
        await env.MY_BUCKET.delete(decodedFilename);

        // 等待一段时间确保删除完成
        await new Promise(resolve => setTimeout(resolve, 500));

        // 再次验证文件是否已被删除
        const checkObject = await env.MY_BUCKET.head(decodedFilename);
        if (checkObject) {
            throw new Error('File deletion failed');
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    } catch (err) {
        console.error('Delete error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    }
}

async function handleMoveImage(filename, request, env) {
    try {
        const { folder } = await request.json();
        if (!folder) {
            return new Response(JSON.stringify({ error: 'Folder name is required' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                }
            });
        }

        // 对文件名进行 URL 解码
        const decodedFilename = decodeURIComponent(filename);

        // 获取源文件
        const sourceObject = await env.MY_BUCKET.get(decodedFilename);
        if (!sourceObject) {
            return new Response(JSON.stringify({ error: 'Source file not found' }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                }
            });
        }

        // 构建新的文件名
        const newKey = folder + '/' + decodedFilename.split('/').pop();

        // 复制文件到新位置
        await env.MY_BUCKET.put(newKey, sourceObject.body, {
            httpMetadata: sourceObject.httpMetadata
        });

        // 删除原文件
        await env.MY_BUCKET.delete(decodedFilename);

        return new Response(JSON.stringify({ success: true }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    } catch (err) {
        console.error('Move error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    }
}

async function handleRenameImage(filename, request, env) {
    try {
        const { newName } = await request.json();
        
        await env.MY_BUCKET.copy(filename, newName);
        await env.MY_BUCKET.delete(filename);

        return new Response(JSON.stringify({success: true}), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({error: err.message}), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 