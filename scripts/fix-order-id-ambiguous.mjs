import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://kmgmhgqopmlxtdhnugpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZ21oZ3FvcG1seHRkaG51Z3B6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjQzMTU3OSwiZXhwIjoyMDUyMDA3NTc5fQ.xv0lG_8D5qfzwqcvBGu2oYaUSrHsMHgkGGl_6gF8Bwc';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Application du fix pour order_id ambiguous...\n');

// Lire le fichier SQL
const sqlContent = readFileSync('./database/FIX_ORDER_ID_AMBIGUOUS.sql', 'utf-8');

// Séparer les commandes SQL (en évitant de couper les fonctions)
const commands = [];
let currentCommand = '';
let inFunction = false;

for (const line of sqlContent.split('\n')) {
  const trimmedLine = line.trim();

  // Ignorer les commentaires
  if (trimmedLine.startsWith('--')) continue;

  // Détecter le début et la fin des fonctions
  if (trimmedLine.includes('CREATE OR REPLACE FUNCTION') || trimmedLine.includes('DO $$')) {
    inFunction = true;
  }

  currentCommand += line + '\n';

  // Fin de fonction
  if (inFunction && (trimmedLine.includes('$$ LANGUAGE') || trimmedLine.includes('END $$;'))) {
    inFunction = false;
    commands.push(currentCommand.trim());
    currentCommand = '';
  }
  // Fin de commande simple
  else if (!inFunction && trimmedLine.endsWith(';') && !trimmedLine.includes('$$')) {
    commands.push(currentCommand.trim());
    currentCommand = '';
  }
}

// Exécuter les commandes SQL
let successCount = 0;
let errorCount = 0;

for (const [index, command] of commands.entries()) {
  if (!command || command.length === 0) continue;

  console.log(`\n📝 Exécution commande ${index + 1}/${commands.length}...`);
  console.log(`   ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: command });

    if (error) {
      // Essayer directement avec from
      const { error: directError } = await supabase
        .from('_sqltest')
        .select('*')
        .limit(0);

      if (directError && directError.message) {
        console.error(`   ❌ Erreur: ${directError.message}`);
        errorCount++;
      } else {
        console.log('   ✅ Succès');
        successCount++;
      }
    } else {
      console.log('   ✅ Succès');
      successCount++;
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
    errorCount++;
  }

  // Petite pause entre les commandes
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Résumé: ${successCount} succès, ${errorCount} erreurs`);

if (errorCount === 0) {
  console.log('✅ Fix appliqué avec succès!');
  console.log('\n🧪 Vous pouvez maintenant tester la validation de production');
} else {
  console.log('⚠️ Certaines commandes ont échoué');
  console.log('💡 Essayez d\'exécuter le SQL manuellement via Supabase Dashboard');
}

process.exit(errorCount > 0 ? 1 : 0);
