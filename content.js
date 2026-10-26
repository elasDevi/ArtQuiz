const q = (id, ro, en, fields, points, rubric, image = null, extra = {}) => ({
  id,
  ro,
  en,
  fields: fields.map(([key, ro, en]) => ({ key, ro, en })),
  points,
  rubric,
  image,
  ...extra,
});
export const initialContent = {
  title: "Prado Art Challenge",
  museum: "Museo Nacional del Prado · Madrid",
  groups: ["Grupa 1", "Grupa 2", "Grupa 3", "Grupa 4", "Grupa 5", "Grupa 6"],
  questions: [
    q(
      1,
      "Înainte de a intra",
      "Before you step inside",
      [
        [
          "artist",
          "Numește artistul a cărui statuie se află în fața Muzeului Prado.",
          "Name the artist whose statue stands in front of the Prado Museum.",
        ],
      ],
      5,
      "Diego Velázquez (acceptă și Goya dacă elevul identifică justificat o altă intrare și statuia corespunzătoare).",
    ),
    q(
      2,
      "O lume de descoperit",
      "A world to discover",
      [
        ["artist", "Numele artistului", "Artist’s name"],
        ["title", "Numele lucrării", "Title of the artwork"],
        [
          "animals",
          "Trei animale din compoziție",
          "Three animals in the composition",
        ],
        [
          "facts",
          "Două informații despre lucrare",
          "Two facts about the artwork",
        ],
      ],
      14,
      "Hieronymus Bosch / Jheronimus Bosch (2p), Grădina desfătărilor / The Garden of Earthly Delights (3p), trei animale vizibile din întreaga compoziție (3p), două informații corecte despre triptic, simbolism, tehnică sau context (6p).",
      "/images/page1-1.jpeg",
    ),
    q(
      3,
      "Cele șapte păcate capitale",
      "The seven deadly sins",
      [
        [
          "artist",
          "Artistul și cele șapte păcate capitale",
          "The artist and the seven deadly sins",
        ],
        [
          "message",
          "Ce mesaj transmite pictura? Maximum două propoziții.",
          "What message does the painting convey? Maximum two sentences.",
        ],
      ],
      12,
      "Hieronymus Bosch / atelierul sau un urmaș al lui Bosch, acceptă atribuirea tradițională (2p). Mândrie, avariție, desfrânare, invidie, lăcomie, mânie, lene: echivalente acceptate (7p). Interpretare argumentată despre moralitate, consecințe, supraveghere divină (3p); nu cere formulări identice.",
    ),
    q(
      4,
      "Gesturi și emoții",
      "Gestures and emotions",
      [
        ["artist", "Numele artistului", "Artist’s name"],
        ["title", "Numele lucrării", "Title of the artwork"],
        [
          "emotion",
          "Două modalități de exprimare a emoțiilor",
          "Two ways emotions are expressed",
        ],
      ],
      10,
      "Rogier van der Weyden (3p), Coborârea de pe cruce / The Descent from the Cross (3p). Două observații susținute despre gesturi, lacrimi, posturi, expresii sau compoziție (4p).",
      "/images/page1-2.jpeg",
    ),
    q(
      5,
      "În atelierul pictorului",
      "Inside the painter’s studio",
      [
        ["title", "Numele lucrării", "Title of the artwork"],
        ["artist", "Numele artistului", "Artist’s name"],
        ["movement", "Curentul artistic", "Art movement"],
        [
          "focus",
          "Două centre de interes ale compoziției",
          "Two focal points in the composition",
        ],
      ],
      12,
      "Las Meninas / Domnișoarele de onoare (3p), Diego Velázquez (3p), baroc (2p). Două centre de interes argumentate: infanta Margarita, pictorul, oglinda / cuplul regal sau ușa luminoasă (4p).",
      null,
      {
        hint: {
          ro: "Caută o compoziție cu 11 personaje, un câine și autoportretul pictorului. Lumina vine din dreapta. Artistul ține pensula și paleta; mustața lui l-a inspirat pe Salvador Dalí.",
          en: "Find a composition with 11 figures, a dog and the artist’s self-portrait. Light comes from the right. The painter holds a brush and palette; his moustache inspired Salvador Dalí.",
        },
      },
    ),
    q(
      6,
      "Lumina face diferența",
      "Light makes the difference",
      [
        ["artist", "Numele artistului", "Artist’s name"],
        ["title", "Numele lucrării", "Title of the artwork"],
        ["contrast", "Două tipuri de contrast", "Two types of contrast"],
      ],
      10,
      "Barem provizoriu: autor 3p, titlu 3p, două contraste observate și explicate (clar-obscur, cald-rece, texturi etc.) 4p. PDF-ul nu oferă cheia identificării acestui detaliu; profesoara trebuie să confirme autorul și titlul înainte de evaluare. Nu inventa o identificare din text și nu presupune că vezi imaginea: dacă baremul nu a fost completat, marchează explicit identificarea ca necesitând verificare umană și justifică numai contrastele descrise.",
      "/images/page2-1.jpeg",
    ),
    q(
      7,
      "La întâlnire cu Bacchus",
      "Meeting Bacchus",
      [
        ["artist", "Numele artistului", "Artist’s name"],
        ["title", "Numele lucrării", "Title of the artwork"],
        [
          "description",
          "Descrie-l pe Bacchus și precizează două deosebiri față de ceilalți bărbați.",
          "Describe Bacchus and give two differences from the other men.",
        ],
      ],
      10,
      "Diego Velázquez (2p), Triumful lui Bacchus / Los Borrachos / The Triumph of Bacchus (3p). Descriere și două deosebiri observabile: piele luminoasă, tors dezgolit, cunună de viță, idealizare versus realism, vârstă sau expresii (5p).",
      "/images/page2-2.jpeg",
    ),
    q(
      8,
      "Recunoști stilul?",
      "Recognise the style?",
      [
        [
          "works",
          "Alte două lucrări ale artistului de la exercițiul 7",
          "Two other works by the artist from exercise 7",
        ],
      ],
      6,
      "Două lucrări de Diego Velázquez, distincte de Triumful lui Bacchus, câte 3p. Exemple: Las Meninas, Las Hilanderas, Predarea Bredei, portrete regale. Acceptă titluri echivalente.",
    ),
    q(
      9,
      "Dincolo de întuneric",
      "Beyond the darkness",
      [
        ["title", "Identifică lucrarea", "Identify the artwork"],
        ["artist", "Numele artistului", "Artist’s name"],
        [
          "facts",
          "Două informații relevante despre artist",
          "Two relevant facts about the artist",
        ],
        ["figure", "Personajul mitologic", "The mythological figure"],
      ],
      11,
      "Saturn devorându-și fiul / Saturn Devouring His Son (2p), Francisco de Goya (2p), două informații exacte despre artist (4p), Saturn / Cronos (2p). Selectarea emoțiilor este subiectivă: orice selecție coerentă primește 1p.",
      "/images/page3-1.jpeg",
      { emotions: true },
    ),
    q(
      10,
      "O noapte în istorie",
      "A night in history",
      [
        [
          "title",
          "Numește o altă lucrare a artistului de la exercițiul 9, cu un subiect istoric dramatic care se petrece noaptea.",
          "Name another work by the artist from exercise 9 showing a dramatic historical event at night.",
        ],
      ],
      4,
      "Francisco de Goya, 3 mai 1808 / El tres de mayo de 1808 / The Third of May 1808 (4p).",
    ),
    q(
      11,
      "Alegerea ta, povestea ta",
      "Your choice, your story",
      [
        [
          "work",
          "Alege o altă lucrare din Prado și explică alegerea.",
          "Choose another artwork in the Prado and explain your choice.",
        ],
      ],
      4,
      "O lucrare identificabilă din Prado (1p) și explicație personală coerentă, legată de observații artistice (3p). Acceptă interpretări diverse, argumentate.",
    ),
    q(
      12,
      "O operă de luat în amintire",
      "An artwork to remember",
      [
        [
          "favorite",
          "Care este lucrarea preferată pe care ai văzut-o în muzeu?",
          "What is your favourite artwork you saw in the museum?",
        ],
      ],
      2,
      "Orice lucrare identificabilă din muzeu (2p). Preferința este subiectivă, nu există un unic răspuns corect.",
    ),
  ],
};
