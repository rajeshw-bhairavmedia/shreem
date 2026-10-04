import type { Category, Style } from '../types'

export const categories: { id: Category; label: string; image: string }[] = [
  { id: 'men', label: 'Men', image: '/look_timeless.jpg' },
  { id: 'women', label: 'Women', image: '/look_versatile.jpg' },
  { id: 'occasion', label: 'Occasion Wear', image: '/look_quality.jpg' },
]

/** Styles apply to the Men and Women categories. */
export const styles: { id: Style; label: string }[] = [
  { id: 'casual', label: 'Casual' },
  { id: 'formal', label: 'Formal' },
  { id: 'traditional', label: 'Traditional' },
]

export const hasStyles = (category: string) => category === 'men' || category === 'women'
