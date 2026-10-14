const imageMap: Record<string, string> = {
  'Air Max 90':                   '/images/nike-air-max-90.jpg',
  'Air Force 1 Low':              '/images/nike-air-force-1.jpg',
  'React Infinity Run Flyknit 3': '/images/nike-react-infinity.jpg',
  'Dunk Low Retro':               '/images/nike-dunk-low.jpg',
  'Ultraboost 22':                '/images/adidas-ultraboost-22.jpg',
  'Stan Smith':                   '/images/adidas-stan-smith.jpg',
  'NMD_R1':                       '/images/adidas-nmd-r1.jpg',
  'Gazelle Bold':                 '/images/adidas-gazelle.jpg',
  '990v5 Made in USA':            '/images/nb-990v5.jpg',
  '574 Core':                     '/images/nb-574.jpg',
  'Old Skool':                    '/images/vans-old-skool.jpg',
  'Authentic Canvas':             '/images/vans-authentic.jpg',
};

export function getProductImage(productName: string, fallback = ''): string {
  return imageMap[productName] ?? fallback;
}
