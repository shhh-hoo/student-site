const nodes = [
    { id: "alkane", label: "Alkane", group: "Hydrocarbons", x: 110, y: 140, w: 132, h: 56 },
    { id: "alkene", label: "Alkene", group: "Hydrocarbons", x: 110, y: 280, w: 132, h: 56 },
    { id: "diol", label: "Diol", group: "Hydrocarbons", x: 110, y: 420, w: 120, h: 52 },
    { id: "polymer", label: "Poly(alkene)", group: "Hydrocarbons", x: 110, y: 560, w: 148, h: 52 },
    { id: "halogenoalkane", label: "Halogenoalkane", group: "Halogen derivative", x: 360, y: 210, w: 160, h: 56 },
    { id: "alcohol-family", label: "Alcohols", group: "Alcohols", x: 610, y: 110, w: 124, h: 50 },
    { id: "alcohol-1", label: "1° alcohol", group: "Alcohols", x: 610, y: 240, w: 126, h: 52 },
    { id: "alcohol-2", label: "2° alcohol", group: "Alcohols", x: 610, y: 360, w: 126, h: 52 },
    { id: "alcohol-3", label: "3° alcohol", group: "Alcohols", x: 610, y: 480, w: 126, h: 52 },
    { id: "ketone", label: "Ketone", group: "Carbonyl / acid", x: 860, y: 170, w: 132, h: 56 },
    { id: "aldehyde", label: "Aldehyde", group: "Carbonyl / acid", x: 860, y: 310, w: 132, h: 56 },
    { id: "carboxylic-acid", label: "Carboxylic acid", group: "Carbonyl / acid", x: 860, y: 470, w: 160, h: 56 },
    { id: "ester", label: "Ester", group: "Carbonyl / acid", x: 860, y: 610, w: 116, h: 52 },
    { id: "amine", label: "Amine", group: "Nitrogen products", x: 1110, y: 140, w: 112, h: 52 },
    { id: "nitrile", label: "Nitrile", group: "Nitrogen products", x: 1110, y: 420, w: 120, h: 52 },
    { id: "hydroxynitrile", label: "Hydroxynitrile", group: "Nitrogen products", x: 1110, y: 560, w: 150, h: 52 },
  ],
  links = [
    {
      id: "alkane-to-halogenoalkane",
      from: "alkane",
      to: "halogenoalkane",
      label: "free-radical substitution",
      reagents: "halogen, UV light",
      summary: "Halogen atoms substitute for hydrogen atoms in an alkane.",
    },
    {
      id: "alkene-to-alkane",
      from: "alkene",
      to: "alkane",
      label: "hydrogenation",
      reagents: "H2, Pt / Ni, heat",
      summary: "Hydrogen adds across the C=C bond.",
    },
    {
      id: "alkene-to-halogenoalkane",
      from: "alkene",
      to: "halogenoalkane",
      label: "electrophilic addition of HX",
      reagents: "HX",
      summary: "A hydrogen halide adds across the C=C bond.",
    },
    {
      id: "alkene-to-alcohol-family",
      from: "alkene",
      to: "alcohol-family",
      label: "hydration",
      reagents: "steam, H3PO4 catalyst",
      summary: "Steam adds across the C=C bond to form an alcohol. The exact alcohol depends on the alkene structure.",
    },
    {
      id: "alkene-to-diol",
      from: "alkene",
      to: "diol",
      label: "oxidation with cold dilute KMnO4",
      reagents: "cold, dilute KMnO4",
      summary: "Mild oxidation of an alkene gives a diol.",
    },
    {
      id: "alkene-to-polymer",
      from: "alkene",
      to: "polymer",
      label: "addition polymerisation",
      reagents: "appropriate conditions / catalyst",
      summary: "Many alkene molecules join to form a polymer.",
    },
    {
      id: "halogenoalkane-to-alcohol-family",
      from: "halogenoalkane",
      to: "alcohol-family",
      label: "nucleophilic substitution with aqueous NaOH",
      reagents: "NaOH(aq), heat",
      summary: "Hydroxide ion replaces the halogen atom.",
    },
    {
      id: "halogenoalkane-to-alkene",
      from: "halogenoalkane",
      to: "alkene",
      label: "elimination with ethanolic NaOH",
      reagents: "NaOH(ethanol), heat",
      summary: "Elimination removes HX and reforms a double bond.",
    },
    {
      id: "halogenoalkane-to-amine",
      from: "halogenoalkane",
      to: "amine",
      label: "nucleophilic substitution with NH3",
      reagents: "NH3 in ethanol, heat, pressure",
      summary: "Ammonia substitutes for halogen to form a primary amine.",
    },
    {
      id: "halogenoalkane-to-nitrile",
      from: "halogenoalkane",
      to: "nitrile",
      label: "nucleophilic substitution with KCN",
      reagents: "KCN in ethanol, heat",
      summary: "Cyanide ion substitutes for halogen and extends the carbon chain by one carbon.",
    },
    {
      id: "alcohol-family-to-halogenoalkane",
      from: "alcohol-family",
      to: "halogenoalkane",
      label: "substitution of OH by halogen",
      reagents: "HX or PCl5 or SOCl2",
      summary: "The –OH group is replaced by halogen.",
    },
    {
      id: "alcohol-family-to-alkene",
      from: "alcohol-family",
      to: "alkene",
      label: "dehydration",
      reagents: "hot Al2O3 or conc. H2SO4",
      summary: "Water is eliminated from the alcohol to form an alkene.",
    },
    {
      id: "alcohol-family-to-ester",
      from: "alcohol-family",
      to: "ester",
      label: "esterification with carboxylic acid",
      reagents: "carboxylic acid, conc. H2SO4, heat",
      summary: "Alcohols react with carboxylic acids to form esters.",
    },
    {
      id: "alcohol-1-to-aldehyde",
      from: "alcohol-1",
      to: "aldehyde",
      label: "oxidation",
      reagents: "acidified K2Cr2O7, distillation",
      summary: "A primary alcohol is oxidised to an aldehyde if distilled.",
    },
    {
      id: "alcohol-2-to-ketone",
      from: "alcohol-2",
      to: "ketone",
      label: "oxidation",
      reagents: "acidified K2Cr2O7, heat",
      summary: "A secondary alcohol is oxidised to a ketone.",
    },
    {
      id: "aldehyde-to-alcohol-1",
      from: "aldehyde",
      to: "alcohol-1",
      label: "reduction with NaBH4",
      reagents: "NaBH4",
      summary: "Aldehydes are reduced to primary alcohols.",
    },
    {
      id: "ketone-to-alcohol-2",
      from: "ketone",
      to: "alcohol-2",
      label: "reduction with NaBH4",
      reagents: "NaBH4",
      summary: "Ketones are reduced to secondary alcohols.",
    },
    {
      id: "aldehyde-to-carboxylic-acid",
      from: "aldehyde",
      to: "carboxylic-acid",
      label: "oxidation",
      reagents: "acidified K2Cr2O7 or KMnO4",
      summary: "Aldehydes are readily oxidised to carboxylic acids.",
    },
    {
      id: "carboxylic-acid-to-alcohol-1",
      from: "carboxylic-acid",
      to: "alcohol-1",
      label: "reduction with LiAlH4",
      reagents: "LiAlH4",
      summary: "Carboxylic acids are reduced to primary alcohols.",
    },
    {
      id: "aldehyde-to-hydroxynitrile",
      from: "aldehyde",
      to: "hydroxynitrile",
      label: "nucleophilic addition of HCN",
      reagents: "HCN, KCN catalyst",
      summary: "HCN adds across the C=O bond to form a hydroxynitrile.",
    },
    {
      id: "ketone-to-hydroxynitrile",
      from: "ketone",
      to: "hydroxynitrile",
      label: "nucleophilic addition of HCN",
      reagents: "HCN, KCN catalyst",
      summary: "HCN adds across the C=O bond to form a hydroxynitrile.",
    },
    {
      id: "nitrile-to-carboxylic-acid",
      from: "nitrile",
      to: "carboxylic-acid",
      label: "hydrolysis",
      reagents: "dilute acid or alkali, heat",
      summary: "Hydrolysis converts a nitrile into a carboxylic acid.",
    },
    {
      id: "carboxylic-acid-to-ester",
      from: "carboxylic-acid",
      to: "ester",
      label: "esterification with alcohol",
      reagents: "alcohol, conc. H2SO4, heat",
      summary: "Carboxylic acids react with alcohols to form esters.",
    },
    {
      id: "ester-to-carboxylic-acid",
      from: "ester",
      to: "carboxylic-acid",
      label: "hydrolysis",
      reagents: "dilute acid or alkali, heat",
      summary: "Hydrolysis of an ester gives the acid-side product.",
    },
    {
      id: "ester-to-alcohol-family",
      from: "ester",
      to: "alcohol-family",
      label: "hydrolysis",
      reagents: "dilute acid or alkali, heat",
      summary: "Hydrolysis of an ester also gives the corresponding alcohol product.",
    },
  ],
  membershipLinks = [
    { id: "alcohols-family-1", from: "alcohol-family", to: "alcohol-1", label: "Class membership" },
    { id: "alcohols-family-2", from: "alcohol-family", to: "alcohol-2", label: "Class membership" },
    { id: "alcohols-family-3", from: "alcohol-family", to: "alcohol-3", label: "Class membership" },
  ],
  columnLabels = [
    { x: 110, label: "Hydrocarbons" },
    { x: 360, label: "Halogen derivative" },
    { x: 610, label: "Alcohols" },
    { x: 860, label: "Carbonyl / acid" },
    { x: 1110, label: "Nitrogen products" },
  ],
  nodeNotes = {
    alkane:
      "Keep alkane chemistry separate from alkene chemistry. The main route here is free-radical substitution to halogenoalkane.",
    alkene:
      "Main AS branch point: hydrogenation, electrophilic addition, hydration, oxidation to diol, and polymerisation.",
    diol: "Mild oxidation product of alkene with cold dilute KMnO4.",
    polymer: "Addition polymerisation product from alkene monomers.",
    halogenoalkane:
      "Decision node: aq NaOH gives alcohols, ethanolic NaOH gives alkene, NH3 gives amine, KCN gives nitrile.",
    "alcohol-family":
      "Family hub only. Use this for hydration, substitution, dehydration, esterification, and hydrolysis routes. Oxidation must be read through 1° / 2° / 3° alcohol classes below.",
    "alcohol-1": "Primary alcohol: can oxidise to aldehyde and can be made by reducing aldehydes or carboxylic acids.",
    "alcohol-2": "Secondary alcohol: oxidises to ketone and is made by reducing ketones.",
    "alcohol-3": "Tertiary alcohol: not oxidised under standard acidified dichromate conditions.",
    aldehyde:
      "Positive with Tollens' / Fehling's, easily oxidised, reducible to 1° alcohol, and forms hydroxynitriles.",
    ketone: "Not positive with Tollens' / Fehling's. Can be reduced to 2° alcohol and can form hydroxynitriles.",
    "carboxylic-acid": "Made by oxidation or nitrile hydrolysis. Can be reduced to 1° alcohol and can form esters.",
    ester:
      "Remember both directions: esterification from acid + alcohol, and hydrolysis back to acid-side and alcohol-side products.",
    amine: "AS nitrogen compound made from halogenoalkanes with ammonia in ethanol under heat and pressure.",
    nitrile: "AS chain-extension route from halogenoalkanes using KCN in ethanol and heat.",
    hydroxynitrile: "AS carbonyl addition product formed from aldehydes or ketones using HCN with KCN catalyst.",
  },
  theme = {
    Hydrocarbons: ["#fdf4ff", "#f0abfc", "#86198f"],
    "Halogen derivative": ["#fffbeb", "#fcd34d", "#92400e"],
    Alcohols: ["#f0f9ff", "#7dd3fc", "#075985"],
    "Carbonyl / acid": ["#fff7ed", "#fdba74", "#9a3412"],
    "Nitrogen products": ["#ecfdf5", "#86efac", "#14532d"],
  };
