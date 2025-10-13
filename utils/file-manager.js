/**
 * ファイル管理ユーティリティ
 */

import fs from 'fs/promises';
import path from 'path';
import { Logger } from './logger.js';

export class FileManager {
  /**
   * JSONファイルを読み込む
   */
  static async readJSON(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      Logger.error(`Failed to read JSON file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * JSONファイルに書き込む
   */
  static async writeJSON(filePath, data) {
    try {
      await this.ensureDirectory(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      Logger.info(`JSON file written: ${filePath}`);
    } catch (error) {
      Logger.error(`Failed to write JSON file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * テキストファイルに書き込む
   */
  static async writeFile(filePath, content) {
    try {
      await this.ensureDirectory(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
      Logger.info(`File written: ${filePath}`);
    } catch (error) {
      Logger.error(`Failed to write file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * ディレクトリが存在しない場合は作成する
   */
  static async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        Logger.error(`Failed to create directory: ${dirPath}`, error);
        throw error;
      }
    }
  }

  /**
   * ファイルが存在するかチェック
   */
  static async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 一時ファイルを削除
   */
  static async cleanup(filePaths) {
    for (const filePath of filePaths) {
      try {
        if (await this.exists(filePath)) {
          await fs.unlink(filePath);
          Logger.info(`Cleaned up file: ${filePath}`);
        }
      } catch (error) {
        Logger.warn(`Failed to cleanup file: ${filePath}`, error);
      }
    }
  }

  /**
   * GitHub Actions出力を設定
   */
  static async setGitHubOutput(name, value) {
    if (process.env.GITHUB_OUTPUT) {
      const output = typeof value === 'string' ? value : JSON.stringify(value);
      const outputLine = `${name}=${output}\n`;
      
      try {
        // GitHub Actionsの出力ファイルに追記
        const fs = await import('fs/promises');
        await fs.appendFile(process.env.GITHUB_OUTPUT, outputLine);
        Logger.info(`GitHub output set: ${name}`);
      } catch (error) {
        Logger.warn(`Failed to set GitHub output: ${name}`, error);
      }
    } else {
      Logger.debug(`GitHub output not available: ${name}`);
    }
  }

  /**
   * GitHub Actions環境変数を取得
   */
  static getGitHubInput(name, defaultValue = '') {
    return process.env[name.toUpperCase()] || defaultValue;
  }
}