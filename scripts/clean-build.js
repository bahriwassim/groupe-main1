#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Nettoyage et optimisation du build...');

// Fonction pour supprimer un dossier de manière sécurisée
function safeRemove(dir) {
  try {
    if (fs.existsSync(dir)) {
      console.log(`Suppression de ${dir}...`);
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ ${dir} supprimé`);
    }
  } catch (error) {
    console.warn(`⚠️ Impossible de supprimer ${dir}:`, error.message);
  }
}

// Nettoyage des caches et builds
console.log('\n📁 Nettoyage des dossiers...');
safeRemove('.next');
safeRemove('node_modules/.cache');
safeRemove('.turbo');

// Nettoyage du cache npm
console.log('\n🗑️ Nettoyage du cache npm...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ Cache npm nettoyé');
} catch (error) {
  console.warn('⚠️ Erreur lors du nettoyage du cache npm:', error.message);
}

// Nettoyage des lock files pour forcer une réinstallation propre (optionnel)
if (process.argv.includes('--deep')) {
  console.log('\n🔄 Nettoyage profond...');
  safeRemove('node_modules');
  safeRemove('package-lock.json');

  console.log('\n📦 Réinstallation des dépendances...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dépendances réinstallées');
  } catch (error) {
    console.error('❌ Erreur lors de la réinstallation:', error.message);
    process.exit(1);
  }
}

console.log('\n🚀 Lancement du build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build terminé avec succès');
} catch (error) {
  console.error('❌ Erreur lors du build:', error.message);
  process.exit(1);
}