import img0556 from '@assets/IMG_0556_1784324397579.JPG';
import aidaPortrait from '@assets/F32B16AC-6790-4733-A787-D0258611E589_1784325156252.JPG';
import img0287 from '@assets/IMG_0287_1784324425753.JPG';
import img0288 from '@assets/IMG_0288_1784324425754.JPG';
import img0289 from '@assets/IMG_0289_1784324425755.JPG';
import img0290 from '@assets/IMG_0290_1784324425755.JPG';
import img0291 from '@assets/IMG_0291_1784324425755.JPG';
import img0292 from '@assets/IMG_0292_1784324425755.JPG';
import img0293 from '@assets/IMG_0293_1784324425756.JPG';
import img0294 from '@assets/IMG_0294_1784324425756.JPG';
import img0295 from '@assets/IMG_0295_1784324425757.JPG';
import img0297 from '@assets/IMG_0297_1784324425757.JPG';
import img0298 from '@assets/IMG_0298_1784324425757.JPG';
import img0299 from '@assets/IMG_0299_1784324425757.JPG';
import img0592 from '@assets/IMG_0592_1784393730538.JPG';
import img0593 from '@assets/IMG_0593_1784393730539.JPG';
import img0594 from '@assets/IMG_0594_1784393730539.JPG';

export const assetImages = [
  img0556, img0287, img0288, img0289, img0290, img0291, img0292, img0293, img0294, img0295, img0297, img0298, img0299,
  img0592, img0593, img0594,
];

export const getArtworkImage = (artwork: any, index: number) => {
  if (!artwork.imageUrl) return assetImages[index % assetImages.length];
  
  const id = artwork.imageUrl.split('/').pop()?.split('.')[0] || '';
  const match = assetImages.find(img => img.includes(id));
  if (match) return match;
  
  return assetImages[index % assetImages.length];
};

export const heroImage = img0556;
export const portrait = aidaPortrait;
