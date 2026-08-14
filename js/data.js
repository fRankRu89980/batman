// ============================================================
//  DATI — Volumi e tavole. Gli indici di partenza sono DERIVATI
//  dai conteggi (niente numeri magici: il bug "S4 → pagina 144"
//  della versione classica nasceva da un indice hardcodato).
// ============================================================

export const STORAGE_PREFIX = "comic-reader-deco:";

export const VOLUMES = [
  {
    code: "Vol. I",
    short: "S1",
    name: "L'estate prolungata",
    folder: "Batman 1 - L'estate prolungata",
    pages: 44
  },
  {
    code: "Vol. II",
    short: "S2",
    name: "L'inverno sta arrivando",
    folder: "Batman 2 - L'inverno sta arrivando",
    pages: 53
  },
  {
    code: "Vol. III",
    short: "S3",
    name: "L'Abisso",
    folder: "Batman 3 - L'abisso",
    pages: 48
  },
  {
    code: "Vol. IV",
    short: "S4",
    name: "A Million Miles From Home",
    folder: "Batman 4 - A Million Miles From Home",
    pages: 54
  },
  {
    code: "Vol. V",
    short: "S5",
    name: "Batman Dimension",
    folder: "Batman 5 - Batman Dimension",
    pages: 7
  }
];

// Elenco piatto delle tavole: ogni voce conosce il proprio volume.
export const PAGES = VOLUMES.flatMap((volume, volumeIndex) =>
  Array.from({ length: volume.pages }, (_, i) => ({
    src: encodeURI(`./tavole/${volume.folder}/PG${i}.jpeg`),
    volumeIndex
  }))
);

// Indice (0-based) della prima tavola di ogni volume, calcolato.
export const VOLUME_STARTS = VOLUMES.reduce((starts, volume, i) => {
  starts.push(i === 0 ? 0 : starts[i - 1] + VOLUMES[i - 1].pages);
  return starts;
}, []);

export const TOTAL_PAGES = PAGES.length;

export function volumeForPage(index) {
  const clamped = Math.max(0, Math.min(index, TOTAL_PAGES - 1));
  return PAGES[clamped].volumeIndex;
}

// Storage sicuro: in navigazione privata o con quota piena
// localStorage può lanciare — mai far cadere l'app per questo.
export function storageGet(key) {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

export function storageSet(key, value) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    /* silenzioso: la persistenza è un extra, non un requisito */
  }
}
