import { generateSlug } from "random-word-slugs";

/**
 * Generates a random user name with 2 words, capitalized and without hyphens
 * Example: "Fluffy Panda", "Happy Elephant", "Brave Tiger"
 */
export function generateUserName(): string {
  const slug = generateSlug(2); // Generate 2 words with hyphen: "fluffy-panda"
  
  // Split by hyphen, capitalize each word, and join with space
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
