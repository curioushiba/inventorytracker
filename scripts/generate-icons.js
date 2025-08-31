const fs = require('fs');
const path = require('path');

// Simple function to create placeholder icons
// In production, you should use a proper image generation library like sharp or jimp

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#42a855"/>
  <g transform="translate(256, 256)">
    <rect x="-120" y="-80" width="180" height="140" rx="8" fill="#ffffff" opacity="0.3" transform="translate(30, -30)"/>
    <rect x="-120" y="-80" width="180" height="140" rx="8" fill="#ffffff" opacity="0.5" transform="translate(15, -15)"/>
    <rect x="-120" y="-80" width="180" height="140" rx="8" fill="#ffffff"/>
    <line x1="-120" y1="-30" x2="60" y2="-30" stroke="#42a855" stroke-width="3"/>
    <line x1="-120" y1="20" x2="60" y2="20" stroke="#42a855" stroke-width="3"/>
    <circle cx="90" cy="40" r="30" fill="#65d978"/>
    <path d="M 75 40 L 85 50 L 105 30" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

// Create a simple HTML file that can be used to manually save icons
const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>PWA Icon Generator</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .icon-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .icon-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .icon-card img, .icon-card svg {
            width: 100%;
            max-width: 150px;
            height: auto;
            margin-bottom: 10px;
        }
        .icon-card h3 {
            margin: 10px 0 5px 0;
            font-size: 16px;
        }
        .icon-card p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }
        .instructions {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        canvas {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>PWA Icon Generator for Inventory Tracker</h1>
        <div class="instructions">
            <h2>Instructions:</h2>
            <ol>
                <li>Right-click on each icon below</li>
                <li>Select "Save image as..."</li>
                <li>Save with the filename shown (e.g., icon-192x192.png)</li>
                <li>Save all icons to the <code>public/icons/</code> directory</li>
            </ol>
            <p><strong>Note:</strong> For production, use a proper icon generation tool like sharp or an online PWA icon generator.</p>
        </div>
        <div class="icon-grid" id="iconGrid"></div>
    </div>

    <script>
        const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
        const iconGrid = document.getElementById('iconGrid');

        sizes.forEach(size => {
            const card = document.createElement('div');
            card.className = 'icon-card';
            
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            // Draw background
            ctx.fillStyle = '#42a855';
            ctx.fillRect(0, 0, size, size);
            
            // Draw simplified icon
            ctx.fillStyle = '#ffffff';
            const boxSize = size * 0.5;
            const boxX = (size - boxSize) / 2;
            const boxY = (size - boxSize) / 2;
            
            // Main box
            ctx.fillRect(boxX, boxY, boxSize, boxSize * 0.8);
            
            // Lines
            ctx.fillStyle = '#42a855';
            ctx.fillRect(boxX, boxY + boxSize * 0.25, boxSize, size * 0.02);
            ctx.fillRect(boxX, boxY + boxSize * 0.5, boxSize, size * 0.02);
            
            // Convert canvas to image
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            
            card.innerHTML = \`
                <img src="\${canvas.toDataURL('image/png')}" alt="Icon \${size}x\${size}">
                <h3>icon-\${size}x\${size}.png</h3>
                <p>\${size}x\${size} pixels</p>
            \`;
            
            iconGrid.appendChild(card);
        });
    </script>
</body>
</html>`;

// Ensure the public/icons directory exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Save the HTML generator file
fs.writeFileSync(path.join(iconsDir, 'icon-generator.html'), htmlContent);

console.log('Icon generator created successfully!');
console.log('Open public/icons/icon-generator.html in a browser to generate and save the icons.');
console.log('\nFor production, consider using:');
console.log('- sharp library for Node.js icon generation');
console.log('- Online tools like https://realfavicongenerator.net/');
console.log('- PWA asset generators like https://www.pwabuilder.com/imageGenerator');