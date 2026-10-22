import type { Assessment } from "../domain/curriculum";
import type { Lesson, Tutor, Evaluation, Role } from "../domain/types";
export const demoProfiles: Record<
  Role,
  { name: string; label: string; description: string }
> = {
  learner: {
    name: "Aarav",
    label: "Learner",
    description: "Find your people. Make sense of tricky things.",
  },
  tutor: {
    name: "Aditi",
    label: "Peer Tutor",
    description: "Share what you know. Grow as you teach.",
  },
  guardian: {
    name: "Kavita",
    label: "Parent / Guardian",
    description: "Stay close to your child’s learning journey.",
  },
  champion: {
    name: "Anita",
    label: "Local Champion",
    description: "Build trust and support your village.",
  },
  admin: {
    name: "Dev",
    label: "Administrator",
    description: "Understand participation and service readiness.",
  },
};
export const tutors: Tutor[] = [
  {
    id: "aditi",
    name: "Aditi",
    initials: "A",
    grade: 11,
    subjects: ["Mathematics", "Science"],
    languages: ["English", "मराठी", "हिन्दी"],
    tss: 92,
    sessions: 38,
    available: true,
    verified: true,
    color: "peach",
    tier: "Village Guide",
    bio: "A little patience. A familiar example. That’s where understanding begins.",
    approach:
      "Everyday analogies, visual thinking, and plenty of time for your questions.",
    slots: ["Today, 5:30 PM", "Tomorrow, 4:00 PM", "Tomorrow, 6:00 PM"],
  },
  {
    id: "rohan",
    name: "Rohan",
    initials: "R",
    grade: 12,
    subjects: ["Mathematics", "English"],
    languages: ["English", "हिन्दी"],
    tss: 88,
    sessions: 31,
    available: true,
    verified: true,
    color: "sage",
    tier: "Mentor",
    bio: "Let’s turn that “I can’t” into “I get it”. One small step at a time.",
    approach: "Worked examples followed by a question you can try on your own.",
    slots: ["Today, 6:00 PM", "Tomorrow, 5:00 PM"],
  },
  {
    id: "meera",
    name: "Meera",
    initials: "M",
    grade: 10,
    subjects: ["Science", "English"],
    languages: ["English", "मराठी", "తెలుగు"],
    tss: 85,
    sessions: 27,
    available: false,
    verified: true,
    color: "lilac",
    tier: "Mentor",
    bio: "Science is all around us. We just need to know where to look.",
    approach: "Observation, simple experiments, and drawing the idea together.",
    slots: ["Tomorrow, 4:30 PM", "Saturday, 10:00 AM"],
  },
  {
    id: "ishaan",
    name: "Ishaan",
    initials: "I",
    grade: 11,
    subjects: ["Mathematics", "Science"],
    languages: ["English", "मराठी"],
    tss: 78,
    sessions: 19,
    available: true,
    verified: true,
    color: "butter",
    tier: "Explainer",
    bio: "No question is too small. Especially the one you haven’t asked yet.",
    approach:
      "Building confidence with short practice questions and clear feedback.",
    slots: ["Today, 7:00 PM", "Tomorrow, 5:30 PM"],
  },
  {
    id: "sana",
    name: "Sana",
    initials: "S",
    grade: 12,
    subjects: ["English", "Social Science"],
    languages: ["English", "हिन्दी", "తెలుగు"],
    tss: 94,
    sessions: 46,
    available: true,
    verified: true,
    color: "blue",
    tier: "Village Guide",
    bio: "Stories make everything easier to remember. Let’s find yours.",
    approach:
      "Storytelling, conversation, and connecting new ideas to what you know.",
    slots: ["Today, 5:00 PM", "Tomorrow, 6:30 PM"],
  },
];
const originalLessons: (Omit<
  Lesson,
  "boardId" | "chapterId" | "assessmentId" | "language"
> &
  Pick<Assessment, "question" | "options" | "answer" | "explanation">)[] = [
  {
    id: "fractions",
    subject: "Mathematics",
    title: "Fractions, made familiar",
    subtitle: "A whole new way to see the parts.",
    grade: 6,
    minutes: 8,
    concept:
      "A fraction tells us how many equal parts of a whole we have. The denominator names the equal parts. The numerator counts the parts we take.",
    steps: [
      "Start with one roti. Divide it into 4 equal pieces. Each piece is one fourth, or 1/4.",
      "Take 3 pieces. You now have 3/4. The 4 names the size of each part; the 3 counts your pieces.",
      "To add fractions with the same denominator, count the pieces: 1/4 + 2/4 = 3/4.",
      "For different denominators, first rename the fractions with equal-sized pieces: 1/2 = 2/4, so 1/2 + 1/4 = 3/4.",
    ],
    example:
      "Two friends share a roti equally. Each gets 1/2. If one friend shares their half equally again, each new piece is 1/4 of the original roti.",
    question:
      "You have 1/2 of a roti and receive another 1/4. How much do you have?",
    options: ["2/6 of a roti", "3/4 of a roti", "1/8 of a roti"],
    answer: 1,
    explanation:
      "1/2 is the same as 2/4. Add 2/4 and 1/4 to get 3/4. We count equal-sized parts, so the denominator stays 4.",
    keywords: [
      "fraction",
      "roti",
      "half",
      "quarter",
      "denominator",
      "numerator",
    ],
  },
  {
    id: "equations",
    subject: "Mathematics",
    title: "Keeping the balance",
    subtitle: "Your first steps with linear equations.",
    grade: 8,
    minutes: 10,
    concept:
      "An equation is like a balanced weighing scale. Whatever you do to one side, you must do to the other.",
    steps: [
      "In x + 5 = 12, x is an unknown number.",
      "Subtract 5 from both sides: x + 5 − 5 = 12 − 5.",
      "Simplify both sides: x = 7.",
      "Check by replacing x in the original equation: 7 + 5 = 12. Both sides are equal.",
    ],
    example:
      "A bag of mangoes and 5 loose mangoes weigh the same as 12 loose mangoes. Remove 5 mangoes from both sides. The bag holds 7.",
    question: "What is x if 2x = 14?",
    options: ["7", "12", "28"],
    answer: 0,
    explanation: "Divide both sides by 2. That gives x = 7. Check: 2 × 7 = 14.",
    keywords: ["equation", "algebra", "linear", "balance", "solve", "2x"],
  },
  {
    id: "photosynthesis",
    subject: "Science",
    title: "A leaf’s little kitchen",
    subtitle: "How plants make their own food.",
    grade: 7,
    minutes: 7,
    concept:
      "Green plants use light energy to turn carbon dioxide and water into sugars. This process is called photosynthesis. Oxygen is released.",
    steps: [
      "Roots absorb water from the soil. It travels to the leaves.",
      "Leaves take in carbon dioxide through tiny openings called stomata.",
      "Chlorophyll, the green pigment, captures sunlight.",
      "Using light energy, the plant makes sugars from water and carbon dioxide and releases oxygen.",
    ],
    example:
      "Think of a leaf as a kitchen. Water and carbon dioxide are ingredients; sunlight supplies energy. The plant makes sugar, its food.",
    question: "Which gas do plants take in for photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide"],
    answer: 2,
    explanation:
      "Plants use carbon dioxide and water to make sugars using light energy. Oxygen is a product of this process.",
    keywords: [
      "photo",
      "plant",
      "leaf",
      "chlorophyll",
      "oxygen",
      "carbon",
      "sunlight",
    ],
  },
  {
    id: "tenses",
    subject: "English",
    title: "A story in three times",
    subtitle: "Past, present, and possibilities.",
    grade: 6,
    minutes: 6,
    concept:
      "Verb tenses help us understand when an action happens. We can talk about the past, the present, or the future.",
    steps: [
      "Simple present describes habits: “I walk to school every day.”",
      "Simple past describes a completed action: “I walked to school yesterday.”",
      "Simple future describes an action yet to happen: “I will walk to school tomorrow.”",
      "Look for time words such as yesterday, every day, and tomorrow to help choose a tense.",
    ],
    example:
      "Every day, Riya waters her plant. Yesterday, she watered it early. Tomorrow, she will water it after breakfast.",
    question: "Which sentence describes a completed action?",
    options: [
      "I play cricket every day.",
      "I played cricket yesterday.",
      "I will play cricket tomorrow.",
    ],
    answer: 1,
    explanation:
      "“Played” is in the simple past. “Yesterday” tells us that the action is completed.",
    keywords: [
      "tense",
      "verb",
      "grammar",
      "past",
      "present",
      "future",
      "english",
    ],
  },
  {
    id: "water",
    subject: "Science",
    title: "The journey of a raindrop",
    subtitle: "Round and round the water cycle.",
    grade: 6,
    minutes: 7,
    concept:
      "Water moves between land, oceans, and the atmosphere through evaporation, condensation, and precipitation.",
    steps: [
      "The Sun heats water. Some liquid water becomes water vapour: evaporation.",
      "As moist air cools, water vapour condenses into tiny droplets, forming clouds.",
      "When droplets grow heavy enough, water falls as rain or other precipitation.",
      "Water collects in rivers, lakes, and oceans. Some soaks into the ground. The cycle continues.",
    ],
    example:
      "A puddle dries after a sunny day. The water has evaporated; it has not disappeared from Earth.",
    question: "What do we call water vapour cooling into liquid droplets?",
    options: ["Evaporation", "Condensation", "Precipitation"],
    answer: 1,
    explanation:
      "Condensation changes water vapour into liquid water, like droplets on the outside of a cold glass.",
    keywords: ["water", "rain", "cloud", "evaporation", "condensation"],
  },
  {
    id: "panchayat",
    subject: "Social Science",
    title: "Your village, your voice",
    subtitle: "Meet local self-government.",
    grade: 6,
    minutes: 8,
    concept:
      "A Gram Sabha brings together adult voters in a village. A Gram Panchayat is an elected local body that works on village needs.",
    steps: [
      "The Gram Sabha includes people aged 18 or above who are registered voters in its area.",
      "People elect representatives to the Gram Panchayat.",
      "The Panchayat works on local matters such as water, sanitation, and village roads.",
      "The Gram Sabha can discuss plans and ask questions about the Panchayat’s work.",
    ],
    example:
      "If a village water pump needs repair, residents can raise it in the Gram Sabha and ask the Panchayat about a plan.",
    question: "Who can participate as a member of the Gram Sabha?",
    options: [
      "Only elected representatives",
      "All registered adult voters in its area",
      "Only school teachers",
    ],
    answer: 1,
    explanation:
      "The Gram Sabha includes all registered adult voters in the area, giving residents a voice in local decisions.",
    keywords: ["village", "panchayat", "sabha", "civics", "government"],
  },
  {
    id: "prime-factors",
    subject: "Mathematics",
    grade: 10,
    title: "The building blocks of a number",
    subtitle: "Prime factorisation and why it is unique.",
    minutes: 8,
    concept:
      "Every composite number can be written as a product of prime numbers. The prime factors are unique, apart from their order. This is the Fundamental Theorem of Arithmetic.",
    steps: [
      "Start with 60. It is even, so 60 = 2 × 30.",
      "Split 30 into 2 × 15, then split 15 into 3 × 5.",
      "Now every factor is prime: 60 = 2 × 2 × 3 × 5 = 2² × 3 × 5.",
      "Starting with 60 = 6 × 10 leads to the same prime factors. Only their order changes.",
    ],
    example:
      "A factor tree can branch in different ways. Like taking different routes to a village, each route ends at the same set of prime building blocks.",
    question: "Which is the prime factorisation of 84?",
    options: ["2 × 6 × 7", "2² × 3 × 7", "2 × 3² × 7"],
    answer: 1,
    explanation:
      "84 = 2 × 42 = 2 × 2 × 21 = 2² × 3 × 7. Every factor in the final product is prime.",
    keywords: ["prime", "factor", "arithmetic", "real number"],
  },
  {
    id: "hcf-lcm",
    subject: "Mathematics",
    grade: 10,
    title: "Finding common ground",
    subtitle: "Use prime factors to find HCF and LCM.",
    minutes: 9,
    concept:
      "The HCF uses the smallest powers of the prime factors shared by two positive integers. The LCM uses the largest powers of every prime factor present.",
    steps: [
      "Write 12 = 2² × 3 and 18 = 2 × 3².",
      "For the HCF, take the smaller shared powers: 2 × 3 = 6.",
      "For the LCM, take the larger powers: 2² × 3² = 36.",
      "Check: for two positive integers, HCF × LCM = the product of the integers. Here 6 × 36 = 12 × 18 = 216.",
    ],
    example:
      "To divide 12 pencils and 18 erasers into the greatest number of identical sets without leftovers, make 6 sets. Each has 2 pencils and 3 erasers.",
    question: "What are the HCF and LCM of 8 and 12?",
    options: ["2 and 48", "4 and 24", "4 and 96"],
    answer: 1,
    explanation:
      "8 = 2³ and 12 = 2² × 3. HCF = 2² = 4; LCM = 2³ × 3 = 24. Their product is 96, the same as 8 × 12.",
    keywords: ["hcf", "lcm", "common", "multiple"],
  },
];
// Stable legacy lesson IDs preserve bookmarks and checkpoint records. Original
// notes are supplementary; only the Grade 10 chapter metadata has a source.
export const assessments: Assessment[] = [];
export const lessons: Lesson[] = originalLessons.map((original) => {
  const { question, options, answer, explanation, ...lesson } = original;
  const assessmentId = `${lesson.id}-checkpoint`;
  assessments.push({
    id: assessmentId,
    lessonId: lesson.id,
    question,
    options,
    answer,
    explanation,
  });
  return {
    ...lesson,
    boardId: "cbse",
    language: "English",
    assessmentId,
    chapterId:
      lesson.grade === 10
        ? "cbse-10-math-real-numbers"
        : lesson.id === "equations"
          ? "cbse-8-math-linear-equations"
          : `supplementary-${lesson.id}`,
  };
});

