const fs = require('fs').promises;
const path = require('path');

class FileService {
  async readJson(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async writeJson(filePath, data) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async listFiles(dirPath, extension = null) {
    try {
      const files = await fs.readdir(dirPath);
      if (extension) {
        return files.filter(file => file.endsWith(extension));
      }
      return files;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async createDirectory(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  getDataPath(filename) {
    return path.join(process.cwd(), 'data', filename);
  }

  getBotPath(filename) {
    return path.join(process.cwd(), 'src', 'bots', filename);
  }
}

module.exports = FileService;