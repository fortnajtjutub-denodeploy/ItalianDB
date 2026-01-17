import { type Collection, Query } from "./query.ts";

export default class ItalianDB {
  private collections: Record<string, Collection> = {};
  private filePath?: string;
  private autoSave: boolean;
  private saveTimeout: number | null = null;
  private saveDelay: number = 10; // ms

  constructor(filePath?: string, autoSave: boolean = true) {
    if (filePath && typeof filePath !== "string") {
      throw new Error("filePath must be a string");
    }
    this.filePath = filePath;
    this.autoSave = autoSave;
    if (filePath) {
      try {
        const raw = Deno.readFileSync(filePath);
        this.collections = JSON.parse(new TextDecoder().decode(raw)) as Record<string, Collection>;
      } catch (error) {
        // Log the error but don't throw - start fresh
        console.warn(`Failed to load database from ${filePath}:`, error);
        this.collections = {};
      }
    }
  }

  makeCollection(name: string): void {
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error("Collection name must be a non-empty string");
    }
    if (this.collections[name]) {
      throw new Error(`Collection "${name}" already exists`);
    }
    this.collections[name] = [];
    if (this.autoSave) this.save();
  }

  shouldAutoSave(): boolean {
    return this.autoSave;
  }

  get(name: string): Query {
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error("Collection name must be a non-empty string");
    }
    const col = this.collections[name];
    if (!col) {
      throw new Error(`Collection "${name}" does not exist. Use makeCollection() first.`);
    }
    return new Query(col, this, name);
  }

  save(): void {
    if (!this.filePath) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.doSave();
      this.saveTimeout = null;
    }, this.saveDelay);
  }

  flush(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.doSave();
  }

  private doSave(): void {
    if (!this.filePath) return;
    try {
      const tempFile = `${this.filePath}.tmp`;
      // Write to temp file first
      Deno.writeFileSync(tempFile, new TextEncoder().encode(JSON.stringify(this.collections)));
      // Atomic rename/move
      Deno.renameSync(tempFile, this.filePath);
    } catch (error) {
      throw new Error(`Failed to save database: ${error}`);
    }
  }
}
