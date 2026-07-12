// Ayurveda — prakriti (constitution) self-assessment + dosha guidance.
// Curated from classical Ayurvedic sources (Charaka/Ashtanga Hridaya themes).
// Educational wellness guidance, not medical advice.

export type Dosha = 'vata' | 'pitta' | 'kapha';

export interface QuizQ {
  q: string;
  options: { label: string; dosha: Dosha }[];
}

export const PRAKRITI_QUIZ: QuizQ[] = [
  { q: 'Your body frame is naturally…', options: [
    { label: 'Thin, light, hard to gain weight', dosha: 'vata' },
    { label: 'Medium, athletic, well-proportioned', dosha: 'pitta' },
    { label: 'Solid, broad, gains weight easily', dosha: 'kapha' }] },
  { q: 'Your skin tends to be…', options: [
    { label: 'Dry, rough, cool', dosha: 'vata' },
    { label: 'Warm, reddish, prone to rashes', dosha: 'pitta' },
    { label: 'Thick, soft, oily, cool', dosha: 'kapha' }] },
  { q: 'Your appetite is usually…', options: [
    { label: 'Irregular — sometimes hungry, sometimes not', dosha: 'vata' },
    { label: 'Strong and sharp — I get irritable if I skip meals', dosha: 'pitta' },
    { label: 'Steady but I can easily skip a meal', dosha: 'kapha' }] },
  { q: 'Under stress you tend to feel…', options: [
    { label: 'Anxious, worried, scattered', dosha: 'vata' },
    { label: 'Irritable, angry, critical', dosha: 'pitta' },
    { label: 'Withdrawn, heavy, avoidant', dosha: 'kapha' }] },
  { q: 'Your sleep is generally…', options: [
    { label: 'Light, easily disturbed', dosha: 'vata' },
    { label: 'Moderate, sound but short', dosha: 'pitta' },
    { label: 'Deep, long, hard to wake', dosha: 'kapha' }] },
  { q: 'Your energy through the day…', options: [
    { label: 'Comes in bursts, then tires', dosha: 'vata' },
    { label: 'Intense and focused', dosha: 'pitta' },
    { label: 'Steady and enduring', dosha: 'kapha' }] },
  { q: 'You learn and remember by…', options: [
    { label: 'Learning fast but forgetting fast', dosha: 'vata' },
    { label: 'Sharp understanding, good memory', dosha: 'pitta' },
    { label: 'Learning slowly but never forgetting', dosha: 'kapha' }] },
  { q: 'Your weather preference…', options: [
    { label: 'I dislike cold and wind', dosha: 'vata' },
    { label: 'I dislike heat and sun', dosha: 'pitta' },
    { label: 'I dislike cold and damp', dosha: 'kapha' }] },
  { q: 'Your typical spending / decisions…', options: [
    { label: 'Spontaneous, changeable', dosha: 'vata' },
    { label: 'Planned, decisive', dosha: 'pitta' },
    { label: 'Cautious, saving, slow to decide', dosha: 'kapha' }] },
  { q: 'Your speech is usually…', options: [
    { label: 'Fast, talkative, tangential', dosha: 'vata' },
    { label: 'Sharp, precise, persuasive', dosha: 'pitta' },
    { label: 'Slow, calm, measured', dosha: 'kapha' }] },
];

export interface DoshaProfile {
  name: string; nameHi: string; elements: string; color: string; icon: string;
  nature: string;
  balanced: string; imbalanced: string;
  favor: string[]; reduce: string[]; routine: string[];
}

export const DOSHAS: Record<Dosha, DoshaProfile> = {
  vata: {
    name: 'Vata', nameHi: 'वात', elements: 'Air + Ether', color: '#7C3AED', icon: 'weather-windy',
    nature: 'Light, dry, cool, mobile, quick. Vata governs movement, breath, circulation and the nervous system. Creative, energetic and adaptable when balanced.',
    balanced: 'Lively, imaginative, enthusiastic, flexible.',
    imbalanced: 'Anxiety, restlessness, dry skin, constipation, insomnia, feeling scattered or cold.',
    favor: ['Warm, cooked, moist, lightly oily foods', 'Sweet, sour, salty tastes', 'Ghee, warm milk, soups, root vegetables', 'Regular warm meals at fixed times'],
    reduce: ['Cold, raw, dry, crunchy foods', 'Excess caffeine and stimulants', 'Skipping meals; irregular routine', 'Too much travel and screen time'],
    routine: ['Keep a steady daily rhythm — same sleep/meal times', 'Warm oil (til) self-massage (abhyanga)', 'Gentle grounding yoga, slow breathing (Nadi Shodhana)', 'Early, warm, unhurried bedtime'],
  },
  pitta: {
    name: 'Pitta', nameHi: 'पित्त', elements: 'Fire + Water', color: '#DC2626', icon: 'fire',
    nature: 'Hot, sharp, light, oily, penetrating. Pitta governs digestion, metabolism and transformation. Focused, intelligent and driven when balanced.',
    balanced: 'Sharp intellect, warmth, courage, good leadership and digestion.',
    imbalanced: 'Irritability, anger, acidity, heartburn, inflammation, skin rashes, overheating.',
    favor: ['Cool, fresh, mildly heavy foods', 'Sweet, bitter, astringent tastes', 'Coconut, cucumber, milk, leafy greens, sweet fruit', 'Regular meals — avoid getting over-hungry'],
    reduce: ['Spicy, sour, salty, fried, fermented foods', 'Alcohol, excess coffee, red meat', 'Skipping meals, over-working', 'Midday sun and excess heat'],
    routine: ['Avoid the hottest part of the day; keep cool', 'Cooling breath (Sheetali), moonlight walks', 'Moderate exercise — not to exhaustion', 'Practice patience, seva; let go of perfectionism'],
  },
  kapha: {
    name: 'Kapha', nameHi: 'कफ', elements: 'Earth + Water', color: '#2D6A4F', icon: 'water',
    nature: 'Heavy, slow, cool, oily, stable, dense. Kapha governs structure, immunity and lubrication. Calm, loving, strong and steady when balanced.',
    balanced: 'Steady, compassionate, forgiving, strong immunity and stamina.',
    imbalanced: 'Lethargy, weight gain, congestion, attachment, oversleeping, dullness, cold/cough.',
    favor: ['Light, warm, dry, well-spiced foods', 'Pungent, bitter, astringent tastes', 'Honey, ginger, legumes, leafy greens', 'Fewer, lighter meals; a light or skipped breakfast'],
    reduce: ['Heavy, oily, sweet, cold, dairy-rich foods', 'Overeating and daytime sleep', 'Sedentary habits', 'Excess salt and fried food'],
    routine: ['Wake early (before 6am); stay active', 'Vigorous exercise / brisk walk daily', 'Energising breath (Kapalabhati), dry brushing', 'Seek variety and new experiences to avoid stagnation'],
  },
};
