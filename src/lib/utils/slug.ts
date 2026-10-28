import { customAlphabet } from "nanoid";

// Alphabet without ambiguous characters (0/O, 1/l/I)
const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";

const nanoid = customAlphabet(alphabet, 7);

/**
 * Generates a short, URL-safe, unique slug for matches.
 * Uses a custom alphabet to avoid ambiguous characters.
 * Length 7 gives ~30^7 ≈ 21.8 billion combinations.
 */
export function generateSlug(): string {
  return nanoid();
}
