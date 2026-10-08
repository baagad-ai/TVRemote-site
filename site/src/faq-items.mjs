import faq from './faq.json' with { type: 'json' };
// With Play testing on, the Google Play answer changes; everything else is shared.
const playAnswer = 'Yes, in testing. Join the tester group and opt in on Google Play from our join page; it takes about a minute. You can also download the APK from this site today.';
export const faqItems = play => play ? faq.map(item => item.q === 'Is it on Google Play?' ? { ...item, a: playAnswer } : item) : faq;