export const sampleEvaluation: Evaluation = {
  correctness: 96,
  completeness: 88,
  clarity: 91,
  reasoning: 86,
  tone: 98,
};
export const knowledgeCards = [
  {
    id: "roti",
    subject: "Mathematics",
    title: "A roti can explain fractions.",
    body: "Equal parts make the difference. Split one roti into four equal pieces. Two pieces are 2/4 — exactly the same amount as 1/2. A bigger denominator means smaller pieces when the whole stays the same.",
    color: "peach",
    lessonId: "fractions",
    tag: "An everyday analogy",
  },
  {
    id: "leaf",
    subject: "Science",
    title: "The busiest kitchen is a leaf.",
    body: "A leaf takes water from the roots and carbon dioxide from the air. Chlorophyll captures sunlight to power food-making. The sugar nourishes the plant; oxygen is released.",
    color: "sage",
    lessonId: "photosynthesis",
    tag: "Look a little closer",
  },
  {
    id: "balance",
    subject: "Mathematics",
    title: "Algebra is a balancing act.",
    body: "Think of an equation as a balance. Subtract the same number from both sides and it stays balanced. That is why x + 5 = 12 becomes x = 7 when we subtract 5 from both sides.",
    color: "blue",
    lessonId: "equations",
    tag: "One idea, made simpler",
  },
];
