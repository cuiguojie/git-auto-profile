import { promises as fs } from 'fs';
import path from 'path';
import { getGitConfigPath } from './utils.js';

export interface ManagedBlockInfo {
  startIndex: number;
  endIndex: number;
  contentStart: number;
  contentEnd: number;
  content: string;
  beforeBlock: string;
  afterBlock: string;
}

export class GitConfigManager {
  private static readonly MANAGED_START = '# --- GIT-AUTO-PROFILE MANAGED BLOCK ---';
  private static readonly MANAGED_END = '# --- END GIT-AUTO-PROFILE MANAGED BLOCK ---';

  static async readGitConfig(): Promise<string> {
    const gitConfigPath = getGitConfigPath();
    try {
      return await fs.readFile(gitConfigPath, 'utf8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return '';
      }
      throw error;
    }
  }

  static async writeGitConfig(content: string): Promise<void> {
    const gitConfigPath = getGitConfigPath();
    await fs.writeFile(gitConfigPath, content);
  }

  static getManagedBlockInfo(content: string): ManagedBlockInfo | null {
    const startIndex = content.indexOf(this.MANAGED_START);
    const endIndex = content.indexOf(this.MANAGED_END);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    const contentStart = startIndex + this.MANAGED_START.length;
    const contentEnd = endIndex;

    return {
      startIndex,
      endIndex,
      contentStart,
      contentEnd,
      content: content.substring(contentStart, contentEnd).trim(),
      beforeBlock: content.substring(0, startIndex + this.MANAGED_START.length),
      afterBlock: content.substring(endIndex + this.MANAGED_END.length)
    };
  }

  static async ensureManagedBlock(): Promise<void> {
    let content = await this.readGitConfig();
    const blockInfo = this.getManagedBlockInfo(content);

    if (!blockInfo) {
      // 如果不存在管理块，添加一个
      const managedBlock = `${this.MANAGED_START}\n${this.MANAGED_END}`;
      if (content.trim() && !content.endsWith('\n')) {
        content += '\n';
      }
      content += (content.trim() ? '\n' : '') + managedBlock + '\n';
      await this.writeGitConfig(content);
    }
  }

  static async addIncludeIfRule(urlPattern: string, profilePath: string): Promise<void> {
    const content = await this.readGitConfig();
    const blockInfo = this.getManagedBlockInfo(content);

    if (!blockInfo) {
      throw new Error('Managed block not found. Please run "gap init" first.');
    }

    // 检查是否已存在相同的 URL 模式
    if (blockInfo.content.includes(`hasconfig:remote.*.url:${urlPattern}"`)) {
      throw new Error('A profile with this URL pattern already exists');
    }

    const includeIfRule = `[includeIf "hasconfig:remote.*.url:${urlPattern}"]
    path = ${profilePath}`;

    const newContent = blockInfo.content ? 
      `${blockInfo.content}\n${includeIfRule}` : 
      includeIfRule;

    const fullContent = `${blockInfo.beforeBlock}\n${newContent}\n${this.MANAGED_END}${blockInfo.afterBlock}`;
    await this.writeGitConfig(fullContent);
  }

  static async removeIncludeIfRule(profilePath: string): Promise<void> {
    const content = await this.readGitConfig();
    const blockInfo = this.getManagedBlockInfo(content);

    if (!blockInfo) {
      throw new Error('Managed block not found in .gitconfig');
    }

    // 将管理块内容按行分割并过滤
    const lines = blockInfo.content.split('\n');
    const newLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (line.startsWith('[includeIf')) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.includes(`path = ${profilePath}`)) {
          // 跳过这两行（匹配的 includeIf 规则）
          i += 2;
          continue;
        }
      } else if (line.includes(`path = ${profilePath}`)) {
        // 跳过包含目标 profile 的行
        i += 1;
        continue;
      }

      if (line) {
        newLines.push(lines[i]);
      }
      i += 1;
    }

    const newManagedContent = newLines.join('\n');
    const fullContent = `${blockInfo.beforeBlock}\n${newManagedContent}\n${this.MANAGED_END}${blockInfo.afterBlock}`;
    await this.writeGitConfig(fullContent);
  }

  static async listIncludeIfRules(): Promise<Array<{urlPattern: string, profilePath: string}>> {
    const content = await this.readGitConfig();
    const blockInfo = this.getManagedBlockInfo(content);

    if (!blockInfo) {
      return [];
    }

    const rules: Array<{urlPattern: string, profilePath: string}> = [];
    const lines = blockInfo.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('[includeIf')) {
        const match = line.match(/hasconfig:remote\.\*\.url:([^"]+)/);
        const nextLine = lines[i + 1];
        if (match && nextLine) {
          const pathMatch = nextLine.trim().match(/path = (\S+)/);
          if (pathMatch) {
            rules.push({
              urlPattern: match[1],
              profilePath: pathMatch[1]
            });
            i++; // 跳过下一行
          }
        }
      }
    }

    return rules;
  }
}