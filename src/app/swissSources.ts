export type SwissSectionKey = 'stealth' | 'changed_job' | 'less_1_year' | '1_to_2_years';

export interface SwissSectionConfig {
  key: SwissSectionKey;
  label: string;
  badge: string;
  description: string;
  searchUrl: string;
}

export const SWISS_SECTIONS: SwissSectionConfig[] = [
  {
    key: 'stealth',
    label: 'Stealth',
    badge: '🥷 Stealth',
    description: 'Founders and Builders building stealth ventures in Switzerland and Europe.',
    searchUrl: 'https://www.linkedin.com/sales/search/people?query=(recentSearchParam%3A(id%3A5814462402%2CdoLogHistory%3Atrue)%2Cfilters%3AList((type%3ASCHOOL%2Cvalues%3AList((id%3A3883%2Ctext%3AEPFL%2CselectionType%3AINCLUDED)%2C(id%3A4923%2Ctext%3AETH%2520Z%25C3%25BCrich%2CselectionType%3AINCLUDED)%2C(id%3A166673%2Ctext%3AUniversity%2520of%2520St.Gallen%2CselectionType%3AINCLUDED)))%2C(type%3APAST_COMPANY%2Cvalues%3AList((id%3Aurn%253Ali%253AsalesList%253A7491478847436062720%2Ctext%3ATop%2520-%2520AI%2520Lab%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491478953459834881%2Ctext%3ATop%2520-%2520Hyped%2520Startup%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479009839669248%2Ctext%3ATop%2520-%2520Unicorn%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479072645177344%2Ctext%3ATop%2520-%2520Consulting%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479155986001920%2Ctext%3ATop%2520-%2520Finance%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479247774150656%2Ctext%3ATop%2520-%2520Big%2520Tech%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479373976563712%2Ctext%3ATop%2520-%2520Research%2520Org%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479496030810112%2Ctext%3ATop%2520-%2520University%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)))%2C(type%3ACURRENT_TITLE%2Cvalues%3AList((text%3AFounder%2CselectionType%3AINCLUDED)%2C(text%3ACo-Founder%2CselectionType%3AINCLUDED)%2C(text%3ACEO%2CselectionType%3AINCLUDED)%2C(text%3ABuilding%2CselectionType%3AINCLUDED)%2C(text%3ABuilder%2CselectionType%3AINCLUDED)))%2C(type%3ACURRENT_COMPANY%2Cvalues%3AList((id%3Aurn%253Ali%253AsalesList%253A7491480112702554112%2Ctext%3AStealth%2520Companies%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)))))'
  },
  {
    key: 'changed_job',
    label: 'Changed Job',
    badge: '🕐 Changed Job',
    description: 'Swiss alumni from Top Labs & Unicorns who recently joined an early-stage team (1-10 headcount).',
    searchUrl: 'https://www.linkedin.com/sales/search/people?query=(recentSearchParam%3A(id%3A5814462402%2CdoLogHistory%3Atrue)%2Cfilters%3AList((type%3ASCHOOL%2Cvalues%3AList((id%3A3883%2Ctext%3AEPFL%2CselectionType%3AINCLUDED)%2C(id%3A4923%2Ctext%3AETH%2520Z%25C3%25BCrich%2CselectionType%3AINCLUDED)%2C(id%3A166673%2Ctext%3AUniversity%2520of%2520St.Gallen%2CselectionType%3AINCLUDED)))%2C(type%3APAST_COMPANY%2Cvalues%3AList((id%3Aurn%253Ali%253AsalesList%253A7491478847436062720%2Ctext%3ATop%2520-%2520AI%2520Lab%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491478953459834881%2Ctext%3ATop%2520-%2520Hyped%2520Startup%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479009839669248%2Ctext%3ATop%2520-%2520Unicorn%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479072645177344%2Ctext%3ATop%2520-%2520Consulting%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479155986001920%2Ctext%3ATop%2520-%2520Finance%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479247774150656%2Ctext%3ATop%2520-%2520Big%2520Tech%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479373976563712%2Ctext%3ATop%2520-%2520Research%2520Org%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479496030810112%2Ctext%3ATop%2520-%2520University%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)))%2C(type%3ACOMPANY_HEADCOUNT%2Cvalues%3AList((id%3AB%2Ctext%3A1-10%2CselectionType%3AINCLUDED)))%2C(type%3AREGION%2Cvalues%3AList((id%3A100506914%2Ctext%3AEurope%2CselectionType%3AINCLUDED)))%2C(type%3ASPOTTED%2Cvalues%3AList((id%3Achanged-jobs%2Ctext%3AChanged%2520jobs%2CselectionType%3AINCLUDED)))))'
  },
  {
    key: 'less_1_year',
    label: 'Less 1 year',
    badge: '1️⃣ < 1 Year',
    description: 'Swiss alumni from Top Labs & Unicorns with less than 1 year at an early venture (1-10 headcount).',
    searchUrl: 'https://www.linkedin.com/sales/search/people?query=(recentSearchParam%3A(id%3A5814462402%2CdoLogHistory%3Atrue)%2Cfilters%3AList((type%3ASCHOOL%2Cvalues%3AList((id%3A3883%2Ctext%3AEPFL%2CselectionType%3AINCLUDED)%2C(id%3A4923%2Ctext%3AETH%2520Z%25C3%25BCrich%2CselectionType%3AINCLUDED)%2C(id%3A166673%2Ctext%3AUniversity%2520of%2520St.Gallen%2CselectionType%3AINCLUDED)))%2C(type%3APAST_COMPANY%2Cvalues%3AList((id%3Aurn%253Ali%253AsalesList%253A7491478847436062720%2Ctext%3ATop%2520-%2520AI%2520Lab%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491478953459834881%2Ctext%3ATop%2520-%2520Hyped%2520Startup%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479009839669248%2Ctext%3ATop%2520-%2520Unicorn%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479072645177344%2Ctext%3ATop%2520-%2520Consulting%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479155986001920%2Ctext%3ATop%2520-%2520Finance%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479247774150656%2Ctext%3ATop%2520-%2520Big%2520Tech%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479373976563712%2Ctext%3ATop%2520-%2520Research%2520Org%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479496030810112%2Ctext%3ATop%2520-%2520University%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)))%2C(type%3ACOMPANY_HEADCOUNT%2Cvalues%3AList((id%3AB%2Ctext%3A1-10%2CselectionType%3AINCLUDED)))%2C(type%3AREGION%2Cvalues%3AList((id%3A100506914%2Ctext%3AEurope%2CselectionType%3AINCLUDED)))%2C(type%3AYEARS_AT_CURRENT_COMPANY%2Cvalues%3AList((id%3A1%2Ctext%3ALess%2520than%25201%2520year%2CselectionType%3AINCLUDED)))))'
  },
  {
    key: '1_to_2_years',
    label: '1 to 2 years',
    badge: '2️⃣ 1-2 Years',
    description: 'Swiss alumni from Top Labs & Unicorns with 1-2 years tenure in an early venture (1-10 headcount).',
    searchUrl: 'https://www.linkedin.com/sales/search/people?query=(recentSearchParam%3A(id%3A5814462402%2CdoLogHistory%3Atrue)%2Cfilters%3AList((type%3ASCHOOL%2Cvalues%3AList((id%3A3883%2Ctext%3AEPFL%2CselectionType%3AINCLUDED)%2C(id%3A4923%2Ctext%3AETH%2520Z%25C3%25BCrich%2CselectionType%3AINCLUDED)%2C(id%3A166673%2Ctext%3AUniversity%2520of%2520St.Gallen%2CselectionType%3AINCLUDED)))%2C(type%3APAST_COMPANY%2Cvalues%3AList((id%3Aurn%253Ali%253AsalesList%253A7491478847436062720%2Ctext%3ATop%2520-%2520AI%2520Lab%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491478953459834881%2Ctext%3ATop%2520-%2520Hyped%2520Startup%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479009839669248%2Ctext%3ATop%2520-%2520Unicorn%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479072645177344%2Ctext%3ATop%2520-%2520Consulting%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479155986001920%2Ctext%3ATop%2520-%2520Finance%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479247774150656%2Ctext%3ATop%2520-%2520Big%2520Tech%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479373976563712%2Ctext%3ATop%2520-%2520Research%2520Org%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)%2C(id%3Aurn%253Ali%253AsalesList%253A7491479496030810112%2Ctext%3ATop%2520-%2520University%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A1)%2Cicon%3Alist)))%2C(type%3ACOMPANY_HEADCOUNT%2Cvalues%3AList((id%3AB%2Ctext%3A1-10%2CselectionType%3AINCLUDED)))%2C(type%3AREGION%2Cvalues%3AList((id%3A100506914%2Ctext%3AEurope%2CselectionType%3AINCLUDED)))%2C(type%3AYEARS_AT_CURRENT_COMPANY%2Cvalues%3AList((id%3A2%2Ctext%3A1%2520to%25202%2520years%2CselectionType%3AINCLUDED)))))'
  }
];

export function getSectionFromUrl(url?: string): SwissSectionKey {
  if (!url) return 'stealth';
  for (const sec of SWISS_SECTIONS) {
    if (url === sec.searchUrl || url.includes(sec.key)) return sec.key;
  }
  if (url.includes('Stealth%2520Companies') || url.includes('Stealth Companies')) return 'stealth';
  if (url.includes('changed-jobs')) return 'changed_job';
  if (url.includes('YEARS_AT_CURRENT_COMPANY%2Cvalues%3AList((id%3A1')) return 'less_1_year';
  if (url.includes('YEARS_AT_CURRENT_COMPANY%2Cvalues%3AList((id%3A2')) return '1_to_2_years';
  return 'stealth';
}
