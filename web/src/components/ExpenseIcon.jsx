const KW = [
  { keys: ['dinner', 'lunch', 'breakfast', 'food', 'restaurant', 'pizza', 'burger', 'cafe', 'coffee'], emoji: '🍽️' },
  { keys: ['cab', 'uber', 'ola', 'taxi', 'ride', 'auto', 'transport', 'fuel', 'petrol', 'gas'], emoji: '🚕' },
  { keys: ['hotel', 'stay', 'room', 'airbnb', 'hostel'], emoji: '🏨' },
  { keys: ['flight', 'plane', 'air', 'ticket'], emoji: '✈️' },
  { keys: ['train', 'railway', 'metro', 'bus'], emoji: '🚆' },
  { keys: ['movie', 'cinema', 'show', 'concert'], emoji: '🎬' },
  { keys: ['grocery', 'groceries', 'market', 'supermarket'], emoji: '🛒' },
  { keys: ['rent', 'bill', 'electricity', 'water', 'internet', 'wifi'], emoji: '🏠' },
  { keys: ['gift', 'present', 'birthday'], emoji: '🎁' },
  { keys: ['medicine', 'medical', 'doctor', 'hospital'], emoji: '💊' },
  { keys: ['shopping', 'clothes', 'shoes', 'amazon', 'flipkart'], emoji: '🛍️' },
];
export default function ExpenseIcon({ description = '', size = 38 }) {
  const lower = description.toLowerCase();
  const m = KW.find((c) => c.keys.some((k) => lower.includes(k)));
  const emoji = m ? m.emoji : '💸';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #eef6f3, #d9ede7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, flexShrink: 0 }}>
      {emoji}
    </div>
  );
}