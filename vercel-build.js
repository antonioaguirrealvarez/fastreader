const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Starting Vercel build simulation...');

try {
    console.log('📦 Cleaning previous builds...');
    if (fs.existsSync('./dist')) {
        fs.rmSync('./dist', { recursive: true });
    }
    
    console.log('📥 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('🏗️ Building project...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('✅ Build completed successfully!');
    
    // Verify dist directory
    if (fs.existsSync('./dist')) {
        console.log('📁 dist directory contents:');
        console.log(fs.readdirSync('./dist'));
    } else {
        throw new Error('dist directory not found after build!');
    }
} catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
} 