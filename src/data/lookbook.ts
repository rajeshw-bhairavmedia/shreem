export interface Look {
  headline: string
  body: string
  cta: string
  image: string
  align: 'left' | 'right'
}

export const looks: Look[] = [
  { headline: 'VERSATILE STYLE', body: 'From morning meetings to evening plans, clean lines that work anywhere.', cta: 'See styling notes', image: '/look_versatile.jpg', align: 'right' },
  { headline: 'FOR EVERY MOMENT', body: 'Lightweight layers and effortless movement, designed to keep up with your day.', cta: 'Shop daily wear', image: '/look_every_moment.jpg', align: 'left' },
  { headline: 'DESIGNED FOR MOVEMENT', body: 'Stretch-friendly fits, breathable fabrics, and details that stay clean on the go.', cta: 'View performance details', image: '/look_movement.jpg', align: 'right' },
  { headline: 'TIMELESS DESIGN', body: 'Minimal silhouettes, honest materials, and finishes that age beautifully.', cta: 'Explore essentials', image: '/look_timeless.jpg', align: 'left' },
  { headline: 'QUALITY YOU CAN FEEL', body: 'Soft hand-feel, durable construction, and finishes that last wash after wash.', cta: 'Read fabric care', image: '/look_quality.jpg', align: 'right' },
  { headline: 'MADE FOR YOU', body: 'A fit that feels right and a look that stays true. No noise, just comfort.', cta: 'Find your size', image: '/look_made_for_you.jpg', align: 'left' },
  { headline: 'FIND YOUR FIT', body: 'A range of sizes and fits designed to look good on real people: clean, modern, wearable.', cta: 'View size guide', image: '/look_find_your_fit.jpg', align: 'right' },
]
