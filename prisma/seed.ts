import { prisma } from './src/database';
// Need to import bcrypt if we were hashing it manually, but better-auth handles hashing on sign-up.
// If you want to use better-auth to create a user programmatically, you should use the better-auth client or API, 
// or hash the password using the same algorithm better-auth uses.

// A simple way to seed a user via Prisma (assuming you know how you want to hash the password, 
// or if you just want to seed standard data)
import { hash } from "bcrypt"; // You might need to install bcrypt or use better-auth's auth.api.signUpEmailPassword

async function seed() {
  console.log("Seeding Neon DB...");

  // Example: Re-create your local test user
  const hashedPassword = await hash("password123", 10); // Replace with your actual test password

  const user = await prisma.user.create({
    data: {
      email: "test@example.com", // Replace with your test email
      name: "Test User",
      // better-auth might store the password in a related Account or Password table depending on its setup, 
      // but if it's email/password, usually better-auth creates an account or stores password hash.
      // Make sure to match how better-auth expects the user to be created.
    },
  });
  
  // NOTE: better-auth usually requires using its own API to register a user so the password hash is stored correctly.
  console.log("Created user:", user.email);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
