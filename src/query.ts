type Collection = Record<string, unknown>[];

export class Query {
    private data: Collection;

    constructor(data: Collection) {
        // Clone to avoid mutating original
        this.data = [...data];
    }

    where(filter: Record<string, unknown>): Query {
        this.data = this.data.filter(item =>
            Object.entries(filter).every(([key, value]) => item[key] === value)
        );
        return this; // allow chaining
    }

    sort(key: string, direction: "asc" | "desc" = "asc"): Query {
        this.data.sort((a, b) => {
            if ((a[key] as any) < (b[key] as any)) return direction === "asc" ? -1 : 1;
            if ((a[key] as any) > (b[key] as any)) return direction === "asc" ? 1 : -1;
            return 0;
        });
        return this;
    }

    limit(n: number): Query {
        this.data = this.data.slice(0, n);
        return this;
    }

    all(): Collection {
        return this.data;
    }

    first(): Record<string, unknown> | undefined {
        return this.data[0];
    }
}
