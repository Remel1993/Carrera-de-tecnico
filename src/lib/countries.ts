// Mapea el nombre de una selección al código ISO usado por flagcdn.
const MAP: Record<string, string> = {
  Argentina: "ar",
  France: "fr",
  Brazil: "br",
  England: "gb-eng",
  Spain: "es",
  Germany: "de",
  Portugal: "pt",
  Netherlands: "nl",
  Italy: "it",
  Uruguay: "uy",
  Croatia: "hr",
  Morocco: "ma",
  Japan: "jp",
  USA: "us",
  Mexico: "mx",
  Colombia: "co",
  Belgium: "be",
  Senegal: "sn",
  Switzerland: "ch",
  Denmark: "dk",
  "South Korea": "kr",
  Chile: "cl",
  Ecuador: "ec",
  Nigeria: "ng",
  Cameroon: "cm",
  Ghana: "gh",
  Canada: "ca",
  Australia: "au",
  Serbia: "rs",
  Poland: "pl",
  Peru: "pe",
  Egypt: "eg",
};

export const getCountryCode = (name?: string): string | null => {
  if (!name) return null;
  return MAP[name] ?? null;
};
