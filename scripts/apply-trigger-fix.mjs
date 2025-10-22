#!/usr/bin/env node
/**
 * Script pour appliquer le fix du trigger via l'API Supabase
 * Ce script tente d'appliquer le fix de plusieurs manières
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://lcyevhpexzcrmbfozqwt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjeWV2aHBleHpjcm1iZm96cXd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjM1MDA0MSwiZXhwIjoyMDUxOTI2MDQxfQ.YfEfkOAKC90g7T4TiXW8LRzLVk0gvBJc5yOHd7eLLEE';

const fixSQL = `
CREATE OR REPLACE FUNCTION notify_order_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    type,
    title,
    message,
    severity,
    entity_type,
    entity_id,
    related_date,
    metadata
  )
  VALUES (
    'order_created',
    'Nouvelle commande créée',
    'Commande ' || NEW.order_number || ' créée pour le ' || TO_CHAR(NEW.delivery_date, 'DD/MM/YYYY'),
    'info',
    'order',
    NEW.id,
    NEW.delivery_date,
    jsonb_build_object(
      'order_number', NEW.order_number,
      'delivery_date', NEW.delivery_date,
      'total_amount', NEW.total_amount
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

async function applyFixViaManagementAPI() {
  console.log('🔧 Tentative d\'application du fix via l\'API Management...');

  // Utiliser l'API Management de Supabase pour exécuter du SQL
  const url = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: fixSQL });

    const options = {
      hostname: 'lcyevhpexzcrmbfozqwt.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Fix appliqué avec succès via l\'API Management!');
          resolve(true);
        } else {
          console.log(`❌ Échec (Status ${res.statusCode}):`, body);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Erreur de connexion:', error.message);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('============================================');
  console.log('   FIX DU TRIGGER DE NOTIFICATION');
  console.log('============================================');
  console.log('');
  console.log('🔍 Problème identifié:');
  console.log('   Le trigger notify_order_created() utilise NEW.total');
  console.log('   mais la colonne s\'appelle total_amount');
  console.log('');

  // Tenter d'appliquer via l'API Management
  const success = await applyFixViaManagementAPI();

  if (!success) {
    console.log('');
    console.log('⚠️ L\'application automatique a échoué.');
    console.log('');
    console.log('📋 Veuillez appliquer manuellement via:');
    console.log('');
    console.log('1. Allez sur: https://supabase.com/dashboard/project/lcyevhpexzcrmbfozqwt/sql/new');
    console.log('');
    console.log('2. Copiez-collez ce SQL:');
    console.log('');
    console.log('--- DÉBUT DU SQL ---');
    console.log(fixSQL);
    console.log('--- FIN DU SQL ---');
    console.log('');
    console.log('3. Cliquez sur "Run" pour exécuter');
    console.log('');
  }

  console.log('');
  console.log('✨ Après application du fix:');
  console.log('   - Les commandes se créeront sans erreur 400');
  console.log('   - Les notifications seront correctement créées');
  console.log('   - Le système fonctionnera normalement');
  console.log('');
  console.log('============================================');
}

main();
