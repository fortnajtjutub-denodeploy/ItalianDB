import { ItalianDB } from "./mod.ts";
import { assert, assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";

const TEST_DB_PATH = "./test_db.json";

// Helper to cleanup
function cleanup() {
  try {
    Deno.removeSync(TEST_DB_PATH);
  } catch {
    // ignore
  }
}

Deno.test({
  name: "Basic CRUD Operations",
  fn: () => {
    cleanup();
    const db = new ItalianDB(TEST_DB_PATH);
    db.makeCollection("users");

    // Insert
    db.get("users").insert({ name: "Mario", age: 40, role: "plumber" });
    db.get("users").insert({ name: "Luigi", age: 38, role: "plumber" });
    db.get("users").insert({ name: "Peach", age: 35, role: "princess" });

    // Read
    const plumbers = db.get("users").where({ role: "plumber" }).all();
    assertEquals(plumbers.length, 2);
    assertEquals(plumbers[0].name, "Mario");

    // Update
    db.get("users").where({ name: "Mario" }).update({ active: true });
    const mario = db.get("users").where({ name: "Mario" }).first();
    assert(mario?.active === true);

    // Delete
    db.get("users").where({ name: "Luigi" }).delete();
    const count = db.get("users").count();
    assertEquals(count, 2);

    cleanup();
  },
});

Deno.test({
  name: "Advanced Query Operators",
  fn: () => {
    const db = new ItalianDB();
    db.makeCollection("items");
    const items = [
      { id: 1, val: 10, tags: ["a", "b"] },
      { id: 2, val: 20, tags: ["b", "c"] },
      { id: 3, val: 30, tags: ["c", "d"] },
      { id: 4, val: 40, tags: ["d", "e"] },
    ];
    items.forEach(i => db.get("items").insert(i));

    // $gt
    const gt20 = db.get("items").where({ val: { $gt: 20 } }).all();
    assertEquals(gt20.length, 2); // 30, 40

    // $in
    const inList = db.get("items").where({ id: { $in: [1, 3] } }).all();
    assertEquals(inList.length, 2);

    // $like (simple string includes)
    // Note: $like implementation in Query.ts uses string inclusion
    db.get("items").insert({ id: 5, val: 50, tags: [], name: "Special Item" });
    const special = db.get("items").where({ name: { $like: "Special" } }).all();
    assertEquals(special.length, 1);
  }
});

Deno.test({
  name: "Sorting, Limiting, Skipping",
  fn: () => {
    const db = new ItalianDB();
    db.makeCollection("nums");
    for (let i = 1; i <= 10; i++) db.get("nums").insert({ n: i });

    // Sort DESC
    const desc = db.get("nums").sort("n", "desc").all();
    assertEquals(desc[0].n, 10);

    // Limit
    const limited = db.get("nums").sort("n", "asc").limit(3).all();
    assertEquals(limited.length, 3);
    assertEquals(limited[2].n, 3);

    // Skip
    const skipped = db.get("nums").sort("n", "asc").skip(8).all();
    assertEquals(skipped.length, 2); // 9, 10
    assertEquals(skipped[0].n, 9);
  }
});

Deno.test({
  name: "Aggregations",
  fn: () => {
    const db = new ItalianDB();
    db.makeCollection("stats");
    db.get("stats").insert({ score: 10, cat: "A" });
    db.get("stats").insert({ score: 20, cat: "A" });
    db.get("stats").insert({ score: 30, cat: "B" });

    assertEquals(db.get("stats").sum("score"), 60);
    assertEquals(db.get("stats").avg("score"), 20);
    assertEquals(db.get("stats").min("score"), 10);
    assertEquals(db.get("stats").max("score"), 30);
    assertEquals(db.get("stats").distinct("cat").length, 2);
  }
});

Deno.test({
  name: "References and Resolution",
  fn: () => {
    const db = new ItalianDB();
    db.makeCollection("users");
    db.makeCollection("posts");

    db.get("users").insert({ name: "Author" });
    const userId = db.get("users").first()?._id;
    assertExists(userId);

    // Insert raw reference string
    db.get("posts").insert({ title: "My Post", author: `[users:${userId}]` });

    // Test all() returns raw string
    const rawPost = db.get("posts").first();
    assertEquals(rawPost?.author, `[users:${userId}]`);

    // Test resolveReferences() returns object
    const resolvedPosts = db.get("posts").resolveReferences();
    const resolvedPost = resolvedPosts[0];
    assertObjectMatch(resolvedPost.author, { name: "Author", _id: userId });
  }
});

Deno.test({
  name: "Persistence",
  fn: () => {
    cleanup();
    const db1 = new ItalianDB(TEST_DB_PATH);
    db1.makeCollection("saved");
    db1.get("saved").insert({ data: "persist me" });
    db1.flush(); // Force save

    // Create new instance loading same file
    const db2 = new ItalianDB(TEST_DB_PATH);
    const item = db2.get("saved").first();
    assertEquals(item?.data, "persist me");

    cleanup();
  }
});


// --- BENCHMARKS ---

Deno.bench({
  name: "Insert 1000 items",
  fn: () => {
    const db = new ItalianDB();
    db.makeCollection("bench");
    for (let i = 0; i < 1000; i++) {
      db.get("bench").insert({ i, data: "test data" });
    }
  }
});

Deno.bench({
  name: "Resolve References (100 items)",
  fn: () => {
    const db = new ItalianDB();
    db.makeCollection("parents");
    db.makeCollection("children");
    
    // Create 10 parents
    const parentIds: string[] = [];
    for(let i=0; i<10; i++) {
      db.get("parents").insert({ name: `Parent ${i}` });
      const id = db.get("parents").id()[i]; // this might grab wrong one if not careful but order usually preserved
      parentIds.push(id!);
    }

    // Create 100 children referencing random parent
    for(let i=0; i<100; i++) {
      const pid = parentIds[i % 10];
      db.get("children").insert({ name: `Child ${i}`, parent: `[parents:${pid}]` });
    }

    // Measure resolution
    db.get("children").resolveReferences();
  }
});
