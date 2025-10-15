const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, "public", "icons", "icon-base.png");
const iconsDir = path.join(__dirname, "public", "icons");

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);

      console.log(`Generated ${size}x${size} icon`);
    } catch (error) {
      console.error(`Error generating ${size}x${size} icon:`, error);
    }
  }

  console.log("All icons generated successfully!");
}

generateIcons();
