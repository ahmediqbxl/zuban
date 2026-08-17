/**
 * Bangla (bn-BD) course source — hand-authored, machine-assisted.
 *
 * ⚠ PROVENANCE. Everything in this file is currently `draft`: drafted by
 * an LLM against a frequency list, NOT yet checked by a native speaker.
 * The research on low-resource generation is blunt about why that matters
 * — GPT-4o showed ~20% error rates generating Sundanese, and researchers
 * warn that LLM-generating data for a low-resource language is quality-
 * equivalent to machine translation. Drafts are withheld from learners by
 * `filterLearnerReady()` unless drafts are explicitly enabled.
 *
 * Reviewing a line means: correct it if wrong, then change its status to
 * `reviewed` and add your name. See content/bn/README.md.
 *
 * DIALECT: Bangladeshi colloquial (চলিত). Where Dhaka and Kolkata differ
 * the Dhaka form wins — পানি not জল — and the difference is flagged.
 */

/** [form, roman, gloss, pos, freqRank] */
export type LexemeRow = [string, string, string, string, number];

export const LEXEMES: LexemeRow[] = [
  // --- Pronouns -----------------------------------------------------------
  ['আমি', 'ami', 'I', 'pron', 12],
  ['তুমি', 'tumi', 'you (familiar)', 'pron', 40],
  ['আপনি', 'apni', 'you (polite)', 'pron', 120],
  ['তুই', 'tui', 'you (intimate)', 'pron', 300],
  ['সে', 'she', 'he, she', 'pron', 35],
  ['আমরা', 'amra', 'we', 'pron', 150],
  ['তারা', 'tara', 'they', 'pron', 210],
  ['আমার', 'amar', 'my', 'pron', 25],
  ['তোমার', 'tomar', 'your (familiar)', 'pron', 90],
  ['আপনার', 'apnar', 'your (polite)', 'pron', 260],
  ['তার', 'tar', 'his, her', 'pron', 70],

  // --- আছ- : the existential verb, the first thing anyone needs ----------
  ['আছি', 'achhi', 'I am, I exist', 'verb', 55],
  ['আছ', 'achho', 'you are (familiar)', 'verb', 190],
  ['আছেন', 'achhen', 'you are (polite), he/she is (polite)', 'verb', 175],
  ['আছে', 'achhe', 'is, there is', 'verb', 20],

  // --- Common verbs, present tense ---------------------------------------
  ['করি', 'kori', 'I do', 'verb', 110],
  ['করে', 'kore', 'does, having done', 'verb', 30],
  ['যাই', 'jai', 'I go', 'verb', 230],
  ['যায়', 'jay', 'goes', 'verb', 140],
  ['যাও', 'jao', 'you go (familiar)', 'verb', 320],
  ['খাই', 'khai', 'I eat', 'verb', 340],
  ['খায়', 'khay', 'eats', 'verb', 290],
  ['বলি', 'boli', 'I say', 'verb', 280],
  ['বলে', 'bole', 'says', 'verb', 45],
  ['শিখছি', 'shikhchhi', 'I am learning', 'verb', 900],
  ['থাকি', 'thaki', 'I live, I stay', 'verb', 400],
  ['চাই', 'chai', 'I want', 'verb', 250],
  ['পারি', 'pari', 'I can', 'verb', 270],
  ['জানি', 'jani', 'I know', 'verb', 220],
  ['দেখি', 'dekhi', 'I see', 'verb', 310],

  // --- Question words -----------------------------------------------------
  ['কি', 'ki', 'what; (yes/no marker)', 'part', 18],
  ['কী', 'ki', 'what (emphatic)', 'pron', 95],
  ['কেমন', 'kemon', 'how, what kind', 'adv', 330],
  ['কোথায়', 'kothay', 'where', 'adv', 240],
  ['কে', 'ke', 'who', 'pron', 130],
  ['কেন', 'keno', 'why', 'adv', 200],
  ['কখন', 'kokhon', 'when', 'adv', 380],
  ['কত', 'koto', 'how much, how many', 'adv', 165],

  // --- Nouns ---------------------------------------------------------------
  ['নাম', 'nam', 'name', 'noun', 100],
  ['বাড়ি', 'bari', 'house, home', 'noun', 145],
  ['পানি', 'pani', 'water', 'noun', 185],
  ['ভাত', 'bhat', 'cooked rice, a meal', 'noun', 350],
  ['বই', 'boi', 'book', 'noun', 230],
  ['মা', 'ma', 'mother', 'noun', 115],
  ['বাবা', 'baba', 'father', 'noun', 135],
  ['ছেলে', 'chhele', 'boy, son', 'noun', 160],
  ['মেয়ে', 'meye', 'girl, daughter', 'noun', 155],
  ['দিন', 'din', 'day', 'noun', 85],
  ['রাত', 'rat', 'night', 'noun', 195],
  ['কাজ', 'kaj', 'work', 'noun', 105],
  ['কথা', 'kotha', 'word, talk, matter', 'noun', 60],
  ['বাংলা', 'bangla', 'Bangla, Bengali', 'noun', 205],
  ['দেশ', 'desh', 'country', 'noun', 125],
  ['সময়', 'shomoy', 'time', 'noun', 75],
  ['মানুষ', 'manush', 'person, people', 'noun', 65],

  // --- Adjectives / adverbs ------------------------------------------------
  ['ভালো', 'bhalo', 'good, well', 'adj', 50],
  ['খারাপ', 'kharap', 'bad', 'adj', 290],
  ['বড়', 'boro', 'big', 'adj', 170],
  ['ছোট', 'chhoto', 'small', 'adj', 215],
  ['নতুন', 'notun', 'new', 'adj', 180],
  ['খুব', 'khub', 'very', 'adv', 80],
  ['একটু', 'ektu', 'a little', 'adv', 235],
  ['অনেক', 'onek', 'much, many', 'adv', 48],

  // --- Function words ------------------------------------------------------
  ['না', 'na', 'no, not', 'part', 10],
  ['হ্যাঁ', 'hê', 'yes', 'part', 275],
  ['এই', 'ei', 'this', 'pron', 15],
  ['এটা', 'eta', 'this one', 'pron', 88],
  ['ওটা', 'ota', 'that one', 'pron', 265],
  ['আর', 'ar', 'and, more', 'conj', 22],
  ['কিন্তু', 'kintu', 'but', 'conj', 68],
  ['ধন্যবাদ', 'dhonnobad', 'thank you', 'interj', 420],
  ['আচ্ছা', 'achchha', 'okay, I see', 'interj', 360],
  ['ঠিক', 'thik', 'right, correct', 'adj', 98],
  // --- Added to close sentence-tokenizer gaps (see build-content.ts) -------
  ['আজ', 'aj', 'today', 'adv', 92],
  ['আমাদের', 'amader', 'our, us', 'pron', 245],
  ['আসবে', 'ashbe', 'will come', 'verb', 410],
  ['করবেন', 'korben', 'will do (polite)', 'verb', 480],
  ['কিছু', 'kichhu', 'something, some', 'pron', 78],
  ['ক্ষমা', 'khoma', 'forgiveness, pardon', 'noun', 620],
  ['খাবে', 'khabe', 'will eat', 'verb', 520],
  ['গান', 'gan', 'song', 'noun', 285],
  ['ছাত্র', 'chhatro', 'student', 'noun', 370],
  ['জ্ঞান', 'gyan', 'knowledge', 'noun', 450],
  ['পড়ি', 'pori', 'I read, I study', 'verb', 315],
  ['বলতে', 'bolte', 'to say', 'verb', 295],
  ['বলল', 'bollo', 'said', 'verb', 305],
  ['বিশ্ববিদ্যালয়', 'bishshobiddaloy', 'university', 'noun', 720],
  ['যাচ্ছি', 'jachchhi', 'I am going', 'verb', 560],
  ['যে', 'je', 'that (conjunction), who', 'conj', 42],
  ['রিমা', 'Rima', 'Rima (a name)', 'noun', 2000],
  ['শিখতে', 'shikhte', 'to learn', 'verb', 640],
  ['সুন্দর', 'shundor', 'beautiful', 'adj', 225],
  ['স্কুল', 'shkul', 'school', 'noun', 390],
  ['হবে', 'hobe', 'will be, must', 'verb', 58]
];

