export function normalizePhone(input: string): string {
  let digits = input.replace(/\\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Números nacionais angolanos com nove dígitos são guardados com +244.
  if (/^9\\d{8}$/.test(digits)) digits = "244" + digits;

  if (digits.length < 8 || digits.length > 15) return "";
  return "+" + digits;
}

export function phoneDigits(input: string): string {
  return normalizePhone(input).replace(/\\D/g, "");
}
