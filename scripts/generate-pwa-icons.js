const fs = require('fs');
const path = require('path');

// SVG template for the icon
const createSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#42a855"/>
  
  <!-- White box icon -->
  <g transform="translate(${size * 0.25}, ${size * 0.25})">
    <!-- Main box -->
    <rect x="0" y="0" width="${size * 0.5}" height="${size * 0.4}" fill="white" rx="${size * 0.02}"/>
    
    <!-- Box lid -->
    <rect x="0" y="0" width="${size * 0.5}" height="${size * 0.05}" fill="rgba(0,0,0,0.1)"/>
    
    <!-- Lines on box -->
    <rect x="${size * 0.1}" y="${size * 0.125}" width="${size * 0.3}" height="${size * 0.015}" fill="#42a855"/>
    <rect x="${size * 0.1}" y="${size * 0.2}" width="${size * 0.3}" height="${size * 0.015}" fill="#42a855"/>
    <rect x="${size * 0.1}" y="${size * 0.275}" width="${size * 0.2}" height="${size * 0.015}" fill="#42a855"/>
  </g>
  
  <!-- "IT" text for Inventory Tracker -->
  <text x="${size * 0.5}" y="${size * 0.75}" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.15}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle">IT</text>
</svg>
`;

// Icon sizes required for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons for each size
sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Generated ${filename}`);
});

// Also create apple-touch-icon
const appleSvg = createSVG(180);
const appleFilepath = path.join(iconsDir, 'apple-touch-icon.svg');
fs.writeFileSync(appleFilepath, appleSvg);
console.log('✅ Generated apple-touch-icon.svg');

// Create favicon.svg
const faviconSvg = createSVG(32);
const faviconFilepath = path.join(iconsDir, 'favicon.svg');
fs.writeFileSync(faviconFilepath, faviconSvg);
console.log('✅ Generated favicon.svg');

console.log('\n📱 PWA icons generated successfully!');
console.log('Note: These are SVG icons. For production, consider converting them to PNG format using a tool like sharp or an online converter.');
console.log('\nTo convert SVG to PNG, you can install sharp:');
console.log('npm install sharp');
console.log('Then update this script to use sharp for PNG generation.');