/** [form, roman, gloss, level] */
export type SentenceRow = [string, string, string, 1 | 2 | 3 | 4 | 5];

export const SENTENCES: SentenceRow[] = [
  // Level 1 — greetings and self-description
  ['আমি ভালো আছি।', 'ami bhalo achhi.', 'I am well.', 1],
  ['তুমি কেমন আছ?', 'tumi kemon achho?', 'How are you?', 1],
  ['আপনি কেমন আছেন?', 'apni kemon achhen?', 'How are you? (polite)', 1],
  ['আমার নাম রিমা।', 'amar nam Rima.', 'My name is Rima.', 1],
  ['তোমার নাম কী?', 'tomar nam ki?', 'What is your name?', 1],
  ['ধন্যবাদ।', 'dhonnobad.', 'Thank you.', 1],
  ['এটা কী?', 'eta ki?', 'What is this?', 1],
  ['হ্যাঁ, ঠিক আছে।', 'hê, thik achhe.', 'Yes, that is right.', 1],
  ['না, আমি জানি না।', 'na, ami jani na.', 'No, I do not know.', 1],

  // Level 2 — simple statements
  ['আমি বাংলা শিখছি।', 'ami bangla shikhchhi.', 'I am learning Bangla.', 2],
  ['এটা আমার বই।', 'eta amar boi.', 'This is my book.', 2],
  ['আমি ভাত খাই।', 'ami bhat khai.', 'I eat rice.', 2],
  ['সে বাড়ি যায়।', 'she bari jay.', 'He goes home.', 2],
  ['তুমি কোথায় যাও?', 'tumi kothay jao?', 'Where are you going?', 2],
  ['আমার মা বাড়ি আছেন।', 'amar ma bari achhen.', 'My mother is at home.', 2],
  ['বইটা খুব ভালো।', 'boita khub bhalo.', 'The book is very good.', 2],
  ['আমি একটু বাংলা বলি।', 'ami ektu bangla boli.', 'I speak a little Bangla.', 2],
  ['তার নাম কী?', 'tar nam ki?', 'What is his name?', 2],
  ['আমি পানি চাই।', 'ami pani chai.', 'I want water.', 2],

  // Level 3 — two clauses, real texture
  ['আমি বাংলা বলতে পারি।', 'ami bangla bolte pari.', 'I can speak Bangla.', 3],
  ['আজ অনেক কাজ আছে।', 'aj onek kaj achhe.', 'There is a lot of work today.', 3],
  ['সে ভালো ছেলে, কিন্তু খুব ছোট।', 'she bhalo chhele, kintu khub chhoto.', 'He is a good boy, but very small.', 3],
  ['আমার দেশ খুব সুন্দর।', 'amar desh khub shundor.', 'My country is very beautiful.', 3],
  ['তুমি কেন যাও না?', 'tumi keno jao na?', 'Why do you not go?', 3],
  ['আমি এই বই পড়ি।', 'ami ei boi pori.', 'I read this book.', 3],
  ['রাতে আমি বাড়ি থাকি।', 'rate ami bari thaki.', 'At night I stay home.', 3],
  ['মানুষ অনেক কথা বলে।', 'manush onek kotha bole.', 'People talk a lot.', 3],

  // Level 4 — the sentences that need real grammar
  ['আমার একটু সময় আছে।', 'amar ektu shomoy achhe.', 'I have a little time.', 4],
  ['তুমি কি ভাত খাবে?', 'tumi ki bhat khabe?', 'Will you eat rice?', 4],
  ['সে বলল যে সে আসবে।', 'she bollo je she ashbe.', 'He said that he would come.', 4],
  ['আমি কাজ করে বাড়ি যাই।', 'ami kaj kore bari jai.', 'Having finished work, I go home.', 4],
  ['এই মেয়েটা খুব ভালো গান করে।', 'ei meyeta khub bhalo gan kore.', 'This girl sings very well.', 4],
  ['আমাদের অনেক কিছু শিখতে হবে।', 'amader onek kichhu shikhte hobe.', 'We have to learn many things.', 4],

  // Level 5 — conjunct-heavy, for script work
  ['ক্ষমা করবেন।', 'khoma korben.', 'Please forgive me. / Excuse me.', 5],
  ['বিশ্ববিদ্যালয়ে অনেক ছাত্র আছে।', 'bishshobiddaloye onek chhatro achhe.', 'There are many students at the university.', 5],
  ['তার জ্ঞান অনেক।', 'tar gyan onek.', 'His knowledge is great.', 5],
  ['আমি স্কুলে যাচ্ছি।', 'ami shkule jachchhi.', 'I am going to school.', 5]
];

