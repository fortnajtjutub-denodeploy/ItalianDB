type Collection = Record<string, any>[];

export class Query {
  private data: Collection;

  constructor(data: Collection) {
    // Clone to avoid mutating original
    this.data = [...data];
  }

  where(filter: Record<string, any>) {
    this.data = this.data.filter(item =>
      Object.entries(filter).every(([key, value]) => item[key] === value)
    );
    return this; // allow chaining
  }

  sort(key: string, direction: "asc" | "desc" = "asc") {
    this.data.sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return this;
  }

  limit(n: number) {
    this.data = this.data.slice(0, n);
    return this;
  }

  all() {
    return this.data;
  }

  first() {
    return this.data[0];
  }
}
