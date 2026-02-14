const fs = require('fs');
const path = require('path');

// Create simple SVG placeholder images that convert to base64 for React Native
const createSVGPlaceholder = (width, height, bgColor, category, filename) => {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${category}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${darkenColor(bgColor, 30)};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad${category})"/>
  <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" opacity="0.9">${category.toUpperCase()}</text>
  <text x="50%" y="55%" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.7">${filename}</text>
</svg>`;
};

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace("#",""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

// Better approach: Use data URIs for React Native compatibility
// But for now, let's create actual image files using sharp or a download approach

const images = [
  // Tour images - Blue/teal theme for mountains
  { category: 'tour', filename: 'manali1.jpg', color: '#4A90E2', label: 'Mountain View' },
  { category: 'tour', filename: 'manali2.jpg', color: '#5BA3D0', label: 'Valley' },
  { category: 'tour', filename: 'manali3.jpg', color: '#3A7BC8', label: 'Landscape' },

  // Hotel images - Warm brown/gold theme
  { category: 'hotel', filename: 'room1.jpg', color: '#8B7355', label: 'Luxury Room' },
  { category: 'hotel', filename: 'lobby.jpg', color: '#A0826D', label: 'Lobby' },
  { category: 'hotel', filename: 'view.jpg', color: '#6B5D4F', label: 'View' },

  // Cottage images - Green/wood theme
  { category: 'cottages', filename: 'cottage1.jpg', color: '#6B8E23', label: 'Exterior' },
  { category: 'cottages', filename: 'interior.jpg', color: '#8FBC8F', label: 'Interior' },
  { category: 'cottages', filename: 'view.jpg', color: '#556B2F', label: 'View' },
];

// For now, create SVG files that can be converted
// In a real scenario, you'd download actual images or use sharp to create JPEGs
images.forEach(img => {
  const svg = createSVGPlaceholder(1920, 1080, img.color, img.category, img.label);
  const dir = path.join(__dirname, '..', 'public', 'uploads', 'images', img.category);

  // Create SVG file (for reference)
  const svgPath = path.join(dir, img.filename.replace('.jpg', '.svg'));
  fs.writeFileSync(svgPath, svg);

  console.log(`Created placeholder: ${svgPath}`);
});

console.log('\n⚠️  SVG placeholders created. For production, replace with actual JPEG images.');
console.log('Download real images from: https://www.pexels.com/search/manali/ or https://pixabay.com/images/search/himalayan-mountains/');
