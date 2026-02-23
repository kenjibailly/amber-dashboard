print("========== INIT SCRIPT STARTED ==========");

const user = process.env.MONGO_USER;
const pass = process.env.MONGO_PASSWORD;

print("User: " + user);
print("Pass defined: " + (pass !== undefined));

if (!user || !pass) {
  print("ERROR: MONGO_USER or MONGO_PASSWORD is undefined!");
  quit(1);
}

db = db.getSiblingDB("amber");

db.createUser({
  user: user,
  pwd: pass,
  roles: [{ role: "readWrite", db: "amber" }],
});

print("User created successfully");
print("========== INIT SCRIPT FINISHED ==========");
