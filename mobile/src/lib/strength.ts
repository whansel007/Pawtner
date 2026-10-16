/**
 * A medicine strength for display (user, 16 Oct). HSA combination products list their parts joined by "&&"
 * ("10 mg&&80.000mg"); it reads as "10 mg / 80.000mg". The order stays as stored. Empty or missing gives "".
 */
export function formatStrength(raw: string | null | undefined): string {
  return (raw ?? "").split("&&").map((part) => part.trim()).filter(Boolean).join(" / ");
}
