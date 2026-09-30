export interface PhoneCountry {
  iso: string;
  name: string;
  dialCode: string;
  example: string;
  minDigits: number;
  maxDigits: number;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "IN", name: "India", dialCode: "+91", example: "98765 43210", minDigits: 10, maxDigits: 10 },
  { iso: "AE", name: "UAE", dialCode: "+971", example: "50 123 4567", minDigits: 9, maxDigits: 9 },
  { iso: "US", name: "United States", dialCode: "+1", example: "202 555 0123", minDigits: 10, maxDigits: 10 },
  { iso: "CA", name: "Canada", dialCode: "+1", example: "416 555 0123", minDigits: 10, maxDigits: 10 },
  { iso: "GB", name: "United Kingdom", dialCode: "+44", example: "7400 123456", minDigits: 9, maxDigits: 10 },
  { iso: "AU", name: "Australia", dialCode: "+61", example: "412 345 678", minDigits: 9, maxDigits: 9 },
  { iso: "SG", name: "Singapore", dialCode: "+65", example: "8123 4567", minDigits: 8, maxDigits: 8 },
  { iso: "MY", name: "Malaysia", dialCode: "+60", example: "12 345 6789", minDigits: 9, maxDigits: 10 },
  { iso: "NZ", name: "New Zealand", dialCode: "+64", example: "21 123 4567", minDigits: 8, maxDigits: 10 },
  { iso: "SA", name: "Saudi Arabia", dialCode: "+966", example: "50 123 4567", minDigits: 9, maxDigits: 9 },
  { iso: "QA", name: "Qatar", dialCode: "+974", example: "3312 3456", minDigits: 8, maxDigits: 8 },
  { iso: "BH", name: "Bahrain", dialCode: "+973", example: "3600 1234", minDigits: 8, maxDigits: 8 },
  { iso: "KW", name: "Kuwait", dialCode: "+965", example: "500 12345", minDigits: 8, maxDigits: 8 },
  { iso: "OM", name: "Oman", dialCode: "+968", example: "9212 3456", minDigits: 8, maxDigits: 8 },
  { iso: "DE", name: "Germany", dialCode: "+49", example: "1512 3456789", minDigits: 7, maxDigits: 11 },
  { iso: "FR", name: "France", dialCode: "+33", example: "6 12 34 56 78", minDigits: 9, maxDigits: 9 },
  { iso: "NL", name: "Netherlands", dialCode: "+31", example: "6 12345678", minDigits: 9, maxDigits: 9 },
  { iso: "IT", name: "Italy", dialCode: "+39", example: "312 345 6789", minDigits: 9, maxDigits: 10 },
  { iso: "ES", name: "Spain", dialCode: "+34", example: "612 345 678", minDigits: 9, maxDigits: 9 },
  { iso: "IE", name: "Ireland", dialCode: "+353", example: "85 123 4567", minDigits: 9, maxDigits: 9 },
  { iso: "CH", name: "Switzerland", dialCode: "+41", example: "78 123 45 67", minDigits: 9, maxDigits: 9 },
  { iso: "SE", name: "Sweden", dialCode: "+46", example: "70 123 45 67", minDigits: 7, maxDigits: 10 },
  { iso: "NO", name: "Norway", dialCode: "+47", example: "412 34 567", minDigits: 8, maxDigits: 8 },
  { iso: "DK", name: "Denmark", dialCode: "+45", example: "20 12 34 56", minDigits: 8, maxDigits: 8 },
  { iso: "ZA", name: "South Africa", dialCode: "+27", example: "71 123 4567", minDigits: 9, maxDigits: 9 },
  { iso: "NG", name: "Nigeria", dialCode: "+234", example: "802 123 4567", minDigits: 10, maxDigits: 10 },
  { iso: "KE", name: "Kenya", dialCode: "+254", example: "712 123456", minDigits: 9, maxDigits: 9 },
  { iso: "JP", name: "Japan", dialCode: "+81", example: "90 1234 5678", minDigits: 10, maxDigits: 10 },
  { iso: "KR", name: "South Korea", dialCode: "+82", example: "10 1234 5678", minDigits: 9, maxDigits: 10 },
  { iso: "ID", name: "Indonesia", dialCode: "+62", example: "812 3456 7890", minDigits: 9, maxDigits: 12 },
  { iso: "PH", name: "Philippines", dialCode: "+63", example: "917 123 4567", minDigits: 10, maxDigits: 10 },
  { iso: "TH", name: "Thailand", dialCode: "+66", example: "81 234 5678", minDigits: 9, maxDigits: 9 },
  { iso: "BD", name: "Bangladesh", dialCode: "+880", example: "1712 345678", minDigits: 10, maxDigits: 10 },
  { iso: "LK", name: "Sri Lanka", dialCode: "+94", example: "71 234 5678", minDigits: 9, maxDigits: 9 },
  { iso: "NP", name: "Nepal", dialCode: "+977", example: "981 234 5678", minDigits: 10, maxDigits: 10 },
  { iso: "BR", name: "Brazil", dialCode: "+55", example: "11 91234 5678", minDigits: 10, maxDigits: 11 },
  { iso: "MX", name: "Mexico", dialCode: "+52", example: "55 1234 5678", minDigits: 10, maxDigits: 10 },
];

export const INTERNATIONAL_PHONE_ENABLED =
  process.env.NEXT_PUBLIC_INTERNATIONAL_PHONE_ENABLED === "true";

export function phoneCountry(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.iso === iso) || PHONE_COUNTRIES[0];
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function phoneNationalDigits(iso: string, value: string): string {
  let digits = phoneDigits(value);
  const dialDigits = phoneCountry(iso).dialCode.slice(1);
  if (value.trim().startsWith("+") && digits.startsWith(dialDigits)) {
    digits = digits.slice(dialDigits.length);
  }
  return digits;
}

export function validatePhone(iso: string, value: string): string {
  const country = phoneCountry(iso);
  const digits = phoneDigits(value);
  if (digits.length < country.minDigits || digits.length > country.maxDigits) {
    const expected = country.minDigits === country.maxDigits
      ? `${country.minDigits} digits`
      : `${country.minDigits}–${country.maxDigits} digits`;
    return `Enter a valid ${country.name} number (${expected}).`;
  }
  if (iso !== "IN" && !INTERNATIONAL_PHONE_ENABLED) {
    return "International OTP needs the backend provider update. Use an Indian number or email sign-in for now.";
  }
  return "";
}

export function phoneApiValue(iso: string, value: string): string {
  const digits = phoneDigits(value);
  if (iso === "IN") return digits;
  return `${phoneCountry(iso).dialCode}${digits}`;
}

export function phoneDisplayValue(iso: string, value: string): string {
  return `${phoneCountry(iso).dialCode} ${phoneDigits(value)}`;
}
