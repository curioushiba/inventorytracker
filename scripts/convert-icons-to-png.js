const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG content for inventory tracker icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="192" height="192" fill="url(#bg)" rx="20" />
  <g transform="translate(96, 96)">
    <!-- Package icon -->
    <path d="M -40 -20 L -40 20 L 0 40 L 40 20 L 40 -20 L 0 -40 Z" 
          fill="none" stroke="white" stroke-width="3" stroke-linejoin="round"/>
    <path d="M -40 -20 L 0 0 L 40 -20" 
          fill="none" stroke="white" stroke-width="3" stroke-linejoin="round"/>
    <path d="M 0 0 L 0 40" 
          fill="none" stroke="white" stroke-width="3"/>
    <!-- Checkmark -->
    <circle cx="25" cy="25" r="15" fill="white"/>
    <path d="M 18 25 L 23 30 L 33 20" 
          fill="none" stroke="#4F46E5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

async function convertSvgToPng() {
  console.log('Converting SVG icons to PNG format...');
  
  // Create PNG icons for each size
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Created ${outputPath}`);
    } catch (error) {
      console.error(`✗ Failed to create icon-${size}x${size}.png:`, error.message);
    }
  }
  
  // Create special icons
  const specialIcons = [
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'maskable-icon-512x512.png', size: 512 } // Maskable icon with safe zone
  ];
  
  for (const icon of specialIcons) {
    const outputPath = path.join(iconsDir, icon.name);
    
    try {
      // For maskable icon, add extra padding
      const svgToUse = icon.name.includes('maskable') 
        ? svgContent.replace('viewBox="0 0 192 192"', 'viewBox="-20 -20 232 232"')
        : svgContent;
        
      await sharp(Buffer.from(svgToUse))
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Created ${outputPath}`);
    } catch (error) {
      console.error(`✗ Failed to create ${icon.name}:`, error.message);
    }
  }
  
  // Create favicon.ico (multi-resolution)
  try {
    const favicon = await sharp(Buffer.from(svgContent))
      .resize(32, 32)
      .png()
      .toBuffer();
    
    fs.writeFileSync(path.join(iconsDir, '..', 'favicon.ico'), favicon);
    console.log('✓ Created favicon.ico');
  } catch (error) {
    console.error('✗ Failed to create favicon.ico:', error.message);
  }
  
  console.log('\nIcon conversion complete!');
}

// Check if sharp is installed
try {
  require.resolve('sharp');
  convertSvgToPng();
} catch (error) {
  console.log('Installing sharp dependency...');
  const { execSync } = require('child_process');
  execSync('npm install sharp', { stdio: 'inherit' });
  console.log('Sharp installed. Please run this script again.');
}