const nodeMap = new Map(nodes.map(n => [n.id, n]));
const desktopNodeLayout = new Map(nodes.map(({ id, x, y }) => [id, { x, y }]));
const mobileNodeLayout = new Map([
  ["alkane", { x: 130, y: 130 }],
  ["alkene", { x: 130, y: 260 }],
  ["diol", { x: 130, y: 390 }],
  ["polymer", { x: 130, y: 520 }],
  ["halogenoalkane", { x: 360, y: 260 }],
  ["alcohol-family", { x: 260, y: 660 }],
  ["alcohol-1", { x: 145, y: 790 }],
  ["alcohol-2", { x: 260, y: 900 }],
  ["alcohol-3", { x: 375, y: 790 }],
  ["ketone", { x: 145, y: 1050 }],
  ["aldehyde", { x: 375, y: 1050 }],
  ["carboxylic-acid", { x: 260, y: 1190 }],
  ["ester", { x: 260, y: 1330 }],
  ["amine", { x: 360, y: 390 }],
  ["nitrile", { x: 420, y: 660 }],
  ["hydroxynitrile", { x: 410, y: 1330 }],
]);
const mobileColumnLabels = [
  { label: "Hydrocarbons / halogen derivative", x: 32, y: 58, orientation: "horizontal" },
  { label: "Alcohols", x: 32, y: 585, orientation: "horizontal" },
  { label: "Carbonyl / acid", x: 32, y: 985, orientation: "horizontal" },
  { label: "Nitrogen products", x: 32, y: 1255, orientation: "horizontal" },
];
const mobileDiagramMedia = window.matchMedia("(max-width: 720px)");
let selectedNodeId = "alkene",
  selectedLinkId = "alkene-to-alcohol-family",
  viewMode = "diagram",
  quizInput = "",
  quizFeedback = "";
