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
  ['হবে', 'hobe', 'will be, must', 'verb', 58],
  // ═══ Expansion round 2 ═══════════════════════════════════════════════════
  // Same provenance caveat as everything above: drafted, not yet reviewed.

  // --- Numbers -------------------------------------------------------------
  ['এক', 'ek', 'one', 'num', 62],
  ['দুই', 'dui', 'two', 'num', 88],
  ['তিন', 'tin', 'three', 'num', 112],
  ['চার', 'char', 'four', 'num', 138],
  ['পাঁচ', 'panch', 'five', 'num', 158],
  ['ছয়', 'chhoy', 'six', 'num', 262],
  ['সাত', 'shat', 'seven', 'num', 278],
  ['আট', 'at', 'eight', 'num', 296],
  ['নয়', 'noy', 'nine', 'num', 318],
  ['দশ', 'dosh', 'ten', 'num', 172],

  // --- Time ----------------------------------------------------------------
  ['কাল', 'kal', 'tomorrow, yesterday', 'adv', 148],
  ['সকাল', 'shokal', 'morning', 'noun', 205],
  ['বিকাল', 'bikal', 'afternoon', 'noun', 340],
  ['সন্ধ্যা', 'shondha', 'evening', 'noun', 355],
  ['এখন', 'ekhon', 'now', 'adv', 52],
  ['পরে', 'pore', 'later, after', 'adv', 118],
  ['আগে', 'age', 'before, ago', 'adv', 108],
  ['বছর', 'bochhor', 'year', 'noun', 96],
  ['মাস', 'mash', 'month', 'noun', 188],
  ['সপ্তাহ', 'shoptaho', 'week', 'noun', 288],
  ['ঘণ্টা', 'ghonta', 'hour', 'noun', 298],

  // --- Food and drink ------------------------------------------------------
  ['খাবার', 'khabar', 'food', 'noun', 232],
  ['চা', 'cha', 'tea', 'noun', 258],
  ['দুধ', 'dudh', 'milk', 'noun', 302],
  ['ডিম', 'dim', 'egg', 'noun', 372],
  ['মাছ', 'machh', 'fish', 'noun', 242],
  ['মাংস', 'mangsho', 'meat', 'noun', 352],
  ['সবজি', 'shobji', 'vegetable', 'noun', 392],
  ['ফল', 'fol', 'fruit', 'noun', 338],
  ['রুটি', 'ruti', 'bread, flatbread', 'noun', 368],
  ['চিনি', 'chini', 'sugar', 'noun', 402],
  ['নুন', 'nun', 'salt', 'noun', 412],

  // --- People and family ---------------------------------------------------
  ['ভাই', 'bhai', 'brother', 'noun', 128],
  ['বোন', 'bon', 'sister', 'noun', 168],
  ['বন্ধু', 'bondhu', 'friend', 'noun', 142],
  ['পরিবার', 'poribar', 'family', 'noun', 212],
  ['স্ত্রী', 'stri', 'wife', 'noun', 322],
  ['স্বামী', 'shami', 'husband', 'noun', 328],
  ['শিক্ষক', 'shikkhok', 'teacher', 'noun', 348],
  ['ডাক্তার', 'daktar', 'doctor', 'noun', 362],

  // --- Places --------------------------------------------------------------
  ['শহর', 'shohor', 'city', 'noun', 178],
  ['গ্রাম', 'gram', 'village', 'noun', 222],
  ['রাস্তা', 'rasta', 'road, street', 'noun', 252],
  ['দোকান', 'dokan', 'shop', 'noun', 292],
  ['বাজার', 'bazar', 'market', 'noun', 272],
  ['হাসপাতাল', 'hashpatal', 'hospital', 'noun', 398],
  ['ঘর', 'ghor', 'room, house', 'noun', 162],
  ['জায়গা', 'jayga', 'place', 'noun', 198],

  // --- Body ----------------------------------------------------------------
  ['মাথা', 'matha', 'head', 'noun', 248],
  ['হাত', 'hat', 'hand', 'noun', 152],
  ['পা', 'pa', 'foot, leg', 'noun', 238],
  ['চোখ', 'chokh', 'eye', 'noun', 182],
  ['মন', 'mon', 'mind, heart', 'noun', 122],

  // --- Verbs, first and third person present -------------------------------
  ['আসি', 'ashi', 'I come', 'verb', 226],
  ['আসে', 'ashe', 'comes', 'verb', 132],
  ['দেই', 'dei', 'I give', 'verb', 336],
  ['দেয়', 'dey', 'gives', 'verb', 216],
  ['নিই', 'nii', 'I take', 'verb', 346],
  ['নেয়', 'ney', 'takes', 'verb', 268],
  ['শুনি', 'shuni', 'I hear, I listen', 'verb', 308],
  ['শোনে', 'shone', 'hears', 'verb', 324],
  ['লিখি', 'likhi', 'I write', 'verb', 358],
  ['লেখে', 'lekhe', 'writes', 'verb', 376],
  ['বসি', 'boshi', 'I sit', 'verb', 386],
  ['বসে', 'boshe', 'sits', 'verb', 234],
  ['ঘুমাই', 'ghumai', 'I sleep', 'verb', 424],
  ['ঘুমায়', 'ghumay', 'sleeps', 'verb', 436],
  ['থাকে', 'thake', 'stays, lives', 'verb', 146],
  ['হয়', 'hoy', 'becomes, happens', 'verb', 38],
  ['দেখে', 'dekhe', 'sees, watches', 'verb', 126],
  ['খেলি', 'kheli', 'I play', 'verb', 428],
  ['খেলে', 'khele', 'plays', 'verb', 418],
  ['কিনি', 'kini', 'I buy', 'verb', 444],
  ['কেনে', 'kene', 'buys', 'verb', 452],

  // --- Adjectives and colours ---------------------------------------------
  ['লাল', 'lal', 'red', 'adj', 312],
  ['নীল', 'nil', 'blue', 'adj', 344],
  ['সাদা', 'shada', 'white', 'adj', 284],
  ['কালো', 'kalo', 'black', 'adj', 264],
  ['সবুজ', 'shobuj', 'green', 'adj', 384],
  ['গরম', 'gorom', 'hot', 'adj', 254],
  ['ঠান্ডা', 'thanda', 'cold', 'adj', 274],
  ['সহজ', 'shohoj', 'easy', 'adj', 332],
  ['কঠিন', 'kothin', 'hard, difficult', 'adj', 316],
  ['লম্বা', 'lomba', 'tall, long', 'adj', 366],
  ['খুশি', 'khushi', 'happy', 'adj', 244],
  ['ক্লান্ত', 'klanto', 'tired', 'adj', 406],

  // --- Adverbs and function words -----------------------------------------
  ['তাড়াতাড়ি', 'taratari', 'quickly', 'adv', 356],
  ['ধীরে', 'dhire', 'slowly', 'adv', 394],
  ['এখানে', 'ekhane', 'here', 'adv', 116],
  ['সেখানে', 'shekhane', 'there', 'adv', 194],
  ['যদি', 'jodi', 'if', 'conj', 72],
  ['তাহলে', 'tahole', 'then, in that case', 'conj', 174],
  ['কারণ', 'karon', 'because', 'conj', 102],
  ['সব', 'shob', 'all, everything', 'pron', 44],
  ['কেউ', 'keu', 'someone, anyone', 'pron', 134],
  ['শুধু', 'shudhu', 'only', 'adv', 84],
  ['আবার', 'abar', 'again', 'adv', 106],
  ['সাথে', 'shathe', 'with', 'postp', 66],
  ['জন্য', 'jonno', 'for', 'postp', 56],
  ['থেকে', 'theke', 'from', 'postp', 46],
  ['মধ্যে', 'moddhe', 'among, inside', 'postp', 94],
  ['ভিতরে', 'bhitore', 'inside', 'postp', 226],
  ['বাইরে', 'baire', 'outside', 'postp', 236],
  ['উপরে', 'upore', 'above, on', 'postp', 186],
  ['নিচে', 'niche', 'below, under', 'postp', 206],
  // --- Round-2 tokenizer gaps ---------------------------------------------
  ['অধিকার', 'odhikar', 'right, entitlement', 'noun', 430],
  ['অফিস', 'office', 'office', 'noun', 326],
  ['আমাকে', 'amake', 'me, to me', 'pron', 114],
  ['আরও', 'aro', 'more', 'adv', 104],
  ['আসো', 'asho', 'you come', 'verb', 334],
  ['উচ্চারণ', 'uchcharon', 'pronunciation', 'noun', 640],
  ['এনেছি', 'enechhi', 'I brought', 'verb', 470],
  ['করতে', 'korte', 'to do', 'verb', 74],
  ['করেন', 'koren', 'does (polite)', 'verb', 164],
  ['কাছে', 'kachhe', 'near, to', 'postp', 86],
  ['চাও', 'chao', 'you want', 'verb', 342],
  ['চিঠি', 'chithi', 'letter', 'noun', 408],
  ['টেবিল', 'tebil', 'table', 'noun', 414],
  ['থাকো', 'thako', 'you stay, you live', 'verb', 372],
  ['দরকার', 'dorkar', 'need', 'noun', 202],
  ['নেই', 'nei', 'is not, there is not', 'verb', 54],
  ['পারিনি', 'parini', 'I could not', 'verb', 486],
  ['পারো', 'paro', 'you can', 'verb', 306],
  ['প্রতিদিন', 'protidin', 'every day', 'adv', 282],
  ['প্রশ্ন', 'proshno', 'question', 'noun', 256],
  ['বলার', 'bolar', 'of saying, to say', 'verb', 300],
  ['বানায়', 'banay', 'makes, prepares', 'verb', 422],
  ['বুঝতে', 'bujhte', 'to understand', 'verb', 314],
  ['ব্যবহার', 'byabohar', 'behaviour, use', 'noun', 276],
  ['ভালোবাসি', 'bhalobashi', 'I love', 'verb', 366],
  ['যাব', 'jabo', 'I will go', 'verb', 224],
  ['লাগে', 'lage', 'feels, seems, takes', 'verb', 124],
  ['শিক্ষার্থী', 'shikkharthi', 'student', 'noun', 460],
  ['শেখা', 'shekha', 'learning', 'noun', 380],
  ['শেষ', 'shesh', 'end, finished', 'noun', 144],
  ['সংস্কৃতি', 'shongskriti', 'culture', 'noun', 434],
  ['সবার', 'shobar', 'everyone\u2019s', 'pron', 154],
  ['সাহায্য', 'shahajjo', 'help', 'noun', 250],
  ['স্পষ্ট', 'spashto', 'clear, distinct', 'adj', 448],
  ['স্বাধীনতা', 'shadhinota', 'freedom, independence', 'noun', 456],
  ['হব', 'hobo', 'I will be', 'verb', 190],
  ['হাঁটে', 'hate', 'walks', 'verb', 440]
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
  ['আমি স্কুলে যাচ্ছি।', 'ami shkule jachchhi.', 'I am going to school.', 5],
  // ═══ Expansion round 2 ═══════════════════════════════════════════════════

  // Level 1 — two and three words, built only from the commonest lexemes
  ['আমি এখানে।', 'ami ekhane.', 'I am here.', 1],
  ['সে এখানে নেই।', 'she ekhane nei.', 'He is not here.', 1],
  ['এটা ভালো।', 'eta bhalo.', 'This is good.', 1],
  ['ওটা বড়।', 'ota boro.', 'That is big.', 1],
  ['আমি খুশি।', 'ami khushi.', 'I am happy.', 1],
  ['চা গরম।', 'cha gorom.', 'The tea is hot.', 1],
  ['পানি ঠান্ডা।', 'pani thanda.', 'The water is cold.', 1],
  ['আমার ভাই আছে।', 'amar bhai achhe.', 'I have a brother.', 1],
  ['তোমার বোন কোথায়?', 'tomar bon kothay?', 'Where is your sister?', 1],
  ['এখন কি?', 'ekhon ki?', 'What now?', 1],
  ['আমি ক্লান্ত।', 'ami klanto.', 'I am tired.', 1],
  ['বই লাল।', 'boi lal.', 'The book is red.', 1],

  // Level 2 — a subject, an object and a verb
  ['আমি চা খাই।', 'ami cha khai.', 'I drink tea.', 2],
  ['সে মাছ খায়।', 'she machh khay.', 'He eats fish.', 2],
  ['আমি এখানে থাকি।', 'ami ekhane thaki.', 'I live here.', 2],
  ['সে শহরে থাকে।', 'she shohore thake.', 'She lives in the city.', 2],
  ['আমি বই পড়ি।', 'ami boi pori.', 'I read a book.', 2],
  ['আমার বন্ধু আসে।', 'amar bondhu ashe.', 'My friend comes.', 2],
  ['আমি সকালে আসি।', 'ami shokale ashi.', 'I come in the morning.', 2],
  ['সে রাতে ঘুমায়।', 'she rate ghumay.', 'He sleeps at night.', 2],
  ['আমি বাজারে যাই।', 'ami bazare jai.', 'I go to the market.', 2],
  ['মা রুটি বানায়।', 'ma ruti banay.', 'Mother makes bread.', 2],
  ['আমি তোমার কথা শুনি।', 'ami tomar kotha shuni.', 'I hear what you say.', 2],
  ['সে চিঠি লেখে।', 'she chithi lekhe.', 'She writes a letter.', 2],
  ['ছেলেটা খেলে।', 'chheleta khele.', 'The boy plays.', 2],
  ['আমি দোকানে যাই।', 'ami dokane jai.', 'I go to the shop.', 2],
  ['বাবা অফিসে যায়।', 'baba officee jay.', 'Father goes to the office.', 2],
  ['আমি একটু চা চাই।', 'ami ektu cha chai.', 'I want a little tea.', 2],
  ['এটা আমার ঘর।', 'eta amar ghor.', 'This is my room.', 2],
  ['তার চোখ কালো।', 'tar chokh kalo.', 'Her eyes are black.', 2],

  // Level 3 — postpositions, time expressions, two clauses
  ['আমি বন্ধুর সাথে যাই।', 'ami bondhur shathe jai.', 'I go with a friend.', 3],
  ['সে সকাল থেকে এখানে আছে।', 'she shokal theke ekhane achhe.', 'He has been here since morning.', 3],
  ['বইটা টেবিলের উপরে আছে।', 'boita tebiler upore achhe.', 'The book is on the table.', 3],
  ['আমি তোমার জন্য এটা এনেছি।', 'ami tomar jonno eta enechhi.', 'I brought this for you.', 3],
  ['আজ অনেক গরম।', 'aj onek gorom.', 'It is very hot today.', 3],
  ['আমি কাল বাজারে যাব।', 'ami kal bazare jabo.', 'I will go to the market tomorrow.', 3],
  ['সে আমার সাথে কথা বলে।', 'she amar shathe kotha bole.', 'She talks with me.', 3],
  ['আমরা এক সাথে খাই।', 'amra ek shathe khai.', 'We eat together.', 3],
  ['তুমি কি এখানে থাকো?', 'tumi ki ekhane thako?', 'Do you live here?', 3],
  ['আমার পরিবার গ্রামে থাকে।', 'amar poribar grame thake.', 'My family lives in the village.', 3],
  ['সে খুব তাড়াতাড়ি হাঁটে।', 'she khub taratari hate.', 'He walks very quickly.', 3],
  ['বাংলা শেখা সহজ নয়।', 'bangla shekha shohoj noy.', 'Learning Bangla is not easy.', 3],
  ['আমি প্রতিদিন বাংলা পড়ি।', 'ami protidin bangla pori.', 'I study Bangla every day.', 3],
  ['তার তিনটা বই আছে।', 'tar tinta boi achhe.', 'She has three books.', 3],
  ['আমি দশ বছর এখানে আছি।', 'ami dosh bochhor ekhane achhi.', 'I have been here ten years.', 3],
  ['সে ডাক্তারের কাছে যায়।', 'she daktarer kachhe jay.', 'He goes to the doctor.', 3],
  ['আমরা সন্ধ্যায় চা খাই।', 'amra shondhay cha khai.', 'We drink tea in the evening.', 3],

  // Level 4 — conditionals, causals, compound verbs
  ['যদি তুমি আসো, আমি খুশি হব।', 'jodi tumi asho, ami khushi hobo.', 'If you come, I will be happy.', 4],
  ['আমি যাব না, কারণ আমি ক্লান্ত।', 'ami jabo na, karon ami klanto.', 'I will not go, because I am tired.', 4],
  ['সে বলল যে সে কাল আসবে।', 'she bollo je she kal ashbe.', 'He said that he would come tomorrow.', 4],
  ['আমাকে এখন যেতে হবে।', 'amake ekhon jete hobe.', 'I have to go now.', 4],
  ['তুমি কি আমাকে সাহায্য করতে পারো?', 'tumi ki amake shahajjo korte paro?', 'Can you help me?', 4],
  ['আমি বাংলা বলতে শিখছি।', 'ami bangla bolte shikhchhi.', 'I am learning to speak Bangla.', 4],
  ['সে কাজ শেষ করে বাড়ি যায়।', 'she kaj shesh kore bari jay.', 'She goes home after finishing work.', 4],
  ['আমার কিছু বলার আছে।', 'amar kichhu bolar achhe.', 'I have something to say.', 4],
  ['এই জায়গাটা আমার খুব ভালো লাগে।', 'ei jaygata amar khub bhalo lage.', 'I like this place very much.', 4],
  ['তুমি যদি চাও, আমরা এখন যেতে পারি।', 'tumi jodi chao, amra ekhon jete pari.', 'If you want, we can go now.', 4],
  ['আমি জানি না সে কোথায় আছে।', 'ami jani na she kothay achhe.', 'I do not know where he is.', 4],
  ['আমাদের আরও সময় দরকার।', 'amader aro shomoy dorkar.', 'We need more time.', 4],
  ['সে সবার সাথে ভালো ব্যবহার করে।', 'she shobar shathe bhalo byabohar kore.', 'He behaves well with everyone.', 4],

  // Level 5 — conjunct-dense, for script work
  ['শিক্ষক ছাত্রদের প্রশ্ন করেন।', 'shikkhok chhatroder proshno koren.', 'The teacher asks the students questions.', 5],
  ['আমার স্ত্রী হাসপাতালে কাজ করেন।', 'amar stri hashpatale kaj koren.', 'My wife works at the hospital.', 5],
  ['স্বাধীনতা আমাদের অধিকার।', 'shadhinota amader odhikar.', 'Freedom is our right.', 5],
  ['বিশ্ববিদ্যালয়ে অনেক শিক্ষার্থী আছে।', 'bishshobiddaloye onek shikkharthi achhe.', 'There are many students at the university.', 5],
  ['তার উচ্চারণ খুব স্পষ্ট।', 'tar uchcharon khub spashto.', 'His pronunciation is very clear.', 5],
  ['আমি বাংলা সংস্কৃতি ভালোবাসি।', 'ami bangla shongskriti bhalobashi.', 'I love Bengali culture.', 5],
  ['ধন্যবাদ, আপনার সাহায্যের জন্য।', 'dhonnobad, apnar shahajjer jonno.', 'Thank you for your help.', 5],
  ['ক্ষমা করবেন, আমি বুঝতে পারিনি।', 'khoma korben, ami bujhte parini.', 'Excuse me, I did not understand.', 5]
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
