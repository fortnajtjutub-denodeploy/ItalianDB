import { ItalianDB } from "@kerb/italian-db";

const db = new ItalianDB();

db.makeCollection("users");

const users = db.get("users")

console.log(users)