import { Query } from "./query.ts";

type Collection = Record<string, any>[];

export class ItalianDB {
  private collections: Record<string, Collection> = {};

  makeCollection(name: string) {
    if (!this.collections[name]) {
      this.collections[name] = [];
    }
  }

  get(name: string): Query | undefined {
    const col = this.collections[name];
    if (!col) return undefined;
    return new Query(col);
  }
}
