class MockFileService {
  constructor() {
    this.files = new Map();
    this.directories = new Set();
  }

  async readJson(filePath) {
    if (this.files.has(filePath)) {
      return JSON.parse(this.files.get(filePath));
    }
    return null;
  }

  async writeJson(filePath, data) {
    this.files.set(filePath, JSON.stringify(data, null, 2));
  }

  async exists(filePath) {
    return this.files.has(filePath);
  }

  async delete(filePath) {
    if (this.files.has(filePath)) {
      this.files.delete(filePath);
      return true;
    }
    return false;
  }

  async listFiles(dirPath, extension = null) {
    const files = Array.from(this.files.keys())
      .filter(path => path.startsWith(dirPath))
      .map(path => path.substring(dirPath.length + 1))
      .filter(file => !file.includes('/'));

    if (extension) {
      return files.filter(file => file.endsWith(extension));
    }
    return files;
  }

  async createDirectory(dirPath) {
    this.directories.add(dirPath);
  }

  getDataPath(filename) {
    return `/mock/data/${filename}`;
  }

  getBotPath(filename) {
    return `/mock/src/bots/${filename}`;
  }

  setFile(filePath, content) {
    this.files.set(filePath, content);
  }

  getFile(filePath) {
    return this.files.get(filePath);
  }

  clear() {
    this.files.clear();
    this.directories.clear();
  }

  getAllFiles() {
    return Array.from(this.files.keys());
  }
}

module.exports = MockFileService;