/**
 * ISO 4217 Currency Data Module
 *
 * Comprehensive list of all active ISO 4217 currency codes with metadata.
 * Data sourced from the ISO 4217 standard maintained by SIX Group.
 * Includes all ~180 active codes plus commonly used non-ISO codes (BTC, XAU, XAG).
 */

export interface CurrencyInfo {
  /** 3-letter ISO 4217 alpha code (e.g. "AUD") */
  code: string;
  /** 3-digit ISO 4217 numeric code (e.g. 36) */
  numeric: number;
  /** English name of the currency (e.g. "Australian Dollar") */
  name: string;
  /** Common currency symbol (e.g. "$", "€", "£") */
  symbol: string;
  /** Number of digits after decimal point for the minor unit (e.g. 2 for cents) */
  minorUnit: number;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  AED: { code: 'AED', numeric: 784, name: 'UAE Dirham', symbol: 'د.إ', minorUnit: 2 },
  AFN: { code: 'AFN', numeric: 971, name: 'Afghani', symbol: '؋', minorUnit: 2 },
  ALL: { code: 'ALL', numeric: 8, name: 'Lek', symbol: 'L', minorUnit: 2 },
  AMD: { code: 'AMD', numeric: 51, name: 'Armenian Dram', symbol: '֏', minorUnit: 2 },
  ANG: { code: 'ANG', numeric: 532, name: 'Netherlands Antillean Guilder', symbol: 'ƒ', minorUnit: 2 },
  AOA: { code: 'AOA', numeric: 973, name: 'Kwanza', symbol: 'Kz', minorUnit: 2 },
  ARS: { code: 'ARS', numeric: 32, name: 'Argentine Peso', symbol: '$', minorUnit: 2 },
  AUD: { code: 'AUD', numeric: 36, name: 'Australian Dollar', symbol: '$', minorUnit: 2 },
  AWG: { code: 'AWG', numeric: 533, name: 'Aruban Florin', symbol: 'ƒ', minorUnit: 2 },
  AZN: { code: 'AZN', numeric: 944, name: 'Azerbaijan Manat', symbol: '₼', minorUnit: 2 },
  BAM: { code: 'BAM', numeric: 977, name: 'Convertible Mark', symbol: 'KM', minorUnit: 2 },
  BBD: { code: 'BBD', numeric: 52, name: 'Barbados Dollar', symbol: '$', minorUnit: 2 },
  BDT: { code: 'BDT', numeric: 50, name: 'Taka', symbol: '৳', minorUnit: 2 },
  BGN: { code: 'BGN', numeric: 975, name: 'Bulgarian Lev', symbol: 'лв', minorUnit: 2 },
  BHD: { code: 'BHD', numeric: 48, name: 'Bahraini Dinar', symbol: '.د.ب', minorUnit: 3 },
  BIF: { code: 'BIF', numeric: 108, name: 'Burundi Franc', symbol: 'FBu', minorUnit: 0 },
  BMD: { code: 'BMD', numeric: 60, name: 'Bermudian Dollar', symbol: '$', minorUnit: 2 },
  BND: { code: 'BND', numeric: 96, name: 'Brunei Dollar', symbol: '$', minorUnit: 2 },
  BOB: { code: 'BOB', numeric: 68, name: 'Boliviano', symbol: 'Bs.', minorUnit: 2 },
  BOV: { code: 'BOV', numeric: 984, name: 'Mvdol', symbol: 'BOV', minorUnit: 2 },
  BRL: { code: 'BRL', numeric: 986, name: 'Brazilian Real', symbol: 'R$', minorUnit: 2 },
  BSD: { code: 'BSD', numeric: 44, name: 'Bahamian Dollar', symbol: '$', minorUnit: 2 },
  BTN: { code: 'BTN', numeric: 64, name: 'Ngultrum', symbol: 'Nu.', minorUnit: 2 },
  BWP: { code: 'BWP', numeric: 72, name: 'Pula', symbol: 'P', minorUnit: 2 },
  BYN: { code: 'BYN', numeric: 933, name: 'Belarusian Ruble', symbol: 'Br', minorUnit: 2 },
  BZD: { code: 'BZD', numeric: 84, name: 'Belize Dollar', symbol: '$', minorUnit: 2 },
  CAD: { code: 'CAD', numeric: 124, name: 'Canadian Dollar', symbol: '$', minorUnit: 2 },
  CDF: { code: 'CDF', numeric: 976, name: 'Congolese Franc', symbol: 'FC', minorUnit: 2 },
  CHE: { code: 'CHE', numeric: 947, name: 'WIR Euro', symbol: 'CHE', minorUnit: 2 },
  CHF: { code: 'CHF', numeric: 756, name: 'Swiss Franc', symbol: 'CHF', minorUnit: 2 },
  CHW: { code: 'CHW', numeric: 948, name: 'WIR Franc', symbol: 'CHW', minorUnit: 2 },
  CLF: { code: 'CLF', numeric: 990, name: 'Unidad de Fomento', symbol: 'UF', minorUnit: 4 },
  CLP: { code: 'CLP', numeric: 152, name: 'Chilean Peso', symbol: '$', minorUnit: 0 },
  CNY: { code: 'CNY', numeric: 156, name: 'Chinese Yuan', symbol: '¥', minorUnit: 2 },
  COP: { code: 'COP', numeric: 170, name: 'Colombian Peso', symbol: '$', minorUnit: 2 },
  COU: { code: 'COU', numeric: 970, name: 'Unidad de Valor Real', symbol: 'COU', minorUnit: 2 },
  CRC: { code: 'CRC', numeric: 188, name: 'Costa Rican Colon', symbol: '₡', minorUnit: 2 },
  CUC: { code: 'CUC', numeric: 931, name: 'Peso Convertible', symbol: '$', minorUnit: 2 },
  CUP: { code: 'CUP', numeric: 192, name: 'Cuban Peso', symbol: '$', minorUnit: 2 },
  CVE: { code: 'CVE', numeric: 132, name: 'Cabo Verde Escudo', symbol: '$', minorUnit: 2 },
  CZK: { code: 'CZK', numeric: 203, name: 'Czech Koruna', symbol: 'Kč', minorUnit: 2 },
  DJF: { code: 'DJF', numeric: 262, name: 'Djibouti Franc', symbol: 'Fdj', minorUnit: 0 },
  DKK: { code: 'DKK', numeric: 208, name: 'Danish Krone', symbol: 'kr', minorUnit: 2 },
  DOP: { code: 'DOP', numeric: 214, name: 'Dominican Peso', symbol: '$', minorUnit: 2 },
  DZD: { code: 'DZD', numeric: 12, name: 'Algerian Dinar', symbol: 'د.ج', minorUnit: 2 },
  EGP: { code: 'EGP', numeric: 818, name: 'Egyptian Pound', symbol: '£', minorUnit: 2 },
  ERN: { code: 'ERN', numeric: 232, name: 'Nakfa', symbol: 'Nfk', minorUnit: 2 },
  ETB: { code: 'ETB', numeric: 230, name: 'Ethiopian Birr', symbol: 'Br', minorUnit: 2 },
  EUR: { code: 'EUR', numeric: 978, name: 'Euro', symbol: '€', minorUnit: 2 },
  FJD: { code: 'FJD', numeric: 242, name: 'Fiji Dollar', symbol: '$', minorUnit: 2 },
  FKP: { code: 'FKP', numeric: 238, name: 'Falkland Islands Pound', symbol: '£', minorUnit: 2 },
  GBP: { code: 'GBP', numeric: 826, name: 'Pound Sterling', symbol: '£', minorUnit: 2 },
  GEL: { code: 'GEL', numeric: 981, name: 'Lari', symbol: '₾', minorUnit: 2 },
  GHS: { code: 'GHS', numeric: 936, name: 'Ghana Cedi', symbol: '₵', minorUnit: 2 },
  GIP: { code: 'GIP', numeric: 292, name: 'Gibraltar Pound', symbol: '£', minorUnit: 2 },
  GMD: { code: 'GMD', numeric: 270, name: 'Dalasi', symbol: 'D', minorUnit: 2 },
  GNF: { code: 'GNF', numeric: 324, name: 'Guinean Franc', symbol: 'FG', minorUnit: 0 },
  GTQ: { code: 'GTQ', numeric: 320, name: 'Quetzal', symbol: 'Q', minorUnit: 2 },
  GYD: { code: 'GYD', numeric: 328, name: 'Guyana Dollar', symbol: '$', minorUnit: 2 },
  HKD: { code: 'HKD', numeric: 344, name: 'Hong Kong Dollar', symbol: '$', minorUnit: 2 },
  HNL: { code: 'HNL', numeric: 340, name: 'Lempira', symbol: 'L', minorUnit: 2 },
  HRK: { code: 'HRK', numeric: 191, name: 'Kuna', symbol: 'kn', minorUnit: 2 },
  HTG: { code: 'HTG', numeric: 332, name: 'Gourde', symbol: 'G', minorUnit: 2 },
  HUF: { code: 'HUF', numeric: 348, name: 'Forint', symbol: 'Ft', minorUnit: 2 },
  IDR: { code: 'IDR', numeric: 360, name: 'Rupiah', symbol: 'Rp', minorUnit: 2 },
  ILS: { code: 'ILS', numeric: 376, name: 'New Israeli Shekel', symbol: '₪', minorUnit: 2 },
  INR: { code: 'INR', numeric: 356, name: 'Indian Rupee', symbol: '₹', minorUnit: 2 },
  IQD: { code: 'IQD', numeric: 368, name: 'Iraqi Dinar', symbol: 'د.ع', minorUnit: 3 },
  IRR: { code: 'IRR', numeric: 364, name: 'Iranian Rial', symbol: '﷼', minorUnit: 2 },
  ISK: { code: 'ISK', numeric: 352, name: 'Iceland Krona', symbol: 'kr', minorUnit: 0 },
  JMD: { code: 'JMD', numeric: 388, name: 'Jamaican Dollar', symbol: '$', minorUnit: 2 },
  JOD: { code: 'JOD', numeric: 400, name: 'Jordanian Dinar', symbol: 'د.ا', minorUnit: 3 },
  JPY: { code: 'JPY', numeric: 392, name: 'Japanese Yen', symbol: '¥', minorUnit: 0 },
  KES: { code: 'KES', numeric: 404, name: 'Kenyan Shilling', symbol: 'KSh', minorUnit: 2 },
  KGS: { code: 'KGS', numeric: 417, name: 'Som', symbol: 'сом', minorUnit: 2 },
  KHR: { code: 'KHR', numeric: 116, name: 'Riel', symbol: '៛', minorUnit: 2 },
  KMF: { code: 'KMF', numeric: 174, name: 'Comorian Franc', symbol: 'CF', minorUnit: 0 },
  KPW: { code: 'KPW', numeric: 408, name: 'North Korean Won', symbol: '₩', minorUnit: 2 },
  KRW: { code: 'KRW', numeric: 410, name: 'South Korean Won', symbol: '₩', minorUnit: 0 },
  KWD: { code: 'KWD', numeric: 414, name: 'Kuwaiti Dinar', symbol: 'د.ك', minorUnit: 3 },
  KYD: { code: 'KYD', numeric: 136, name: 'Cayman Islands Dollar', symbol: '$', minorUnit: 2 },
  KZT: { code: 'KZT', numeric: 398, name: 'Tenge', symbol: '₸', minorUnit: 2 },
  LAK: { code: 'LAK', numeric: 418, name: 'Lao Kip', symbol: '₭', minorUnit: 2 },
  LBP: { code: 'LBP', numeric: 422, name: 'Lebanese Pound', symbol: 'ل.ل', minorUnit: 2 },
  LKR: { code: 'LKR', numeric: 144, name: 'Sri Lanka Rupee', symbol: 'Rs', minorUnit: 2 },
  LRD: { code: 'LRD', numeric: 430, name: 'Liberian Dollar', symbol: '$', minorUnit: 2 },
  LSL: { code: 'LSL', numeric: 426, name: 'Loti', symbol: 'L', minorUnit: 2 },
  LYD: { code: 'LYD', numeric: 434, name: 'Libyan Dinar', symbol: 'ل.د', minorUnit: 3 },
  MAD: { code: 'MAD', numeric: 504, name: 'Moroccan Dirham', symbol: 'د.م.', minorUnit: 2 },
  MDL: { code: 'MDL', numeric: 498, name: 'Moldovan Leu', symbol: 'L', minorUnit: 2 },
  MGA: { code: 'MGA', numeric: 969, name: 'Malagasy Ariary', symbol: 'Ar', minorUnit: 2 },
  MKD: { code: 'MKD', numeric: 807, name: 'Denar', symbol: 'ден', minorUnit: 2 },
  MMK: { code: 'MMK', numeric: 104, name: 'Kyat', symbol: 'Ks', minorUnit: 2 },
  MNT: { code: 'MNT', numeric: 496, name: 'Tugrik', symbol: '₮', minorUnit: 2 },
  MOP: { code: 'MOP', numeric: 446, name: 'Pataca', symbol: 'MOP$', minorUnit: 2 },
  MRU: { code: 'MRU', numeric: 929, name: 'Ouguiya', symbol: 'UM', minorUnit: 2 },
  MUR: { code: 'MUR', numeric: 480, name: 'Mauritius Rupee', symbol: '₨', minorUnit: 2 },
  MVR: { code: 'MVR', numeric: 462, name: 'Rufiyaa', symbol: 'Rf', minorUnit: 2 },
  MWK: { code: 'MWK', numeric: 454, name: 'Malawi Kwacha', symbol: 'MK', minorUnit: 2 },
  MXN: { code: 'MXN', numeric: 484, name: 'Mexican Peso', symbol: '$', minorUnit: 2 },
  MXV: { code: 'MXV', numeric: 979, name: 'Mexican Unidad de Inversion', symbol: 'MXV', minorUnit: 2 },
  MYR: { code: 'MYR', numeric: 458, name: 'Malaysian Ringgit', symbol: 'RM', minorUnit: 2 },
  MZN: { code: 'MZN', numeric: 943, name: 'Mozambique Metical', symbol: 'MT', minorUnit: 2 },
  NAD: { code: 'NAD', numeric: 516, name: 'Namibia Dollar', symbol: '$', minorUnit: 2 },
  NGN: { code: 'NGN', numeric: 566, name: 'Naira', symbol: '₦', minorUnit: 2 },
  NIO: { code: 'NIO', numeric: 558, name: 'Cordoba Oro', symbol: 'C$', minorUnit: 2 },
  NOK: { code: 'NOK', numeric: 578, name: 'Norwegian Krone', symbol: 'kr', minorUnit: 2 },
  NPR: { code: 'NPR', numeric: 524, name: 'Nepalese Rupee', symbol: 'Rs', minorUnit: 2 },
  NZD: { code: 'NZD', numeric: 554, name: 'New Zealand Dollar', symbol: '$', minorUnit: 2 },
  OMR: { code: 'OMR', numeric: 512, name: 'Rial Omani', symbol: 'ر.ع.', minorUnit: 3 },
  PAB: { code: 'PAB', numeric: 590, name: 'Balboa', symbol: 'B/.', minorUnit: 2 },
  PEN: { code: 'PEN', numeric: 604, name: 'Sol', symbol: 'S/', minorUnit: 2 },
  PGK: { code: 'PGK', numeric: 598, name: 'Kina', symbol: 'K', minorUnit: 2 },
  PHP: { code: 'PHP', numeric: 608, name: 'Philippine Peso', symbol: '₱', minorUnit: 2 },
  PKR: { code: 'PKR', numeric: 586, name: 'Pakistan Rupee', symbol: 'Rs', minorUnit: 2 },
  PLN: { code: 'PLN', numeric: 985, name: 'Zloty', symbol: 'zł', minorUnit: 2 },
  PYG: { code: 'PYG', numeric: 600, name: 'Guarani', symbol: '₲', minorUnit: 0 },
  QAR: { code: 'QAR', numeric: 634, name: 'Qatari Rial', symbol: 'ر.ق', minorUnit: 2 },
  RON: { code: 'RON', numeric: 946, name: 'Romanian Leu', symbol: 'lei', minorUnit: 2 },
  RSD: { code: 'RSD', numeric: 941, name: 'Serbian Dinar', symbol: 'дин.', minorUnit: 2 },
  RUB: { code: 'RUB', numeric: 643, name: 'Russian Ruble', symbol: '₽', minorUnit: 2 },
  RWF: { code: 'RWF', numeric: 646, name: 'Rwanda Franc', symbol: 'FRw', minorUnit: 0 },
  SAR: { code: 'SAR', numeric: 682, name: 'Saudi Riyal', symbol: '﷼', minorUnit: 2 },
  SBD: { code: 'SBD', numeric: 90, name: 'Solomon Islands Dollar', symbol: '$', minorUnit: 2 },
  SCR: { code: 'SCR', numeric: 690, name: 'Seychelles Rupee', symbol: '₨', minorUnit: 2 },
  SDG: { code: 'SDG', numeric: 938, name: 'Sudanese Pound', symbol: '£', minorUnit: 2 },
  SEK: { code: 'SEK', numeric: 752, name: 'Swedish Krona', symbol: 'kr', minorUnit: 2 },
  SGD: { code: 'SGD', numeric: 702, name: 'Singapore Dollar', symbol: '$', minorUnit: 2 },
  SHP: { code: 'SHP', numeric: 654, name: 'Saint Helena Pound', symbol: '£', minorUnit: 2 },
  SLE: { code: 'SLE', numeric: 925, name: 'Leone', symbol: 'Le', minorUnit: 2 },
  SOS: { code: 'SOS', numeric: 706, name: 'Somali Shilling', symbol: 'Sh', minorUnit: 2 },
  SRD: { code: 'SRD', numeric: 968, name: 'Surinam Dollar', symbol: '$', minorUnit: 2 },
  SSP: { code: 'SSP', numeric: 728, name: 'South Sudanese Pound', symbol: '£', minorUnit: 2 },
  STN: { code: 'STN', numeric: 930, name: 'Dobra', symbol: 'Db', minorUnit: 2 },
  SVC: { code: 'SVC', numeric: 222, name: 'El Salvador Colon', symbol: '₡', minorUnit: 2 },
  SYP: { code: 'SYP', numeric: 760, name: 'Syrian Pound', symbol: '£', minorUnit: 2 },
  SZL: { code: 'SZL', numeric: 748, name: 'Lilangeni', symbol: 'L', minorUnit: 2 },
  THB: { code: 'THB', numeric: 764, name: 'Thai Baht', symbol: '฿', minorUnit: 2 },
  TJS: { code: 'TJS', numeric: 972, name: 'Somoni', symbol: 'SM', minorUnit: 2 },
  TMT: { code: 'TMT', numeric: 934, name: 'Turkmenistan New Manat', symbol: 'm', minorUnit: 2 },
  TND: { code: 'TND', numeric: 788, name: 'Tunisian Dinar', symbol: 'د.ت', minorUnit: 3 },
  TOP: { code: 'TOP', numeric: 776, name: 'Paanga', symbol: 'T$', minorUnit: 2 },
  TRY: { code: 'TRY', numeric: 949, name: 'Turkish Lira', symbol: '₺', minorUnit: 2 },
  TTD: { code: 'TTD', numeric: 780, name: 'Trinidad and Tobago Dollar', symbol: '$', minorUnit: 2 },
  TWD: { code: 'TWD', numeric: 901, name: 'New Taiwan Dollar', symbol: 'NT$', minorUnit: 2 },
  TZS: { code: 'TZS', numeric: 834, name: 'Tanzanian Shilling', symbol: 'TSh', minorUnit: 2 },
  UAH: { code: 'UAH', numeric: 980, name: 'Hryvnia', symbol: '₴', minorUnit: 2 },
  UGX: { code: 'UGX', numeric: 800, name: 'Uganda Shilling', symbol: 'USh', minorUnit: 0 },
  USD: { code: 'USD', numeric: 840, name: 'US Dollar', symbol: '$', minorUnit: 2 },
  USN: { code: 'USN', numeric: 997, name: 'US Dollar (Next day)', symbol: 'USN', minorUnit: 2 },
  UYI: { code: 'UYI', numeric: 940, name: 'Uruguay Peso en Unidades Indexadas', symbol: 'UYI', minorUnit: 0 },
  UYU: { code: 'UYU', numeric: 858, name: 'Peso Uruguayo', symbol: '$', minorUnit: 2 },
  UYW: { code: 'UYW', numeric: 927, name: 'Unidad Previsional', symbol: 'UYW', minorUnit: 4 },
  UZS: { code: 'UZS', numeric: 860, name: 'Uzbekistan Sum', symbol: 'сўм', minorUnit: 2 },
  VED: { code: 'VED', numeric: 926, name: 'Bolivar Soberano', symbol: 'Bs.', minorUnit: 2 },
  VES: { code: 'VES', numeric: 928, name: 'Bolivar Soberano (Old)', symbol: 'Bs.', minorUnit: 2 },
  VND: { code: 'VND', numeric: 704, name: 'Dong', symbol: '₫', minorUnit: 0 },
  VUV: { code: 'VUV', numeric: 548, name: 'Vatu', symbol: 'VT', minorUnit: 0 },
  WST: { code: 'WST', numeric: 882, name: 'Tala', symbol: 'T', minorUnit: 2 },
  XAF: { code: 'XAF', numeric: 950, name: 'CFA Franc BEAC', symbol: 'FCFA', minorUnit: 0 },
  XAG: { code: 'XAG', numeric: 961, name: 'Silver', symbol: 'XAG', minorUnit: 0 },
  XAU: { code: 'XAU', numeric: 959, name: 'Gold', symbol: 'XAU', minorUnit: 0 },
  XCD: { code: 'XCD', numeric: 951, name: 'East Caribbean Dollar', symbol: '$', minorUnit: 2 },
  XDR: { code: 'XDR', numeric: 960, name: 'SDR (Special Drawing Right)', symbol: 'XDR', minorUnit: 0 },
  XOF: { code: 'XOF', numeric: 952, name: 'CFA Franc BCEAO', symbol: 'FCFA', minorUnit: 0 },
  XPF: { code: 'XPF', numeric: 953, name: 'CFP Franc', symbol: '₣', minorUnit: 0 },
  XSU: { code: 'XSU', numeric: 994, name: 'Sucre', symbol: 'XSU', minorUnit: 0 },
  XUA: { code: 'XUA', numeric: 965, name: 'ADB Unit of Account', symbol: 'XUA', minorUnit: 0 },
  YER: { code: 'YER', numeric: 886, name: 'Yemeni Rial', symbol: '﷼', minorUnit: 2 },
  ZAR: { code: 'ZAR', numeric: 710, name: 'Rand', symbol: 'R', minorUnit: 2 },
  ZMW: { code: 'ZMW', numeric: 967, name: 'Zambian Kwacha', symbol: 'ZK', minorUnit: 2 },
  ZWL: { code: 'ZWL', numeric: 932, name: 'Zimbabwe Dollar', symbol: '$', minorUnit: 2 },
};

/** Sorted array of all currencies for UI dropdowns/lists */
export const CURRENCY_LIST: CurrencyInfo[] = Object.values(CURRENCIES)
  .sort((a, b) => a.code.localeCompare(b.code));

/** Set of all valid currency codes for quick lookup */
export const VALID_CURRENCY_CODES = new Set(Object.keys(CURRENCIES));

/**
 * Check if a currency code is valid according to ISO 4217 data.
 * Case-insensitive — input is normalized to uppercase.
 */
export function isValidCurrencyCode(code: string): boolean {
  return VALID_CURRENCY_CODES.has(code.toUpperCase().trim());
}

/**
 * Get full CurrencyInfo for a given currency code.
 * Returns undefined if the code is not found.
 * Case-insensitive — input is normalized to uppercase.
 */
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCIES[code.toUpperCase().trim()];
}
