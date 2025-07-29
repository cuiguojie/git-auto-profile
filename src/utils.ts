import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export function expandPath(inputPath: string): string {
  if (inputPath.startsWith('~')) {
    return path.join(os.homedir(), inputPath.slice(1));
  }
  return path.resolve(inputPath);
}

export function shrinkPath(absolutePath: string): string {
  const homeDir = os.homedir();
  if (absolutePath.startsWith(homeDir)) {
    return '~' + absolutePath.slice(homeDir.length);
  }
  return absolutePath;
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

export function getConfigPath(): string {
  return path.join(os.homedir(), '.git-auto-profile', 'config.json');
}

export function getGitConfigPath(): string {
  return path.join(os.homedir(), '.gitconfig');
}

export function getProfilesDir(config: { profilesPath: string }): string {
  return expandPath(config.profilesPath);
}

export interface Config {
  profilesPath: string;
}

export interface Profile {
  name: string;
  email: string;
  sshKey: string;
}