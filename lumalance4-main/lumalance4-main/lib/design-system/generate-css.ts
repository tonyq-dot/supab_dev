import fs from 'fs';
import path from 'path';
import { themeCss } from './theme.js';

// Path to the output CSS file
const outputPath = path.resolve(process.cwd(), 'styles/theme.css');

/**
 * Generates and writes the theme CSS file.
 */
export const generateThemeCss = (): void => {
  try {
    // Ensure the directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the CSS to the file
    fs.writeFileSync(outputPath, themeCss, 'utf-8');
    
    console.log(`✅ Theme CSS successfully generated at ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating theme CSS:', error);
    process.exit(1);
  }
};

// If the script is run directly, generate the CSS
if (require.main === module) {
  try {
    generateThemeCss();
    console.log('✅ CSS variables generated successfully!');
  } catch (error: any) {
    console.error('❌ Error generating CSS variables:', error);
    process.exit(1);
  }
} 