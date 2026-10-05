-- Starter catalog (the products from the original site). Images are served from the website's public/ folder.
-- Stock numbers are placeholders: set real quantities in /admin.
insert into public.products
  (slug, name, description, price, original_price, category, style, images, sizes, colors, stock, is_new, is_bestseller, sort_order)
values
  ('ivory-chikankari-kurta', 'Ivory Chikankari Kurta',
   'Handcrafted Chikankari embroidery on premium cotton. This elegant kurta features intricate floral motifs and a comfortable fit, perfect for both casual and semi-formal occasions.',
   2499, 2999, 'women', 'casual', '{/product_kurta_1.jpg}', '{XS,S,M,L,XL,XXL}', '{Ivory,Peach,Mint}',
   '{"XS":10,"S":10,"M":10,"L":10,"XL":10,"XXL":10}', false, true, 1),
  ('royal-blue-zardozi-kurta-set', 'Royal Blue Zardozi Kurta Set',
   'Exquisite zardozi work on silk blend fabric. This royal blue kurta comes with matching bottom and dupatta, ideal for weddings and festive celebrations.',
   5999, 7499, 'occasion', null, '{/product_kurta_2.jpg}', '{S,M,L,XL,XXL}', '{"Royal Blue",Maroon,Emerald}',
   '{"S":10,"M":10,"L":10,"XL":10,"XXL":10}', true, false, 2),
  ('maroon-silk-kurta', 'Maroon Silk Kurta',
   'Pure silk kurta with minimal embroidery. A timeless piece that combines traditional craftsmanship with contemporary design.',
   3499, null, 'men', 'traditional', '{/product_kurta_3.jpg}', '{S,M,L,XL,XXL,3XL}', '{Maroon,Navy,Black}',
   '{"S":10,"M":10,"L":10,"XL":10,"XXL":10,"3XL":10}', false, true, 3),
  ('olive-banarasi-dupatta', 'Olive Banarasi Dupatta',
   'Handwoven Banarasi dupatta with intricate gold zari work. A versatile accessory that elevates any outfit.',
   1899, 2299, 'women', 'traditional', '{/product_dupatta_1.jpg}', '{"Free Size"}', '{Olive,Red,Gold}',
   '{"Free Size":10}', false, false, 4),
  ('black-embroidered-kurta', 'Black Embroidered Kurta',
   'Sophisticated black kurta with silver thread embroidery. Perfect for evening events and special occasions.',
   4299, null, 'men', 'formal', '{/product_kurta_4.jpg}', '{M,L,XL,XXL}', '{Black,White,Grey}',
   '{"M":10,"L":10,"XL":10,"XXL":10}', true, false, 5),
  ('sage-green-anarkali', 'Sage Green Anarkali',
   'Flowing anarkali suit with delicate floral embroidery. The flattering silhouette and soft fabric make it perfect for all-day wear.',
   4999, 5999, 'women', 'traditional', '{/product_anarkali_1.jpg}', '{XS,S,M,L,XL}', '{Sage,Peach,Lavender}',
   '{"XS":10,"S":10,"M":10,"L":10,"XL":10}', false, true, 6),
  ('ivory-palazzo-pants', 'Ivory Palazzo Pants',
   'Comfortable and stylish palazzo pants in premium fabric. Features an elasticated waist for the perfect fit.',
   1299, null, 'women', 'casual', '{/product_bottom_1.jpg}', '{S,M,L,XL,XXL}', '{Ivory,Black,Beige}',
   '{"S":10,"M":10,"L":10,"XL":10,"XXL":10}', true, false, 7)
on conflict (slug) do nothing;