export interface NoteRow {
  id: string;
  title: string;
  body: string;
  examples: string[]; // sentence forms, resolved to ids at build time
}

/**
 * Grammar notes. Short by design — surfaced on demand next to a sentence,
 * never as a wall of text. Thin grammar is one of the documented reasons
 * gamified apps plateau, so these are first-class content.
 */
export const NOTES: NoteRow[] = [
  {
    id: 'no-verb-to-be',
    title: 'Bangla drops "is" in the present',
    body:
      'There is no present-tense "is/are" linking two nouns. **এটা আমার বই** is literally "this my book" — and that is the complete, correct sentence.\n\nআছে is a different verb meaning "exists / is present", used for location and possession, not for identity.',
    examples: ['এটা আমার বই।', 'আমার মা বাড়ি আছেন।']
  },
  {
    id: 'verb-final',
    title: 'The verb goes last',
    body:
      'Bangla is subject–object–verb. **আমি ভাত খাই** is "I rice eat".\n\nOnce you expect the verb at the end, long sentences stop feeling scrambled — everything before it is setup.',
    examples: ['আমি ভাত খাই।', 'সে বাড়ি যায়।']
  },
  {
    id: 'you-three-ways',
    title: 'Three words for "you"',
    body:
      'Bangla grades politeness into the pronoun itself:\n\n- **আপনি** — polite. Elders, strangers, anyone senior.\n- **তুমি** — familiar. Friends, peers, younger family.\n- **তুই** — intimate. Close childhood friends and siblings; rude to the wrong person.\n\nThe verb ending changes to match: আপনি করেন / তুমি কর / তুই করিস.',
    examples: ['আপনি কেমন আছেন?', 'তুমি কেমন আছ?']
  },
  {
    id: 'ki-two-jobs',
    title: 'কি versus কী',
    body:
      'Same sound, two jobs, and the spelling distinguishes them:\n\n- **কি** turns a statement into a yes/no question. *তুমি কি ভাত খাবে?* — "Will you eat rice?"\n- **কী** means "what". *তোমার নাম কী?* — "What is your name?"\n\nMany native writers blur these, so expect to see both.',
    examples: ['তুমি কি ভাত খাবে?', 'তোমার নাম কী?']
  },
  {
    id: 'pani-vs-jol',
    title: 'পানি or জল — where you are matters',
    body:
      'Bangladesh says **পানি** for water; West Bengal says **জল**. Both are correct Bangla, and the choice quietly signals where you learned it.\n\nThis course teaches the Bangladeshi form throughout. Other pairs like this: নুন/লবণ (salt), and the greetings আসসালামু আলাইকুম versus নমস্কার.',
    examples: ['আমি পানি চাই।']
  },
  {
    id: 'classifier-ta',
    title: 'The -টা ending',
    body:
      'Bangla attaches a *classifier* to make a noun definite. **বই** is "a book"; **বইটা** is "the book".\n\nUse টা for most things, জন for people (তিনজন মানুষ — three people), and খানা for flat objects.',
    examples: ['বইটা খুব ভালো।']
  }
];
