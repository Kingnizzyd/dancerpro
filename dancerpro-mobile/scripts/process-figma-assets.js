const fs = require('fs');
const path = require('path');

/**
 * Process Figma Assets Script
 * 
 * This script processes design assets exported from Figma and integrates them
 * into the build pipeline for proper deployment.
 */

const assetsDir = path.join(__dirname, '..', 'assets');
const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');

// Ensure directories exist
function ensureDirectories() {
  const dirs = [
    path.join(assetsDir, 'images'),
    path.join(assetsDir, 'icons'),
    path.join(assetsDir, 'fonts'),
    path.join(assetsDir, 'design-tokens'),
    path.join(assetsDir, 'figma-exports')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

// Process SVG icons
function processSvgIcons() {
  const iconsDir = path.join(assetsDir, 'icons');
  const distIconsDir = path.join(distDir, 'icons');
  
  if (!fs.existsSync(iconsDir)) {
    console.log('No icons directory found, skipping SVG processing');
    return;
  }
  
  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir, { recursive: true });
  }
  
  const svgFiles = fs.readdirSync(iconsDir).filter(file => file.endsWith('.svg'));
  
  svgFiles.forEach(file => {
    const src = path.join(iconsDir, file);
    const dest = path.join(distIconsDir, file);
    
    // Basic SVG optimization could be added here
    fs.copyFileSync(src, dest);
    console.log(`Processed SVG: ${file}`);
  });
  
  console.log(`Processed ${svgFiles.length} SVG icons`);
}

// Process images
function processImages() {
  const imagesDir = path.join(assetsDir, 'images');
  const distImagesDir = path.join(distDir, 'images');
  
  if (!fs.existsSync(imagesDir)) {
    console.log('No images directory found, skipping image processing');
    return;
  }
  
  if (!fs.existsSync(distImagesDir)) {
    fs.mkdirSync(distImagesDir, { recursive: true });
  }
  
  const imageFiles = fs.readdirSync(imagesDir).filter(file => 
    /\.(png|jpg|jpeg|webp)$/i.test(file)
  );
  
  imageFiles.forEach(file => {
    const src = path.join(imagesDir, file);
    const dest = path.join(distImagesDir, file);
    
    // Image optimization could be added here
    fs.copyFileSync(src, dest);
    console.log(`Processed image: ${file}`);
  });
  
  console.log(`Processed ${imageFiles.length} images`);
}

// Validate design tokens
function validateDesignTokens() {
  const tokensDir = path.join(assetsDir, 'design-tokens');
  const colorsFile = path.join(__dirname, '..', 'constants', 'Colors.js');
  
  console.log('Validating design tokens...');
  
  // Check if Colors.js exists and has the expected structure
  if (fs.existsSync(colorsFile)) {
    console.log('✅ Colors.js found');
    
    // Could add validation against Figma design tokens here
    const colorsContent = fs.readFileSync(colorsFile, 'utf8');
    
    // Basic validation
    const hasModernColors = colorsContent.includes('#B19CD9') && colorsContent.includes('#C7FF00');
    if (hasModernColors) {
      console.log('✅ Modern color palette detected');
    } else {
      console.log('⚠️  Modern color palette not found - may need Figma sync');
    }
  } else {
    console.log('❌ Colors.js not found');
  }
}

// Generate asset manifest
function generateAssetManifest() {
  const manifest = {
    generated: new Date().toISOString(),
    assets: {
      icons: [],
      images: [],
      fonts: []
    }
  };
  
  // Scan for assets
  const iconsDir = path.join(assetsDir, 'icons');
  const imagesDir = path.join(assetsDir, 'images');
  const fontsDir = path.join(assetsDir, 'fonts');
  
  if (fs.existsSync(iconsDir)) {
    manifest.assets.icons = fs.readdirSync(iconsDir).filter(f => f.endsWith('.svg'));
  }
  
  if (fs.existsSync(imagesDir)) {
    manifest.assets.images = fs.readdirSync(imagesDir).filter(f => 
      /\.(png|jpg|jpeg|webp)$/i.test(f)
    );
  }
  
  if (fs.existsSync(fontsDir)) {
    manifest.assets.fonts = fs.readdirSync(fontsDir).filter(f => 
      /\.(ttf|otf|woff|woff2)$/i.test(f)
    );
  }
  
  const manifestPath = path.join(distDir, 'asset-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Generated asset manifest');
}

// Main execution
function main() {
  console.log('🎨 Processing Figma assets...');
  
  ensureDirectories();
  processSvgIcons();
  processImages();
  validateDesignTokens();
  generateAssetManifest();
  
  console.log('✅ Figma asset processing complete');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  ensureDirectories,
  processSvgIcons,
  processImages,
  validateDesignTokens,
  generateAssetManifest
};