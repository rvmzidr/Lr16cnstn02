import type { LocalizedCopy } from '../services/site-preferences.service';

export type CuratedArticle = {
  id: string;
  title: LocalizedCopy;
  summary: LocalizedCopy;
  source: LocalizedCopy;
  link: string;
  category: LocalizedCopy;
  year: number;
};

export type LocalizedCuratedArticle = {
  id: string;
  title: string;
  summary: string;
  source: string;
  link: string;
  category: string;
  year: number;
};

export function localizeCuratedArticle(
  article: CuratedArticle,
  localize: (copy: LocalizedCopy) => string,
): LocalizedCuratedArticle {
  return {
    id: article.id,
    title: localize(article.title),
    summary: localize(article.summary),
    source: localize(article.source),
    link: article.link,
    category: localize(article.category),
    year: article.year,
  };
}

// Curated references are manually written summaries of high-impact themes.
export const curatedArticles: CuratedArticle[] = [
  {
    id: 'curated-smr-safety-2025',
    title: {
      fr: 'Surete des petits reacteurs modulaires pour un mix energetique resilient',
      en: 'Small modular reactor safety for a resilient energy mix',
      es: 'Seguridad de pequenos reactores modulares para una matriz energetica resiliente',
      de: 'Sicherheit kleiner modularer Reaktoren fuer einen resilienten Energiemix',
      it: 'Sicurezza dei piccoli reattori modulari per un mix energetico resiliente',
    },
    summary: {
      fr: 'Synthese des approches recentes en defense en profondeur, supervision numerique et qualification des materiaux pour les filieres SMR.',
      en: 'Synthesis of recent approaches in defense-in-depth, digital monitoring, and material qualification for SMR pathways.',
      es: 'Sintesis de enfoques recientes sobre defensa en profundidad, supervision digital y calificacion de materiales para tecnologias SMR.',
      de: 'Uebersicht aktueller Ansaetze zu Tiefenverteidigung, digitaler Ueberwachung und Materialqualifizierung fuer SMR-Konzepte.',
      it: 'Sintesi degli approcci recenti su difesa in profondita, monitoraggio digitale e qualificazione dei materiali per soluzioni SMR.',
    },
    source: {
      fr: 'AIEA - Serie Energie Nucleaire',
      en: 'IAEA - Nuclear Energy Series',
      es: 'OIEA - Serie de Energia Nuclear',
      de: 'IAEO - Reihe Kernenergie',
      it: 'AIEA - Serie Energia Nucleare',
    },
    link: 'https://www.iaea.org/topics/small-modular-reactors',
    category: {
      fr: 'ENERGIE',
      en: 'ENERGY',
      es: 'ENERGIA',
      de: 'ENERGIE',
      it: 'ENERGIA',
    },
    year: 2025,
  },
  {
    id: 'curated-radiopharma-2025',
    title: {
      fr: 'Production locale de radioisotopes medicaux et securisation de la chaine clinique',
      en: 'Local production of medical radioisotopes and clinical supply chain resilience',
      es: 'Produccion local de radioisotopos medicos y seguridad de la cadena clinica',
      de: 'Lokale Produktion medizinischer Radioisotope und sichere klinische Lieferkette',
      it: 'Produzione locale di radioisotopi medici e sicurezza della filiera clinica',
    },
    summary: {
      fr: "Etat de l'art sur la production de Lu-177, Ac-225 et autres isotopes therapeutiques, avec focus sur qualite, tracabilite et acces patient.",
      en: 'State-of-the-art review on Lu-177, Ac-225 and other therapeutic isotopes with focus on quality, traceability, and patient access.',
      es: 'Revision del estado del arte sobre Lu-177, Ac-225 y otros isotopos terapeuticos, con foco en calidad, trazabilidad y acceso del paciente.',
      de: 'Ueberblick zu Lu-177, Ac-225 und weiteren therapeutischen Isotopen mit Fokus auf Qualitaet, Rueckverfolgbarkeit und Patientenzugang.',
      it: 'Panoramica su Lu-177, Ac-225 e altri isotopi terapeutici con focus su qualita, tracciabilita e accesso del paziente.',
    },
    source: {
      fr: 'AIEA - Sante Humaine',
      en: 'IAEA - Human Health',
      es: 'OIEA - Salud Humana',
      de: 'IAEO - Menschliche Gesundheit',
      it: 'AIEA - Salute Umana',
    },
    link: 'https://www.iaea.org/topics/radiopharmaceuticals',
    category: {
      fr: 'RADIOCHIMIE',
      en: 'RADIOCHEMISTRY',
      es: 'RADIOQUIMICA',
      de: 'RADIOCHEMIE',
      it: 'RADIOCHIMICA',
    },
    year: 2025,
  },
  {
    id: 'curated-neutron-activation-2024',
    title: {
      fr: 'Analyse par activation neutronique pour la securite alimentaire et environnementale',
      en: 'Neutron activation analysis for food and environmental safety',
      es: 'Analisis por activacion neutronica para seguridad alimentaria y ambiental',
      de: 'Neutronenaktivierungsanalyse fuer Lebensmittel- und Umweltsicherheit',
      it: 'Analisi per attivazione neutronica per sicurezza alimentare e ambientale',
    },
    summary: {
      fr: 'Applications de la NAA pour detecter traces metalliques et contaminants dans les matrices complexes, avec protocoles de validation inter-laboratoires.',
      en: 'NAA applications to detect metal traces and contaminants in complex matrices using inter-laboratory validation protocols.',
      es: 'Aplicaciones de NAA para detectar trazas metalicas y contaminantes en matrices complejas con protocolos de validacion interlaboratorio.',
      de: 'Anwendungen der NAA zur Detektion von Metallspuren und Kontaminanten in komplexen Matrizen mit interlaborativen Validierungsprotokollen.',
      it: 'Applicazioni NAA per rilevare tracce metalliche e contaminanti in matrici complesse con protocolli di validazione interlaboratorio.',
    },
    source: {
      fr: 'Journal of Radioanalytical and Nuclear Chemistry',
      en: 'Journal of Radioanalytical and Nuclear Chemistry',
      es: 'Journal of Radioanalytical and Nuclear Chemistry',
      de: 'Journal of Radioanalytical and Nuclear Chemistry',
      it: 'Journal of Radioanalytical and Nuclear Chemistry',
    },
    link: 'https://link.springer.com/journal/10967',
    category: {
      fr: 'RADIO_ANALYSE',
      en: 'RADIOANALYSIS',
      es: 'RADIOANALISIS',
      de: 'RADIOANALYSE',
      it: 'RADIOANALISI',
    },
    year: 2024,
  },
  {
    id: 'curated-dosimetry-ai-2025',
    title: {
      fr: 'Dosimetrie intelligente assistee par IA pour environnements a risque',
      en: 'AI-assisted intelligent dosimetry for high-risk environments',
      es: 'Dosimetria inteligente asistida por IA para entornos de riesgo',
      de: 'KI-gestuetzte intelligente Dosimetrie fuer Risikoumgebungen',
      it: 'Dosimetria intelligente assistita da IA per ambienti a rischio',
    },
    summary: {
      fr: 'Revue des modeles IA hybrides combines a des capteurs multi-sources pour estimer les doses en temps reel et ameliorer la decision operationnelle.',
      en: 'Review of hybrid AI models combined with multi-source sensors to estimate real-time doses and improve operational decisions.',
      es: 'Revision de modelos hibridos de IA combinados con sensores multisource para estimar dosis en tiempo real y mejorar decisiones operativas.',
      de: 'Ueberblick ueber hybride KI-Modelle mit Multi-Source-Sensorik zur Echtzeit-Dosisabschaetzung und besseren operativen Entscheidungen.',
      it: 'Rassegna di modelli IA ibridi combinati con sensori multi-sorgente per stimare dosi in tempo reale e migliorare le decisioni operative.',
    },
    source: {
      fr: 'Radiation Measurements',
      en: 'Radiation Measurements',
      es: 'Radiation Measurements',
      de: 'Radiation Measurements',
      it: 'Radiation Measurements',
    },
    link: 'https://www.sciencedirect.com/journal/radiation-measurements',
    category: {
      fr: 'DOSIMETRIE',
      en: 'DOSIMETRY',
      es: 'DOSIMETRIA',
      de: 'DOSIMETRIE',
      it: 'DOSIMETRIA',
    },
    year: 2025,
  },
  {
    id: 'curated-waste-materials-2024',
    title: {
      fr: 'Materiaux avances pour le confinement des dechets radioactifs a longue duree',
      en: 'Advanced materials for long-term radioactive waste confinement',
      es: 'Materiales avanzados para confinamiento de residuos radiactivos a largo plazo',
      de: 'Fortschrittliche Materialien zur Langzeit-Einschluss radioaktiver Abfaelle',
      it: 'Materiali avanzati per il confinamento a lungo termine dei rifiuti radioattivi',
    },
    summary: {
      fr: 'Panorama des verres, ceramiques et matrices composites pour le stockage geologique, avec analyses de durabilite et de corrosion acceleree.',
      en: 'Overview of glass, ceramic and composite matrices for geological storage with durability and accelerated corrosion analyses.',
      es: 'Panorama de vidrios, ceramicas y matrices compuestas para almacenamiento geologico con analisis de durabilidad y corrosion acelerada.',
      de: 'Ueberblick zu Glas-, Keramik- und Verbundmatrizen fuer geologische Endlagerung mit Dauerhaftigkeits- und Korrosionsanalysen.',
      it: 'Panoramica di vetri, ceramiche e matrici composite per stoccaggio geologico con analisi di durabilita e corrosione accelerata.',
    },
    source: {
      fr: 'Progress in Nuclear Energy',
      en: 'Progress in Nuclear Energy',
      es: 'Progress in Nuclear Energy',
      de: 'Progress in Nuclear Energy',
      it: 'Progress in Nuclear Energy',
    },
    link: 'https://www.sciencedirect.com/journal/progress-in-nuclear-energy',
    category: {
      fr: 'MATERIAUX',
      en: 'MATERIALS',
      es: 'MATERIALES',
      de: 'MATERIALIEN',
      it: 'MATERIALI',
    },
    year: 2024,
  },
  {
    id: 'curated-fusion-diagnostics-2025',
    title: {
      fr: 'Instrumentation de nouvelle generation pour diagnostics des plasmas de fusion',
      en: 'Next-generation instrumentation for fusion plasma diagnostics',
      es: 'Instrumentacion de nueva generacion para diagnostico de plasmas de fusion',
      de: 'Instrumentierung der naechsten Generation fuer Fusionsplasma-Diagnostik',
      it: 'Strumentazione di nuova generazione per diagnostica dei plasmi di fusione',
    },
    summary: {
      fr: 'Focus sur spectrometrie, detecteurs rapides et traitement signal robuste pour les grands instruments de recherche en fusion.',
      en: 'Focus on spectrometry, fast detectors, and robust signal processing for major fusion research facilities.',
      es: 'Enfoque en espectrometria, detectores rapidos y procesamiento robusto de senal para grandes instalaciones de investigacion en fusion.',
      de: 'Fokus auf Spektrometrie, schnelle Detektoren und robuste Signalverarbeitung fuer grosse Fusionsforschungsanlagen.',
      it: 'Focus su spettrometria, rivelatori rapidi e trattamento robusto del segnale per grandi impianti di ricerca sulla fusione.',
    },
    source: {
      fr: 'Nuclear Fusion',
      en: 'Nuclear Fusion',
      es: 'Nuclear Fusion',
      de: 'Nuclear Fusion',
      it: 'Nuclear Fusion',
    },
    link: 'https://iopscience.iop.org/journal/1741-4326',
    category: {
      fr: 'INSTRUMENTATION_NUCLEAIRE',
      en: 'NUCLEAR INSTRUMENTATION',
      es: 'INSTRUMENTACION_NUCLEAR',
      de: 'NUKLEARE_INSTRUMENTIERUNG',
      it: 'STRUMENTAZIONE_NUCLEARE',
    },
    year: 2025,
  },
];
