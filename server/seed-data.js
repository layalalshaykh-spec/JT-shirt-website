// Real JT Shirts catalog (source: jtshirts.net), modelled for B2B volume pricing.
//
// Two product types:
//   'item'    -> custom workwear, priced by volume tiers, 25-unit minimum per item.
//   'program' -> fixed-price starter bundles, minimum 1.
//
// `tiers` is sorted ascending by minQty. The unit price for a quantity is the
// price of the highest tier whose minQty the quantity meets or exceeds.
// `price` is the "from" price shown in listings (the best/lowest tier).
//
// Images are workwear placeholders (jtshirts.net renders garments in 3D, not photos).
// Swap `image`/`images` for real product photography before launch.

export const seedProducts = [
  {
    slug: 'custom-polo',
    type: 'item',
    name: 'Custom Polo',
    category: 'Polos',
    minOrder: 25,
    tiers: [
      { minQty: 25, price: 24.99 },
      { minQty: 50, price: 21.99 },
      { minQty: 100, price: 18.99 }
    ],
    price: 18.99,
    rating: 4.8,
    reviews: 142,
    badges: ['bestseller'],
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop'
    ],
    colors: [
      { name: 'Black', hex: '#0E0E0C' },
      { name: 'Navy', hex: '#1E3A5F' },
      { name: 'Charcoal', hex: '#374151' },
      { name: 'White', hex: '#FFFFFF' }
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    description: 'Performance pique polo built for daily wear across service routes and customer sites. Embroidered or printed logo, wrinkle-resistant finish, and a consistent fit sized to your crew.',
    specs: { Material: 'Performance pique', Logo: 'Embroidered or printed', Finish: 'Wrinkle-resistant', 'Min order': '25 units' }
  },
  {
    slug: 'work-shirt',
    type: 'item',
    name: 'Work Shirt',
    category: 'Work Shirts',
    minOrder: 25,
    tiers: [
      { minQty: 25, price: 29.99 },
      { minQty: 50, price: 26.99 },
      { minQty: 100, price: 23.99 }
    ],
    price: 23.99,
    rating: 4.9,
    reviews: 208,
    badges: ['bestseller'],
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&h=600&fit=crop'
    ],
    colors: [
      { name: 'Charcoal', hex: '#374151' },
      { name: 'Navy', hex: '#1E3A5F' },
      { name: 'Khaki', hex: '#B8A179' },
      { name: 'Black', hex: '#0E0E0C' }
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    description: '7oz twill work shirt with a double chest pocket and reinforced stitching at every stress point. Field tested on construction sites and manufacturing floors.',
    specs: { Material: '7oz twill', Pockets: 'Double chest', Stitching: 'Reinforced', 'Min order': '25 units' }
  },
  {
    slug: 't-shirt',
    type: 'item',
    name: 'T-Shirt',
    category: 'T-Shirts',
    minOrder: 25,
    tiers: [
      { minQty: 25, price: 17.99 },
      { minQty: 50, price: 16.99 },
      { minQty: 100, price: 15.99 }
    ],
    price: 15.99,
    rating: 4.7,
    reviews: 176,
    badges: [],
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop'
    ],
    colors: [
      { name: 'Black', hex: '#0E0E0C' },
      { name: 'Safety Orange', hex: '#FF6B00' },
      { name: 'Navy', hex: '#1E3A5F' },
      { name: 'Charcoal', hex: '#374151' },
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Safety Yellow', hex: '#FFD700' }
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    description: 'Heavy-duty cotton crew tee with a tagless neckline and reinforced shoulder seams. Screen print or heat transfer branding. The everyday layer for the whole crew.',
    specs: { Material: 'Heavy cotton', Neckline: 'Tagless', Branding: 'Screen print or heat transfer', 'Min order': '25 units' }
  },
  {
    slug: 'jacket',
    type: 'item',
    name: 'Jacket',
    category: 'Jackets',
    minOrder: 25,
    tiers: [
      { minQty: 25, price: 49.99 },
      { minQty: 50, price: 44.99 },
      { minQty: 100, price: 39.99 }
    ],
    price: 39.99,
    rating: 4.9,
    reviews: 97,
    badges: ['new'],
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop'
    ],
    colors: [
      { name: 'Black', hex: '#0E0E0C' },
      { name: 'Navy', hex: '#1E3A5F' },
      { name: 'Graphite', hex: '#2B2F33' }
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    description: 'Softshell jacket with a water-resistant shell and embroidered chest branding. Year-round weight that carries your brand from foreman to field tech through every season.',
    specs: { Material: 'Softshell', Shell: 'Water resistant', Branding: 'Embroidered chest', 'Min order': '25 units' }
  },
  {
    slug: 'cap',
    type: 'item',
    name: 'Cap',
    category: 'Caps',
    minOrder: 25,
    tiers: [
      { minQty: 25, price: 15.0 },
      { minQty: 50, price: 10.0 },
      { minQty: 100, price: 5.0 }
    ],
    price: 5.0,
    rating: 4.6,
    reviews: 118,
    badges: ['sale'],
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&h=600&fit=crop'
    ],
    colors: [
      { name: 'Black', hex: '#0E0E0C' },
      { name: 'Navy', hex: '#1E3A5F' },
      { name: 'Safety Orange', hex: '#FF6B00' },
      { name: 'Safety Yellow', hex: '#FFD700' }
    ],
    sizes: ['One Size'],
    description: '6-panel structured cap with an embroidered front panel and an adjustable closure. The lowest-cost brand carrier in the program, and the easiest to hand out.',
    specs: { Panels: '6-panel structured', Front: 'Embroidered', Closure: 'Adjustable', 'Min order': '25 units' }
  }
];

// Fixed-price starter programs (source: jtshirts.net Programs section).
export const seedPrograms = [
  {
    slug: 'foundation-program',
    type: 'program',
    name: 'Foundation',
    category: 'Programs',
    tierLabel: 'Starter',
    minOrder: 1,
    price: 1249,
    badges: [],
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop',
    images: ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop'],
    features: ['50 custom polos', '50 embroidered caps', 'Standardized spec sheet', 'Single-cycle delivery'],
    description: 'A starting program for a core workforce that needs consistent basics. Standardized spec, single delivery cycle, ready to reorder the same way next time.',
    focus: 'Core workforce, basic functionality'
  },
  {
    slug: 'operational-program',
    type: 'program',
    name: 'Operational',
    category: 'Programs',
    tierLabel: 'Professional',
    minOrder: 1,
    price: 4499,
    badges: ['bestseller'],
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&h=400&fit=crop',
    images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop'],
    features: ['100 custom polos', 'Work pants, sized to crew', 'Embroidered caps', 'Quarterly reorder cycle'],
    description: 'The most-picked program. Built for operational efficiency across a full crew, with a quarterly reorder cycle that keeps sizing and branding locked in.',
    focus: 'Operational efficiency'
  },
  {
    slug: 'full-field-program',
    type: 'program',
    name: 'Full Field',
    category: 'Programs',
    tierLabel: 'Crew',
    minOrder: 1,
    price: 5999,
    badges: [],
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&h=400&fit=crop',
    images: ['https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&h=600&fit=crop'],
    features: ['High-vis safety vests', 'Workwear shirts and jackets', 'Compliance documentation', 'Multi-site fulfillment'],
    description: 'A compliance-ready program for high-volume, multi-site operations. High-vis safety gear, full workwear, and the documentation to back it up.',
    focus: 'Compliance, high-volume sites'
  }
];
