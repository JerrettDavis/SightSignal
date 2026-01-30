import bcrypt from "bcrypt";

const password = "Password!";
const hash = "$2b$10$3ucZ/lmCdbbQNyxmXgDv2uBIXueZcUdtKpJVYkd5NvVdZyZVyRl3C";

console.log("Testing password:", password);
console.log("Against hash:", hash);

bcrypt.compare(password, hash).then(result => {
  console.log("Password match:", result);
  process.exit(result ? 0 : 1);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
