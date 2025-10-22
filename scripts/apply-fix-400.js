/**
 * Script pour appliquer le fix de l'erreur 400 sur la table orders
 * Ce script exécute le fichier SQL via Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration Supabase
const supabaseUrl = 'https://lcyevhpexzcrmbfozqwt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjeWV2aHBleHpjcm1iZm96cXd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjM1MDA0MSwiZXhwIjoyMDUxOTI2MDQxfQ.YfEfkOAKC90g7T4TiXW8LRzLVk0gvBJc5yOHd7eLLEE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSqlFile() {
  try {
    console.log('🔧 Lecture du fichier SQL...');
    const sqlFile = join(__dirname, '..', 'database', 'FIX_ORDER_CREATION_400.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    console.log('📋 Fichier SQL chargé, taille:', sql.length, 'caractères');

    // Diviser le SQL en commandes individuelles (en évitant les blocs DO $$)
    // Pour simplifier, on va exécuter tout le fichier d'un coup
    console.log('⚡ Exécution du script SQL...');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erreur lors de l\'exécution du SQL:', error);

      // Si la fonction exec_sql n'existe pas, essayer une autre approche
      if (error.message.includes('exec_sql')) {
        console.log('ℹ️ Tentative d\'exécution directe via l\'API REST...');

        // On ne peut pas exécuter de DDL via l'API REST standard
        // Il faut utiliser le SQL Editor de Supabase ou psql
        console.log('');
        console.log('⚠️ IMPORTANT: Vous devez exécuter le script manuellement:');
        console.log('');
        console.log('1. Allez sur: https://supabase.com/dashboard/project/lcyevhpexzcrmbfozqwt/sql/new');
        console.log('2. Copiez le contenu de: database/FIX_ORDER_CREATION_400.sql');
        console.log('3. Collez-le dans l\'éditeur SQL');
        console.log('4. Cliquez sur "Run" pour exécuter le script');
        console.log('');
        console.log('Ou via psql:');
        console.log('psql "postgresql://postgres.lcyevhpexzcrmbfozqwt:Liwa@2019@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -f database/FIX_ORDER_CREATION_400.sql');
        console.log('');
      }
      process.exit(1);
    }

    console.log('✅ Script SQL exécuté avec succès!');
    console.log('Résultat:', data);

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    process.exit(1);
  }
}

executeSqlFile();