function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function svgEl(n, a = {}, c = []) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", n);
  Object.entries(a).forEach(([k, v]) => {
    if (k === "textContent") e.textContent = v;
    else e.setAttribute(k, v);
  });
  c.forEach(x => e.appendChild(x));
  return e;
}
function getTheme(n) {
  return theme[n.group] || ["#fff", "#d6d3d1", "#292524"];
}
function edge(n, s) {
  if (s === "left") return { x: n.x - n.w / 2, y: n.y };
  if (s === "right") return { x: n.x + n.w / 2, y: n.y };
  if (s === "top") return { x: n.x, y: n.y - n.h / 2 };
  return { x: n.x, y: n.y + n.h / 2 };
}
function clean(p) {
  const o = [];
  for (const x of p) {
    const q = o[o.length - 1];
    if (!q || q.x !== x.x || q.y !== x.y) o.push(x);
  }
  return o;
}
function d(p) {
  return clean(p)
    .map((x, i) => `${i ? "L" : "M"} ${x.x} ${x.y}`)
    .join(" ");
}
function rev(p) {
  return [...clean(p)].reverse();
}
function pk(a, b) {
  return [a, b].sort().join("__");
}
function vroute(a, b) {
  if (a.x !== b.x) return clean([a, { x: a.x, y: b.y }, b]);
  return clean([a, { x: a.x, y: (a.y + b.y) / 2 }, b]);
}
function labels(l) {
  return { ...l, fromLabel: nodeMap.get(l.from)?.label || l.from, toLabel: nodeMap.get(l.to)?.label || l.to };
}
function getDiagramLayout() {
  return mobileDiagramMedia.matches ? "mobile" : "desktop";
}
function applyNodeLayout(layoutName) {
  const layout = layoutName === "mobile" ? mobileNodeLayout : desktopNodeLayout;

  nodes.forEach(node => {
    const position = layout.get(node.id);

    if (position) {
      node.x = position.x;
      node.y = position.y;
    }
  });
}
function mobileRoutes() {
  const n = id => nodeMap.get(id),
    alkane = n("alkane"),
    alkene = n("alkene"),
    diol = n("diol"),
    poly = n("polymer"),
    halo = n("halogenoalkane"),
    af = n("alcohol-family"),
    a1 = n("alcohol-1"),
    a2 = n("alcohol-2"),
    ket = n("ketone"),
    ald = n("aldehyde"),
    acid = n("carboxylic-acid"),
    ester = n("ester"),
    amine = n("amine"),
    nit = n("nitrile"),
    hyd = n("hydroxynitrile");

  return {
    "alkane-to-halogenoalkane": clean([
      edge(alkane, "right"),
      { x: 245, y: alkane.y },
      { x: 245, y: halo.y },
      edge(halo, "left"),
    ]),
    "alkene-to-alkane": clean([edge(alkene, "top"), edge(alkane, "bottom")]),
    "alkene-to-halogenoalkane": clean([edge(alkene, "right"), edge(halo, "left")]),
    "alkene-to-alcohol-family": clean([
      edge(alkene, "bottom"),
      { x: alkene.x, y: 595 },
      { x: af.x, y: 595 },
      edge(af, "top"),
    ]),
    "alkene-to-diol": clean([edge(alkene, "bottom"), edge(diol, "top")]),
    "alkene-to-polymer": clean([
      edge(alkene, "left"),
      { x: 42, y: alkene.y },
      { x: 42, y: edge(poly, "top").y },
      edge(poly, "top"),
    ]),
    "halogenoalkane-to-alcohol-family": clean([
      edge(halo, "bottom"),
      { x: halo.x, y: 595 },
      { x: af.x, y: 595 },
      edge(af, "top"),
    ]),
    "halogenoalkane-to-alkene": clean([edge(halo, "left"), edge(alkene, "right")]),
    "halogenoalkane-to-amine": clean([edge(halo, "bottom"), edge(amine, "top")]),
    "halogenoalkane-to-nitrile": clean([
      edge(halo, "right"),
      { x: 468, y: halo.y },
      { x: 468, y: nit.y },
      edge(nit, "right"),
    ]),
    "alcohol-family-to-halogenoalkane": clean([
      edge(af, "top"),
      { x: af.x, y: 595 },
      { x: halo.x, y: 595 },
      edge(halo, "bottom"),
    ]),
    "alcohol-family-to-alkene": clean([
      edge(af, "top"),
      { x: af.x, y: 595 },
      { x: alkene.x, y: 595 },
      edge(alkene, "bottom"),
    ]),
    "alcohol-family-to-ester": clean([
      edge(af, "left"),
      { x: 58, y: af.y },
      { x: 58, y: ester.y },
      edge(ester, "left"),
    ]),
    "alcohol-1-to-aldehyde": clean([edge(a1, "right"), { x: 230, y: a1.y }, { x: 230, y: ald.y }, edge(ald, "left")]),
    "alcohol-2-to-ketone": clean([edge(a2, "left"), { x: 210, y: a2.y }, { x: 210, y: ket.y }, edge(ket, "right")]),
    "aldehyde-to-alcohol-1": clean([edge(ald, "left"), { x: 230, y: ald.y }, { x: 230, y: a1.y }, edge(a1, "right")]),
    "ketone-to-alcohol-2": clean([edge(ket, "right"), { x: 210, y: ket.y }, { x: 210, y: a2.y }, edge(a2, "left")]),
    "aldehyde-to-carboxylic-acid": clean([
      edge(ald, "bottom"),
      { x: ald.x, y: 1130 },
      { x: acid.x, y: 1130 },
      edge(acid, "top"),
    ]),
    "carboxylic-acid-to-alcohol-1": clean([
      edge(acid, "left"),
      { x: 82, y: acid.y },
      { x: 82, y: a1.y },
      edge(a1, "left"),
    ]),
    "aldehyde-to-hydroxynitrile": clean([
      edge(ald, "right"),
      { x: 468, y: ald.y },
      { x: 468, y: hyd.y },
      edge(hyd, "right"),
    ]),
    "ketone-to-hydroxynitrile": clean([
      edge(ket, "bottom"),
      { x: ket.x, y: 1240 },
      { x: hyd.x, y: 1240 },
      edge(hyd, "top"),
    ]),
    "nitrile-to-carboxylic-acid": clean([
      edge(nit, "bottom"),
      { x: nit.x, y: 1130 },
      { x: acid.x, y: 1130 },
      edge(acid, "top"),
    ]),
    "carboxylic-acid-to-ester": clean([edge(acid, "bottom"), edge(ester, "top")]),
    "ester-to-carboxylic-acid": clean([edge(ester, "top"), edge(acid, "bottom")]),
    "ester-to-alcohol-family": clean([
      edge(ester, "left"),
      { x: 58, y: ester.y },
      { x: 58, y: af.y },
      edge(af, "left"),
    ]),
  };
}
function pairRoutes() {
  const n = id => nodeMap.get(id),
    alkane = n("alkane"),
    alkene = n("alkene"),
    diol = n("diol"),
    poly = n("polymer"),
    halo = n("halogenoalkane"),
    af = n("alcohol-family"),
    a1 = n("alcohol-1"),
    a2 = n("alcohol-2"),
    ket = n("ketone"),
    ald = n("aldehyde"),
    acid = n("carboxylic-acid"),
    ester = n("ester"),
    amine = n("amine"),
    nit = n("nitrile"),
    hyd = n("hydroxynitrile"),
    r = {};
  r[pk("alkane", "halogenoalkane")] = clean([
    edge(alkane, "right"),
    { x: 235, y: alkane.y },
    { x: 235, y: halo.y },
    edge(halo, "left"),
  ]);
  r[pk("alkane", "alkene")] = clean([edge(alkene, "top"), { x: alkene.x, y: 210 }, edge(alkane, "bottom")]);
  r[pk("alkene", "halogenoalkane")] = clean([
    edge(alkene, "right"),
    { x: 235, y: alkene.y },
    { x: 235, y: halo.y },
    edge(halo, "left"),
  ]);
  r[pk("alkene", "alcohol-family")] = clean([
    edge(alkene, "right"),
    { x: 235, y: alkene.y },
    { x: 235, y: 70 },
    { x: 548, y: 70 },
    edge(af, "left"),
  ]);
  r[pk("alkene", "diol")] = clean([edge(alkene, "bottom"), { x: alkene.x, y: 350 }, edge(diol, "top")]);
  r[pk("alkene", "polymer")] = clean([
    edge(alkene, "bottom"),
    { x: 20, y: alkene.y },
    { x: 20, y: edge(poly, "top").y },
    edge(poly, "top"),
  ]);
  r[pk("halogenoalkane", "alcohol-family")] = clean([
    edge(halo, "right"),
    { x: 485, y: halo.y },
    { x: 485, y: af.y },
    edge(af, "left"),
  ]);
  r[pk("halogenoalkane", "amine")] = clean([
    edge(halo, "right"),
    { x: 485, y: halo.y },
    { x: 485, y: 70 },
    { x: edge(amine, "left").x, y: 70 },
    edge(amine, "left"),
  ]);
  r[pk("halogenoalkane", "nitrile")] = clean([
    edge(halo, "right"),
    { x: 485, y: halo.y },
    { x: 485, y: nit.y },
    edge(nit, "left"),
  ]);
  r[pk("alcohol-family", "ester")] = clean([
    edge(af, "right"),
    { x: 735, y: af.y },
    { x: 735, y: 650 },
    { x: 802, y: 650 },
    edge(ester, "left"),
  ]);
  r[pk("alcohol-1", "aldehyde")] = clean([
    edge(a1, "right"),
    { x: 735, y: a1.y },
    { x: 735, y: ald.y },
    edge(ald, "left"),
  ]);
  r[pk("alcohol-2", "ketone")] = clean([
    edge(a2, "right"),
    { x: 735, y: a2.y },
    { x: 735, y: ket.y },
    edge(ket, "left"),
  ]);
  r[pk("aldehyde", "carboxylic-acid")] = clean([edge(ald, "bottom"), { x: ald.x, y: 390 }, edge(acid, "top")]);
  r[pk("aldehyde", "hydroxynitrile")] = clean([
    edge(ald, "right"),
    { x: 985, y: ald.y },
    { x: 985, y: hyd.y },
    edge(hyd, "left"),
  ]);
  r[pk("ketone", "hydroxynitrile")] = clean([
    edge(ket, "right"),
    { x: 985, y: ket.y },
    { x: 985, y: hyd.y },
    edge(hyd, "left"),
  ]);
  r[pk("carboxylic-acid", "alcohol-1")] = clean([
    edge(acid, "left"),
    { x: 735, y: acid.y },
    { x: 735, y: a1.y },
    edge(a1, "right"),
  ]);
  r[pk("carboxylic-acid", "ester")] = vroute(edge(acid, "bottom"), edge(ester, "top"));
  r[pk("nitrile", "carboxylic-acid")] = clean([
    edge(nit, "left"),
    { x: 985, y: nit.y },
    { x: 985, y: acid.y },
    edge(acid, "right"),
  ]);
  return r;
}
function route(l) {
  if (getDiagramLayout() === "mobile") {
    return mobileRoutes()[l.id] || [];
  }

  const p = pairRoutes()[pk(l.from, l.to)];
  if (!p) return [];
  const first = p[0],
    start = nodeMap.get(l.from);
  const match = ["left", "right", "top", "bottom"]
    .map(s => edge(start, s))
    .some(x => x.x === first.x && x.y === first.y);
  return match ? p : rev(p);
}
function arrow(p, s = 16) {
  p = clean(p);
  if (p.length < 2) return "";
  const t = p[p.length - 1],
    q = p[p.length - 2],
    dx = t.x - q.x,
    dy = t.y - q.y,
    len = Math.hypot(dx, dy) || 1,
    ux = dx / len,
    uy = dy / len,
    px = -uy,
    py = ux,
    bx = t.x - ux * s,
    by = t.y - uy * s,
    w = s * 0.48;
  return `${t.x},${t.y} ${bx + px * w},${by + py * w} ${bx - px * w},${by - py * w}`;
}
function related() {
  return links.filter(l => l.from === selectedNodeId || l.to === selectedNodeId).map(labels);
}
function sel() {
  const r = related();
  return r.find(l => l.id === selectedLinkId) || r[0] || labels(links[0]);
}
function selectNode(id) {
  selectedNodeId = id;
  const f = links.find(l => l.from === id || l.to === id);
  selectedLinkId = f ? f.id : links[0].id;
  quizInput = "";
  quizFeedback = "";
  render();
}
function selectLink(id) {
  selectedLinkId = id;
  quizInput = "";
  quizFeedback = "";
  render();
}
function renderDiagram() {
  const svg = document.getElementById("diagramSvg");
  const layoutName = getDiagramLayout();
  applyNodeLayout(layoutName);
  svg.setAttribute("viewBox", layoutName === "mobile" ? "0 0 520 1410" : "0 0 1220 720");
  svg.innerHTML = "";
  const diagramLabels = layoutName === "mobile" ? mobileColumnLabels : columnLabels;
  diagramLabels.forEach(c => {
    if (c.orientation === "horizontal") {
      svg.appendChild(
        svgEl("text", {
          x: c.x,
          y: c.y,
          "text-anchor": "start",
          "font-size": 14,
          "font-weight": 700,
          fill: "#78716c",
          textContent: c.label,
        })
      );
      svg.appendChild(
        svgEl("line", { x1: 28, y1: c.y + 16, x2: 492, y2: c.y + 16, stroke: "#f1f5f9", "stroke-width": 2 })
      );
      return;
    }

    svg.appendChild(
      svgEl("text", {
        x: c.x,
        y: 48,
        "text-anchor": "middle",
        "font-size": 14,
        "font-weight": 700,
        fill: "#78716c",
        textContent: c.label,
      })
    );
    svg.appendChild(svgEl("line", { x1: c.x, y1: 64, x2: c.x, y2: 694, stroke: "#f1f5f9", "stroke-width": 2 }));
  });
  membershipLinks.forEach(l => {
    const f = nodeMap.get(l.from),
      t = nodeMap.get(l.to);
    svg.appendChild(
      svgEl("path", {
        d: d([edge(f, "bottom"), edge(t, "top")]),
        fill: "none",
        stroke: "#cbd5e1",
        "stroke-width": 2,
        "stroke-dasharray": "6 6",
        "stroke-linecap": "round",
      })
    );
  });
  const s = sel(),
    rs = related()
      .map(l => {
        const pts = route(l);
        return { ...l, pts, d: d(pts), arrow: arrow(pts), active: l.id === s.id };
      })
      .sort((a, b) => Number(a.active) - Number(b.active));
  rs.filter(l => !l.active).forEach(l => {
    const p = svgEl("path", { d: l.d, class: "pathBase", stroke: "#d6d3d1", "stroke-width": 2.5 });
    p.onclick = () => selectLink(l.id);
    svg.appendChild(p);
  });
  rs.forEach(l => {
    const p = svgEl("path", { d: l.d, class: "pathHit" });
    p.onclick = () => selectLink(l.id);
    svg.appendChild(p);
  });
  nodes.forEach(n => {
    const a = n.id === selectedNodeId,
      [fill, stroke, text] = getTheme(n),
      g = svgEl("g", { transform: `translate(${n.x - n.w / 2}, ${n.y - n.h / 2})`, class: "nodeGroup" });
    g.onclick = () => selectNode(n.id);
    g.appendChild(
      svgEl("rect", {
        width: n.w,
        height: n.h,
        rx: 18,
        fill: a ? "#1c1917" : "#fff",
        stroke: a ? "#1c1917" : "#d6d3d1",
        "stroke-width": 2,
      })
    );
    g.appendChild(
      svgEl("text", {
        x: n.w / 2,
        y: n.h / 2,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        class: "nodeLabel",
        fill: a ? "#fff" : "#292524",
        textContent: n.label,
      })
    );
    svg.appendChild(g);
  });
  rs.filter(l => !l.active).forEach(l => {
    if (l.arrow) svg.appendChild(svgEl("polygon", { points: l.arrow, fill: "#d6d3d1", class: "arrowHead" }));
  });
  rs.filter(l => l.active).forEach(l => {
    const p = svgEl("path", { d: l.d, class: "pathBase", stroke: "#0f172a", "stroke-width": 4 });
    p.onclick = () => selectLink(l.id);
    svg.appendChild(p);
    if (l.arrow) svg.appendChild(svgEl("polygon", { points: l.arrow, fill: "#0f172a", class: "arrowHead" }));
  });
}
function renderGraph() {
  const gv = document.getElementById("graphView"),
    order = ["Hydrocarbons", "Halogen derivative", "Alcohols", "Carbonyl / acid", "Nitrogen products"],
    s = sel(),
    sn = nodeMap.get(selectedNodeId),
    inc = links.filter(l => l.to === selectedNodeId).map(labels),
    out = links.filter(l => l.from === selectedNodeId).map(labels),
    mi = membershipLinks.filter(l => l.to === selectedNodeId).map(labels),
    mo = membershipLinks.filter(l => l.from === selectedNodeId).map(labels);
  const groups = order
    .map(
      g =>
        `<div class="groupCard"><h3>${esc(g)}</h3><div class="chips">${nodes
          .filter(n => n.group === g)
          .map(n => {
            const [fill, stroke, text] = getTheme(n);
            return `<button class="chip ${n.id === selectedNodeId ? "active" : ""}" style="--fill:${fill};--stroke:${stroke};--text:${text}" data-node="${n.id}">${esc(n.label)}</button>`;
          })
          .join("")}</div></div>`
    )
    .join("");
  const row = l =>
    `<button class="routeRow ${l.id === s.id ? "active" : ""}" data-link="${l.id}"><div class="arrow">→</div><div><div class="title">${esc(l.fromLabel)} → ${esc(l.toLabel)}</div><div class="meta">${esc(l.label)}${l.reagents ? " · " + esc(l.reagents) : ""}</div></div></button>`;
  gv.innerHTML = `<div class="badges"><span class="badge">Graph map</span><span class="badge">Grouped by chemistry family</span><span class="badge">Incoming / outgoing routes</span></div><div class="graphGrid">${groups}</div><div class="routesGrid"><div class="routeBox"><h3>Incoming routes to ${esc(sn.label)}</h3><div class="routeList">${mi.map(l => `<button class="routeRow" data-node="${l.from}"><div class="arrow">···</div><div><div class="title">${esc(l.fromLabel)} → ${esc(l.toLabel)}</div><div class="meta">${esc(l.label)}</div></div></button>`).join("")}${inc.length || mi.length ? inc.map(row).join("") : '<div class="empty">No incoming routes shown for this node.</div>'}</div></div><div class="routeBox"><h3>Outgoing routes from ${esc(sn.label)}</h3><div class="routeList">${mo.map(l => `<button class="routeRow" data-node="${l.to}"><div class="arrow">···</div><div><div class="title">${esc(l.fromLabel)} → ${esc(l.toLabel)}</div><div class="meta">${esc(l.label)}</div></div></button>`).join("")}${out.length || mo.length ? out.map(row).join("") : '<div class="empty">No outgoing routes shown for this node.</div>'}</div></div></div>`;
  gv.querySelectorAll("[data-node]").forEach(b => (b.onclick = () => selectNode(b.dataset.node)));
  gv.querySelectorAll("[data-link]").forEach(b => (b.onclick = () => selectLink(b.dataset.link)));
}
function renderSide() {
  const sn = nodeMap.get(selectedNodeId),
    s = sel(),
    [fill, stroke, text] = getTheme(sn);
  document.getElementById("nodePanel").innerHTML =
    `<p class="labelSmall">Selected node</p><span class="nodePill" style="--fill:${fill};--stroke:${stroke};--text:${text}">${esc(sn.label)}</span><p class="note">${esc(nodeNotes[sn.id] || "")}</p>`;
  document.getElementById("relatedPanel").innerHTML = `<p class="labelSmall">Related routes</p>${related()
    .map(
      l =>
        `<button class="routeButton ${s.id === l.id ? "active" : ""}" data-link="${l.id}"><div class="name">${esc(l.label)}</div><div class="reag">${esc(l.reagents)}</div><div class="direction">${esc(l.fromLabel)} → ${esc(l.toLabel)}</div></button>`
    )
    .join("")}`;
  document.getElementById("conversionPanel").innerHTML =
    `<h3>Selected conversion</h3><p class="title">${esc(s.fromLabel)} → ${esc(s.toLabel)}</p><p class="fieldLabel">Reagent / conditions</p><p class="fieldText">${esc(s.reagents)}</p><p class="fieldLabel">Memory line</p><p class="fieldText">${esc(s.summary)}</p>`;
  document.getElementById("quizPanel").innerHTML =
    `<h3>Quick recall</h3><p>Type the reagent and main condition for the selected route.</p><textarea id="quizInput" placeholder="e.g. NaOH(aq), heat">${esc(quizInput)}</textarea><div class="actions"><button class="primary" id="checkBtn" type="button">Check</button><button class="secondary" id="revealBtn" type="button">Reveal</button></div><div class="feedback ${quizFeedback ? "show" : ""}" role="status" aria-live="polite">${esc(quizFeedback)}</div>`;
  document.querySelectorAll("#relatedPanel [data-link]").forEach(b => (b.onclick = () => selectLink(b.dataset.link)));
  document.getElementById("quizInput").oninput = e => {
    quizInput = e.target.value;
  };
  document.getElementById("checkBtn").onclick = checkQuiz;
  document.getElementById("revealBtn").onclick = () => {
    quizInput = s.reagents;
    quizFeedback = "Model condition shown.";
    renderSide();
  };
}
function norm(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function checkQuiz() {
  const s = sel(),
    u = norm(quizInput),
    ex = norm(s.reagents);
  if (!u) {
    quizFeedback = "Type an answer first.";
    renderSide();
    return;
  }
  const bits = s.reagents.split(",").map(norm).filter(Boolean),
    m = bits.filter(b => u.includes(b));
  quizFeedback =
    u === ex || m.length >= Math.max(1, bits.length - 1)
      ? "Good. You have the main condition."
      : "Not yet. One key reagent or condition is missing.";
  renderSide();
}
function render() {
  document.getElementById("diagramBtn").classList.toggle("active", viewMode === "diagram");
  document.getElementById("graphBtn").classList.toggle("active", viewMode === "graph");
  document.getElementById("diagramView").style.display = viewMode === "diagram" ? "" : "none";
  document.getElementById("graphView").style.display = viewMode === "graph" ? "block" : "none";
  if (viewMode === "diagram") renderDiagram();
  else renderGraph();
  renderSide();
}
document.getElementById("diagramBtn").onclick = () => {
  viewMode = "diagram";
  render();
};
document.getElementById("graphBtn").onclick = () => {
  viewMode = "graph";
  render();
};
mobileDiagramMedia.addEventListener("change", () => {
  render();
});
render();
