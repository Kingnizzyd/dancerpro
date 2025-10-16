const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Icon sizes required for different platforms
const iconSizes = {
  ios: [
    { size: 1024, filename: 'icon-1024.png' },
    { size: 180, filename: 'icon-180.png' },
    { size: 167, filename: 'icon-167.png' },
    { size: 152, filename: 'icon-152.png' },
    { size: 120, filename: 'icon-120.png' },
    { size: 87, filename: 'icon-87.png' },
    { size: 80, filename: 'icon-80.png' },
    { size: 76, filename: 'icon-76.png' },
    { size: 60, filename: 'icon-60.png' },
    { size: 58, filename: 'icon-58.png' },
    { size: 40, filename: 'icon-40.png' },
    { size: 29, filename: 'icon-29.png' }
  ],
  android: [
    { size: 512, filename: 'icon-512.png' },
    { size: 192, filename: 'icon-192.png' },
    { size: 144, filename: 'icon-144.png' },
    { size: 96, filename: 'icon-96.png' },
    { size: 72, filename: 'icon-72.png' },
    { size: 48, filename: 'icon-48.png' }
  ],
  web: [
    { size: 512, filename: 'icon-512.png' },
    { size: 384, filename: 'icon-384.png' },
    { size: 256, filename: 'icon-256.png' },
    { size: 192, filename: 'icon-192.png' },
    { size: 180, filename: 'icon-180.png' },
    { size: 167, filename: 'icon-167.png' },
    { size: 152, filename: 'icon-152.png' },
    { size: 144, filename: 'icon-144.png' },
    { size: 128, filename: 'icon-128.png' },
    { size: 120, filename: 'icon-120.png' },
    { size: 96, filename: 'icon-96.png' },
    { size: 76, filename: 'icon-76.png' },
    { size: 72, filename: 'icon-72.png' },
    { size: 64, filename: 'icon-64.png' },
    { size: 60, filename: 'icon-60.png' },
    { size: 57, filename: 'icon-57.png' },
    { size: 48, filename: 'icon-48.png' },
    { size: 32, filename: 'icon-32.png' },
    { size: 16, filename: 'icon-16.png' }
  ]
};

// Splash screen sizes
const splashSizes = {
  ios: [
    { width: 1242, height: 2436, filename: 'splash-1242x2436.png' },
    { width: 1125, height: 2436, filename: 'splash-1125x2436.png' },
    { width: 828, height: 1792, filename: 'splash-828x1792.png' },
    { width: 1242, height: 2208, filename: 'splash-1242x2208.png' },
    { width: 750, height: 1334, filename: 'splash-750x1334.png' }
  ],
  android: [
    { width: 1280, height: 1920, filename: 'splash-1280x1920.png' },
    { width: 1920, height: 1920, filename: 'splash-1920x1920.png' },
    { width: 3840, height: 3840, filename: 'splash-3840x3840.png' }
  ]
};

const assetsDir = path.join(__dirname, '..', 'assets');
const iconsDir = path.join(assetsDir, 'icons');
const generatedDir = path.join(iconsDir, 'generated');

// Create directories if they don't exist
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

// Function to generate icons using ImageMagick
function generateIcons() {
  console.log('Generating app icons...');
  
  const sourceSvg = path.join(iconsDir, 'app-icon-primary.svg');
  
  // Generate iOS icons
  iconSizes.ios.forEach(({ size, filename }) => {
    const outputPath = path.join(generatedDir, `ios-${filename}`);
    try {
      execSync(`magick "${sourceSvg}" -resize ${size}x${size} "${outputPath}"`);
      console.log(`Generated iOS icon: ${filename}`);
    } catch (error) {
      console.warn(`Could not generate iOS icon ${filename}: ${error.message}`);
    }
  });
  
  // Generate Android icons
  iconSizes.android.forEach(({ size, filename }) => {
    const outputPath = path.join(generatedDir, `android-${filename}`);
    try {
      execSync(`magick "${sourceSvg}" -resize ${size}x${size} "${outputPath}"`);
      console.log(`Generated Android icon: ${filename}`);
    } catch (error) {
      console.warn(`Could not generate Android icon ${filename}: ${error.message}`);
    }
  });
  
  // Generate Web icons
  iconSizes.web.forEach(({ size, filename }) => {
    const outputPath = path.join(generatedDir, `web-${filename}`);
    try {
      execSync(`magick "${sourceSvg}" -resize ${size}x${size} "${outputPath}"`);
      console.log(`Generated Web icon: ${filename}`);
    } catch (error) {
      console.warn(`Could not generate Web icon ${filename}: ${error.message}`);
    }
  });
  
  console.log('Generating splash screens...');
  
  const splashSource = path.join(iconsDir, 'splash-screen.svg');
  
  // Generate iOS splash screens
  splashSizes.ios.forEach(({ width, height, filename }) => {
    const outputPath = path.join(generatedDir, `ios-${filename}`);
    try {
      execSync(`magick "${splashSource}" -resize ${width}x${height} "${outputPath}"`);
      console.log(`Generated iOS splash: ${filename}`);
    } catch (error) {
      console.warn(`Could not generate iOS splash ${filename}: ${error.message}`);
    }
  });
  
  // Generate Android splash screens
  splashSizes.android.forEach(({ width, height, filename }) => {
    const outputPath = path.join(generatedDir, `android-${filename}`);
    try {
      execSync(`magick "${splashSource}" -resize ${width}x${height} "${outputPath}"`);
      console.log(`Generated Android splash: ${filename}`);
    } catch (error) {
      console.warn(`Could not generate Android splash ${filename}: ${error.message}`);
    }
  });
  
  // Generate favicon
  try {
    const faviconSource = path.join(iconsDir, 'app-icon-simple.svg');
    const faviconOutput = path.join(generatedDir, 'favicon.ico');
    execSync(`magick "${faviconSource}" -resize 32x32 -define icon:auto-resize=16,24,32,48,64 "${faviconOutput}"`);
    console.log('Generated favicon.ico');
  } catch (error) {
    console.warn(`Could not generate favicon: ${error.message}`);
  }
  
  console.log('Icon generation completed!');
  console.log('Generated files are in:', generatedDir);
}

// Check if ImageMagick is installed
function checkImageMagick() {
  try {
    execSync('magick --version', { stdio: 'ignore' });
    return true;
  } catch {
    console.error('ImageMagick is not installed. Please install it first:');
    console.error('Windows: https://imagemagick.org/script/download.php#windows');
    console.error('macOS: brew install imagemagick');
    console.error('Linux: sudo apt-get install imagemagick');
    return false;
  }
}

// Run the generation
if (checkImageMagick()) {
  generateIcons();
} else {
  console.log('\nYou can still use the SVG files directly:');
  console.log('- Main app icon:', path.join(iconsDir, 'app-icon-primary.svg'));
  console.log('- Simple icon:', path.join(iconsDir, 'app-icon-simple.svg'));
  console.log('- Splash screen:', path.join(iconsDir, 'splash-screen.svg'));
  
  console.log('\nTo generate PNG versions, install ImageMagick and run:');
  console.log('node scripts/generate-icons.js');
}