/**
 * In-Memory Virtual Filesystem Node
 */
export interface VFSNode {
  type: 'file' | 'directory';
  data?: Uint8Array;
  children?: Map<string, VFSNode>;
  updatedAt: number;
}

/**
 * Isolated in-memory filesystem for guest sandboxes
 */
export class InMemoryVFS {
  private root: VFSNode = {
    type: 'directory',
    children: new Map(),
    updatedAt: Date.now()
  };

  constructor(initialFiles?: Record<string, string | Uint8Array>) {
    if (initialFiles) {
      for (const [filePath, content] of Object.entries(initialFiles)) {
        this.writeFile(filePath, content);
      }
    }
  }

  private normalizePath(path: string): string[] {
    return path
      .replace(/\\/g, '/')
      .split('/')
      .filter((segment) => segment.length > 0 && segment !== '.');
  }

  public writeFile(path: string, content: string | Uint8Array): void {
    const segments = this.normalizePath(path);
    if (segments.length === 0) {
      throw new Error('Cannot write to root directory');
    }

    let current = this.root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!current.children!.has(seg)) {
        current.children!.set(seg, {
          type: 'directory',
          children: new Map(),
          updatedAt: Date.now()
        });
      }
      current = current.children!.get(seg)!;
      if (current.type !== 'directory') {
        throw new Error(`Path collision: ${seg} is not a directory`);
      }
    }

    const fileName = segments[segments.length - 1];
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;

    current.children!.set(fileName, {
      type: 'file',
      data,
      updatedAt: Date.now()
    });
  }

  public readFile(path: string): Uint8Array {
    const node = this.getNode(path);
    if (!node || node.type !== 'file' || !node.data) {
      throw new Error(`File not found: ${path}`);
    }
    return node.data;
  }

  public readTextFile(path: string): string {
    const data = this.readFile(path);
    return new TextDecoder().decode(data);
  }

  public exists(path: string): boolean {
    return this.getNode(path) !== null;
  }

  private getNode(path: string): VFSNode | null {
    const segments = this.normalizePath(path);
    let current = this.root;

    for (const seg of segments) {
      if (seg === '..') {
        // Prevent escaping above root
        continue;
      }
      if (!current.children || !current.children.has(seg)) {
        return null;
      }
      current = current.children.get(seg)!;
    }

    return current;
  }
}
