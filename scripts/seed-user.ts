/**
 * Seed the first user so someone can log in. Run with Bun (auto-loads .env):
 *
 *   bun run db:seed-user -- you@example.com 'your-password' "Your Name"
 *
 * Or omit args to be prompted. If a user with the email already exists, its
 * password (and name, if given) is updated instead of inserting a duplicate.
 */
import { userRepository } from "@/server/db/repository";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/server/services/auth/password";
import { normalizeEmail } from "@/server/services";

const [argEmail, argPassword, argName] = process.argv.slice(2);

const emailRaw = argEmail ?? prompt("Email:") ?? "";
const password = argPassword ?? prompt("Password:") ?? "";
const name = argName ?? "";

const email = normalizeEmail(emailRaw);

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("✖ Invalid email address");
  process.exit(1);
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`✖ Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const existing = await userRepository.findByEmail(email);

if (existing) {
  await userRepository.update(existing.id, {
    passwordHash,
    status: "active",
    ...(name ? { name } : {}),
  });
  console.log(`✔ Updated existing user ${email} (reactivated, password reset)`);
} else {
  await userRepository.create({ email, name, passwordHash, status: "active" });
  console.log(`✔ Created user ${email}`);
}

process.exit(0);
