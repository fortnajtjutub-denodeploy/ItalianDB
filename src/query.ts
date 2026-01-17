import type ItalianDB from "./db.ts";

export type Collection = Record<string, any>[];

type Operator =
  | "$ne"
  | "$gt"
  | "$gte"
  | "$lt"
  | "$lte"
  | "$in"
  | "$nin"
  | "$like"
  | "$regex"
  | "$exists";

export class Query {
  private data: Collection;
  private original: Collection;
  private db: ItalianDB;
  private name: string;

  constructor(data: Collection, db: ItalianDB, name: string) {
    this.data = [...data];
    this.original = data;
    this.db = db;
    this.name = name;
  }

  // --- READ METHODS ---

  where(filter: Record<string, any>): Query {
    const match = (
      item: Record<string, any>,
      f: Record<string, any>,
    ): boolean => {
      return Object.entries(f).every(([key, val]) => {
        if (key === "$or" && Array.isArray(val)) {
          return val.some((sub) => match(item, sub));
        }
        if (key === "$and" && Array.isArray(val)) {
          return val.every((sub) => match(item, sub));
        }
        if (val && typeof val === "object" && !Array.isArray(val)) {
          return Object.entries(val).every(([op, v]) => {
            switch (op as string) {
              case "$ne":
                return item[key] !== v;
              case "$gt":
                return typeof v === "number" && item[key] > v;
              case "$gte":
                return typeof v === "number" && item[key] >= v;
              case "$lt":
                return typeof v === "number" && item[key] < v;
              case "$lte":
                return typeof v === "number" && item[key] <= v;
              case "$in":
                return Array.isArray(v) && v.includes(item[key]);
              case "$nin":
                return Array.isArray(v) && !v.includes(item[key]);
              case "$like":
                return typeof item[key] === "string" && typeof v === "string" &&
                  item[key].includes(v);
              case "$exists":
                return typeof v === "boolean"
                  ? (v ? key in item : !(key in item))
                  : false;
              default:
                return item[key] === v;
            }
          });
        }
        return item[key] === val;
      });
    };

    this.data = this.data.filter((item) => match(item, filter));
    return this;
  }

  sort(key: string, direction: "asc" | "desc" = "asc"): Query {
    this.data.sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return this;
  }

  limit(n: number): Query {
    this.data = this.data.slice(0, n);
    return this;
  }

  skip(n: number): Query {
    this.data = this.data.slice(n);
    return this;
  }

  all(): Collection {
    return this.data;
  }

  first(): Record<string, any> | undefined {
    return this.data[0];
  }

  count(): number {
    return this.data.length;
  }

  exists(): boolean {
    return this.data.length > 0;
  }

  distinct(field: string): any[] {
    const seen = new Set<any>();
    const result: any[] = [];
    for (const item of this.data) {
      if (!seen.has(item[field])) {
        seen.add(item[field]);
        result.push(item[field]);
      }
    }
    return result;
  }

  sum(field: string): number {
    return this.data.reduce((acc, item) => acc + (item[field] || 0), 0);
  }

  avg(field: string): number {
    if (!this.data.length) return 0;
    return this.sum(field) / this.data.length;
  }

  min(field: string): number {
    return this.data.reduce(
      (min, item) => (item[field] < min ? item[field] : min),
      Infinity,
    );
  }

  max(field: string): number {
    return this.data.reduce(
      (max, item) => (item[field] > max ? item[field] : max),
      -Infinity,
    );
  }

  // --- WRITE METHODS ---
  insert(doc: Record<string, any>): Query {
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
      throw new Error("Document must be a non-null object");
    }
    this.original.push(doc);
    if (this.db.shouldAutoSave()) this.db.save();
    return this;
  }

  update(updates: Record<string, any>): Query {
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      throw new Error("Updates must be a non-null object");
    }
    for (const item of this.original) {
      if (this.data.includes(item)) Object.assign(item, updates);
    }
    if (this.db.shouldAutoSave()) this.db.save();
    return this;
  }

  delete(): Query {
    for (const item of this.data) {
      const index = this.original.indexOf(item);
      if (index !== -1) this.original.splice(index, 1);
    }
    if (this.db.shouldAutoSave()) this.db.save();
    return this;
  }
}
