/**
 * FileVault - 文件存储抽象层
 * 支持OPFS、localStorage存储和下载备份
 */
const FileVault = (() => {
    let isInitialized = false;
    let storageType = 'unknown'; // 'opfs', 'localStorage', 'download'
    let opfsDirectory = null;
    const FOLDER_NAME = 'BloomData';
    const STORAGE_PREFIX = 'bloom_vault_';
    
    const isSecure = () => {
        return (window.isSecureContext === true) ||
               location.protocol === 'https:' ||
               location.hostname === 'localhost' ||
               location.hostname === '127.0.0.1' ||
               location.hostname === '0.0.0.0';
    };

    // 初始化文件系统
    const initialize = async () => {
        if (isInitialized) return storageType !== 'unknown';
        try {
            if (!isSecure()) {
                // 不安全上下文下禁用 OPFS，直接降级
                console.info('非安全上下文，禁用 OPFS，使用 localStorage');
                storageType = 'localStorage';
            } else if ('storage' in navigator && 'getDirectory' in navigator.storage) {
                console.log('尝试初始化OPFS...');
                const opfsRoot = await navigator.storage.getDirectory();
                opfsDirectory = await opfsRoot.getDirectoryHandle(FOLDER_NAME, { create: true });
                storageType = 'opfs';
                console.log('OPFS初始化成功');
            } else {
                console.info('OPFS API 不可用，使用 localStorage');
                storageType = 'localStorage';
            }
        } catch (error) {
            console.info('OPFS初始化失败，降级到 localStorage:', error?.message || error);
            storageType = 'localStorage';
        }
        isInitialized = true;
        return storageType !== 'unknown';
    };
    
    // 保存JSON数据
    const saveJSON = async (fileName, data) => {
        await initialize();
        const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        try {
            if (storageType === 'opfs' && opfsDirectory) {
                const fileHandle = await opfsDirectory.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                console.log(`文件已保存到OPFS: ${fileName}`);
                return { ok: true, storage: 'opfs' };
            } else if (storageType === 'localStorage') {
                const storageKey = STORAGE_PREFIX + fileName;
                const fileData = {
                    content: jsonString,
                    lastModified: Date.now(),
                    size: new Blob([jsonString]).size,
                    mimeType: 'application/json'
                };
                localStorage.setItem(storageKey, JSON.stringify(fileData));
                console.log(`文件已保存到localStorage: ${fileName}`);
                return { ok: true, storage: 'localStorage' };
            } else {
                downloadFallback(jsonString, fileName, 'application/json');
                return { ok: false, storage: 'download' };
            }
        } catch (error) {
            console.error('保存文件失败，降级下载:', error);
            downloadFallback(jsonString, fileName, 'application/json');
            return { ok: false, storage: 'download' };
        }
    };
    
    // 保存文本数据
    const saveText = async (fileName, text, mimeType = 'text/plain') => {
        await initialize();
        const textString = String(text);
        try {
            if (storageType === 'opfs' && opfsDirectory) {
                const fileHandle = await opfsDirectory.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(textString);
                await writable.close();
                console.log(`文本文件已保存到OPFS: ${fileName}`);
                return { ok: true, storage: 'opfs' };
            } else if (storageType === 'localStorage') {
                const storageKey = STORAGE_PREFIX + fileName;
                const fileData = {
                    content: textString,
                    lastModified: Date.now(),
                    size: new Blob([textString]).size,
                    mimeType
                };
                localStorage.setItem(storageKey, JSON.stringify(fileData));
                console.log(`文本文件已保存到localStorage: ${fileName}`);
                return { ok: true, storage: 'localStorage' };
            } else {
                downloadFallback(textString, fileName, mimeType);
                return { ok: false, storage: 'download' };
            }
        } catch (error) {
            console.error('保存文本文件失败，降级下载:', error);
            downloadFallback(textString, fileName, mimeType);
            return { ok: false, storage: 'download' };
        }
    };

    // 从存储中取出 Blob（用于再次分享）
    const getBlob = async (fileName) => {
        await initialize();
        try {
            if (storageType === 'opfs' && opfsDirectory) {
                const fileHandle = await opfsDirectory.getFileHandle(fileName);
                const file = await fileHandle.getFile();
                return file; // File 也是 Blob
            } else if (storageType === 'localStorage') {
                const storageKey = STORAGE_PREFIX + fileName;
                const fileData = JSON.parse(localStorage.getItem(storageKey));
                if (!fileData) return null;
                const type = fileData.mimeType || guessMime(fileName);
                return new Blob([fileData.content], { type });
            }
        } catch (e) {
            console.warn('获取Blob失败:', e);
        }
        return null;
    };

    const guessMime = (name) => {
        if (name.endsWith('.csv')) return 'text/csv';
        if (name.endsWith('.json')) return 'application/json';
        return 'text/plain';
    };
    
    // 列表/读/删/重命名保持不变
    const listFiles = async () => {
        await initialize();
        try {
            if (storageType === 'opfs' && opfsDirectory) {
                const files = [];
                for await (const [name, handle] of opfsDirectory.entries()) {
                    if (handle.kind === 'file') {
                        const file = await handle.getFile();
                        files.push({ name, size: file.size, lastModified: file.lastModified });
                    }
                }
                return files.sort((a, b) => b.lastModified - a.lastModified);
            } else if (storageType === 'localStorage') {
                const files = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(STORAGE_PREFIX)) {
                        const fileName = key.substring(STORAGE_PREFIX.length);
                        try {
                            const fileData = JSON.parse(localStorage.getItem(key));
                            files.push({
                                name: fileName,
                                size: fileData.size || 0,
                                lastModified: fileData.lastModified || 0
                            });
                        } catch (error) {
                            console.warn(`解析文件数据失败: ${fileName}`, error);
                        }
                    }
                }
                return files.sort((a, b) => b.lastModified - a.lastModified);
            }
        } catch (error) {
            console.error('列出文件失败:', error);
        }
        return [];
    };
    
    const readFile = async (fileName) => {
        await initialize();
        try {
            if (storageType === 'opfs' && opfsDirectory) {
                const fileHandle = await opfsDirectory.getFileHandle(fileName);
                const file = await fileHandle.getFile();
                return await file.text();
            } else if (storageType === 'localStorage') {
                const storageKey = STORAGE_PREFIX + fileName;
                const fileData = JSON.parse(localStorage.getItem(storageKey));
                return fileData ? fileData.content : null;
            }
        } catch (error) {
            console.error('读取文件失败:', error);
        }
        return null;
    };
    
    const deleteFile = async (fileName) => {
        await initialize();
        try {
            if (storageType === 'opfs' && opfsDirectory) {
                await opfsDirectory.removeEntry(fileName);
                return true;
            } else if (storageType === 'localStorage') {
                const storageKey = STORAGE_PREFIX + fileName;
                localStorage.removeItem(storageKey);
                return true;
            }
        } catch (error) {
            console.error('删除文件失败:', error);
        }
        return false;
    };
    
    const renameFile = async (oldName, newName) => {
        await initialize();
        try {
            const content = await readFile(oldName);
            if (!content) throw new Error('无法读取源文件');
            const saved = await saveJSON(newName, content);
            if (!saved.ok) throw new Error('保存新文件失败');
            await deleteFile(oldName);
            return true;
        } catch (error) {
            console.error('重命名文件失败:', error);
            return false;
        }
    };
    
    const isAvailable = () => storageType === 'opfs' || storageType === 'localStorage';
    const getFolderName = () => FOLDER_NAME;

    const downloadFallback = (data, fileName, mimeType = 'application/json') => {
        try {
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            console.log(`文件已下载: ${fileName}`);
        } catch (error) {
            console.error('下载失败:', error);
            throw error;
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };
    
    return {
        initialize,
        saveJSON,
        saveText,
        getBlob,     // 新增
        listFiles,
        readFile,
        deleteFile,
        renameFile,
        isAvailable,
        getFolderName,
        formatFileSize,
        formatDate
    };
})();