export const proposedRubric = [
  [
    5,
    "Diego Velázquez. Se acceptă Francisco de Goya dacă echipa precizează intrarea și statuia corespunzătoare.",
    "5p pentru identificarea corectă; acceptă variații ortografice și răspunsuri justificate pentru altă intrare.",
  ],
  [
    12,
    "Hieronymus / Jheronimus Bosch; Grădina desfătărilor (The Garden of Earthly Delights). Exemple de animale: bufniță, pasăre, pește, iepure. Triptic pictat în ulei pe panou; tematică morală și religioasă, cu paradis, desfătări și infern.",
    "Artist 2p; titlu 2p; trei animale din compoziție 3 × 1p; două informații corecte 2 × 2,5p. Acceptă alte animale și informații verificabile.",
  ],
  [
    11,
    "Hieronymus Bosch (atribuire tradițională; se acceptă atelier/urmaș). Mândrie, avariție, desfrânare, invidie, lăcomie, mânie, lene. Mesaj posibil: avertisment moral asupra păcatelor și consecințelor lor.",
    "Artist 2p; șapte păcate 7 × 1p; mesaj coerent, maximum două propoziții, 2p. Acceptă sinonime și interpretări argumentate.",
  ],
  [
    9,
    "Rogier van der Weyden; Coborârea de pe cruce (The Descent from the Cross). Emoții exprimate prin lacrimi, gesturi, expresii faciale și posturi, paralelismul trupurilor lui Hristos și Mariei.",
    "Artist 2p; titlu 3p; două mijloace de exprimare explicate 2 × 2p.",
  ],
  [
    11,
    "Las Meninas / Domnișoarele de onoare; Diego Velázquez; baroc. Centre de interes posibile: infanta Margarita, pictorul, oglinda cu perechea regală, silueta din ușă.",
    "Titlu 3p; artist 2p; curent 2p; două centre de interes identificate și argumentate 2 × 2p.",
  ],
  [
    9,
    "Identificarea autorului și titlului acestui detaliu trebuie confirmată de profesoară din fișa originală înainte de evaluarea AI. Exemple de contraste: clar–obscur, cald–rece, contrast de texturi, dacă sunt susținute prin observații.",
    "Autor 2p; titlu 3p; două contraste argumentate 2 × 2p. Până la completarea cheii autor/titlu de către profesoară, nu inventa identificarea; semnalează explicit nevoia verificării umane.",
  ],
  [
    9,
    "Diego Velázquez; Triumful lui Bacchus / Los Borrachos / The Triumph of Bacchus. Bacchus: tors dezgolit, piele luminoasă, cunună de viță, figură idealizată, diferită de bărbații tratați realist.",
    "Artist 2p; titlu 2p; descriere 1p; două deosebiri observabile și explicate 2 × 2p.",
  ],
  [
    5,
    "Două alte lucrări de Diego Velázquez: de exemplu Las Meninas, Las Hilanderas, Predarea Bredei sau portrete regale.",
    "2 × 2,5p pentru două lucrări distincte, diferite de Triumful lui Bacchus. Acceptă titluri echivalente în alte limbi.",
  ],
  [
    10,
    "Saturn devorându-și fiul; Francisco de Goya; Saturn / Cronos. Informații posibile: pictor spaniol (1746–1828), pictor de curte, autorul Picturilor negre, și-a pierdut auzul. Emoțiile alese sunt subiective.",
    "Titlu 2p; artist 2p; două informații corecte 2 × 2p; personaj mitologic 1p; cel puțin o emoție selectată 1p, fără a impune o emoție unică.",
  ],
  [
    4,
    "3 mai 1808 / El tres de mayo de 1808 / The Third of May 1808, Francisco de Goya.",
    "4p pentru lucrarea corectă; acceptă traduceri și formulări echivalente.",
  ],
  [
    3,
    "Răspuns deschis: o altă lucrare identificabilă din Prado și o explicație personală legată de observații artistice.",
    "Lucrare identificabilă 1p; argument personal coerent și legat de lucrare 2p. Nu impune o alegere sau interpretare unică.",
  ],
  [
    2,
    "Răspuns personal: orice lucrare identificabilă văzută în Muzeul Prado.",
    "2p pentru o lucrare identificabilă din muzeu; preferința nu se judecă estetic.",
  ],
];
export const roundPoints = (n) => Math.round(n * 100) / 100;
export const validPoint = (n) =>
  Number.isFinite(n) &&
  n >= 0 &&
  n <= 100 &&
  Math.abs(n * 100 - Math.round(n * 100)) < 1e-7;
export const rubricTotal = (c) =>
  roundPoints(
    c.questions.reduce((s, q) => s + q.points, 0) + (c.bonusPoints || 0),
  );
export const teamKey = (name) =>
  name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("ro-RO");
