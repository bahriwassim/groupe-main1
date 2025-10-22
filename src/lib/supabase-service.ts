import { supabase } from './supabase-client';
import type { Order, Client, Product, OrderItem, PaymentType, ValidationStatus, ValidationType, ValidationPriority, ProductionValidation, OrderQualityDetails, Pack } from './types';

export interface SubCategory {
  id: string;
  name: string;
  category_id: string;
}

// Clients
export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Erreur lors de la récupération des clients:', error);
    return [];
  }

  return data?.map(customer => ({
    id: customer.id,
    name: customer.name,
    taxId: customer.tax_id || '',
    contact: customer.contact || customer.name,
    phone: customer.phone || '',
    phone2: customer.phone2 || '',
    address: customer.address || ''
  })) || [];
}

export async function createClient(client: Omit<Client, 'id'>): Promise<Client | null> {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: client.name,
      tax_id: client.taxId,
      contact: client.contact,
      phone: client.phone,
      phone2: client.phone2,
      address: client.address,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la création du client:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    taxId: data.tax_id || '',
    contact: data.contact || '',
    phone: data.phone || '',
    phone2: data.phone2 || '',
    address: data.address || ''
  };
}

// Produits
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories!inner(name),
      sub_categories(name)
    `)
    .eq('is_available', true)
    .order('name');

  if (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    return [];
  }

  return data?.map(product => ({
    id: product.id,
    name: product.name,
    category: product.categories.name,
    subFamily: product.sub_categories?.name,
    price: product.price,
    unit: product.unit as 'pièce' | 'kg',
    imageUrl: product.image_url || '/placeholder-product.jpg',
    description: product.description || '',
    'data-ai-hint': product.name.toLowerCase()
  })) || [];
}

// Sous-catégories
export async function getSubCategories(): Promise<SubCategory[]> {
  const { data, error } = await supabase
    .from('sub_categories')
    .select(`
      id,
      name,
      category_id,
      categories!inner(name)
    `)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Erreur lors de la récupération des sous-catégories:', error);
    return [];
  }

  return data || [];
}

export async function createProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<Product | null> {
  // First, get or create the category
  let categoryId: string;

  const { data: existingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('name', product.category)
    .single();

  if (existingCategory) {
    categoryId = existingCategory.id;
  } else {
    const { data: newCategory, error: categoryError } = await supabase
      .from('categories')
      .insert({ name: product.category })
      .select('id')
      .single();

    if (categoryError) {
      console.error('Erreur lors de la création de la catégorie:', categoryError);
      return null;
    }
    categoryId = newCategory.id;
  }

  // Create the product with custom ID if provided
  const safeInsert = async (unitValue: string | undefined) => {
    const insertData: any = {
      name: product.name,
      category_id: categoryId,
      price: product.price,
      unit: unitValue ?? product.unit,
      image_url: product.imageUrl,
      description: product.description,
      is_available: true
    };

    // Utiliser l'ID personnalisé si fourni
    if (product.id) {
      insertData.id = product.id;
    }

    console.log('🔍 Insertion produit avec données:', insertData);

    return supabase
      .from('products')
      .insert(insertData)
      .select(`
        *,
        categories!inner(name)
      `)
      .single();
  };

  let { data, error } = await safeInsert(product.unit);

  // Fallback if CHECK constraint fails on unit
  if (error && error.code === '23514') {
    const fallbackUnit = product.unit === 'kg' ? 'kg' : 'pièce';
    console.warn('⚠️ Contrainte unité lors de la création, tentative avec fallback:', fallbackUnit);
    const retry = await safeInsert(fallbackUnit);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Erreur lors de la création du produit:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    category: data.categories.name,
    subFamily: undefined,
    price: data.price,
    unit: data.unit as any,
    imageUrl: data.image_url || '/placeholder-product.jpg',
    description: data.description || '',
    'data-ai-hint': data.name.toLowerCase()
  };
}

export async function updateProduct(productId: string, product: Product): Promise<Product | null> {
  // Get or create the category
  let categoryId: string;

  const { data: existingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('name', product.category)
    .single();

  if (existingCategory) {
    categoryId = existingCategory.id;
  } else {
    const { data: newCategory, error: categoryError } = await supabase
      .from('categories')
      .insert({ name: product.category })
      .select('id')
      .single();

    if (categoryError) {
      console.error('Erreur lors de la création de la catégorie:', categoryError);
      return null;
    }
    categoryId = newCategory.id;
  }

  // Si l'ID a changé, supprimer l'ancien et créer un nouveau
  if (product.id !== productId) {
    console.log('🔄 Changement d\'ID produit:', productId, '→', product.id);

    // Supprimer l'ancien produit
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error('Erreur suppression ancien produit:', deleteError);
      return null;
    }

    // Créer le nouveau produit avec le nouvel ID
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert({
        id: product.id,
        name: product.name,
        category_id: categoryId,
        price: product.price,
        unit: product.unit,
        image_url: product.imageUrl,
        description: product.description
      })
      .select(`
        *,
        categories!inner(name)
      `)
      .single();

    if (insertError) {
      console.error('Erreur création nouveau produit:', insertError);
      return null;
    }

    return {
      id: newProduct.id,
      name: newProduct.name,
      category: newProduct.categories.name,
      subFamily: undefined,
      price: newProduct.price,
      unit: newProduct.unit as any,
      imageUrl: newProduct.image_url || '/placeholder-product.jpg',
      description: newProduct.description || '',
      'data-ai-hint': newProduct.name.toLowerCase()
    };
  }

  const performUpdate = async (unitValue: string | undefined) => {
    return supabase
      .from('products')
      .update({
        name: product.name,
        category_id: categoryId,
        price: product.price,
        unit: unitValue ?? product.unit,
        image_url: product.imageUrl,
        description: product.description
      })
      .eq('id', productId)
      .select(`
        *,
        categories!inner(name)
      `)
      .single();
  };

  let { data, error } = await performUpdate(product.unit);

  // Fallback if unit constraint fails
  if (error && error.code === '23514') {
    // Fetch current unit to keep it if valid
    const { data: current, error: curErr } = await supabase
      .from('products')
      .select('unit')
      .eq('id', productId)
      .single();

    const fallbackUnit = curErr ? (product.unit === 'kg' ? 'kg' : 'pièce') : current.unit;
    console.warn('⚠️ Contrainte unité lors de la mise à jour, tentative avec fallback:', fallbackUnit);
    const retry = await performUpdate(fallbackUnit);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    category: data.categories.name,
    subFamily: undefined,
    price: data.price,
    unit: data.unit as any,
    imageUrl: data.image_url || '/placeholder-product.jpg',
    description: data.description || '',
    'data-ai-hint': data.name.toLowerCase()
  };
}

// Commandes
export async function getOrders(): Promise<Order[]> {
  // TEMPORAIRE: Requête avec colonnes explicites pour éviter l'erreur 400
  console.log('🔍 Tentative de récupération des commandes...');

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_id,
      status,
      delivery_date,
      delivery_time,
      total_amount,
      discount,
      advance,
      second_advance,
      remaining_amount,
      payment_type,
      needs_invoice,
      notes,
      created_at,
      updated_at,
      created_by,
      lab_delivery_hours
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('🚨 ERREUR getOrders - Détails complets:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return [];
  }

  console.log('✅ Commandes récupérées:', data?.length || 0);

  // TEMPORAIRE: Mapping simplifié sans JOINs
  return data?.map((order: any) => ({
    id: order.id,
    orderNumber: order.order_number,
    clientId: order.customer_id,
    orderDate: new Date(order.created_at),
    deliveryDate: new Date(order.delivery_date),
    deliveryTime: order.delivery_time,
    status: order.status,
    statusHistory: [
      {
        status: order.status,
        timestamp: new Date(order.created_at),
        note: 'Commande créée'
      }
    ],
    items: [], // Sera chargé séparément si nécessaire
    total: order.total_amount,
    discount: order.discount || 0,
    advance: order.advance || 0,
    secondAdvance: order.second_advance || 0,
    remaining: order.remaining_amount,
    paymentType: order.payment_type as PaymentType,
    needsInvoice: order.needs_invoice || false,
    notes: order.notes,
    createdBy: order.created_by || undefined
  })) || [];
}

export async function getValidatedOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_id,
      status,
      delivery_date,
      delivery_time,
      total_amount,
      discount,
      advance,
      second_advance,
      remaining_amount,
      payment_type,
      needs_invoice,
      notes,
      created_at,
      updated_at,
      created_by,
      lab_delivery_hours,
      order_items(
        id,
        product_id,
        quantity,
        unit_price,
        total_price,
        description
      ),
      order_status_history(
        status,
        note,
        changed_at
      )
    `)
    .in('status', ['valide_admin', 'Validé'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur lors de la récupération des commandes validées:', error);
    return [];
  }

  return data?.map((order: any) => ({
    id: order.id,
    orderNumber: order.order_number,
    clientId: order.customer_id,
    orderDate: new Date(order.created_at),
    deliveryDate: new Date(order.delivery_date),
    deliveryTime: order.delivery_time,
    status: order.status,
    statusHistory: order.order_status_history?.map((history: any) => ({
      status: history.status,
      timestamp: new Date(history.changed_at),
      note: history.note
    })).sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime()) || [
      {
        status: order.status,
        timestamp: new Date(order.created_at),
        note: 'Commande créée'
      }
    ],
    items: order.order_items?.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total_price,
      description: item.description
    })) || [],
    total: order.total_amount,
    discount: order.discount || 0,
    advance: order.advance || 0,
    secondAdvance: order.second_advance || 0,
    remaining: order.remaining_amount,
    paymentType: order.payment_type as PaymentType,
    needsInvoice: order.needs_invoice || false,
    notes: order.notes
  })) || [];
}

export async function checkOrderAlreadyInProduction(orderId: string): Promise<{ isUsed: boolean; productionOrders: string[] }> {
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .select('id, order_number, bc_origins')
      .contains('bc_origins', [{ orderId }]);

    if (error) {
      console.error('Erreur lors de la vérification de l\'utilisation de la commande:', error);
      return { isUsed: false, productionOrders: [] };
    }

    const productionOrders = data?.map(po => po.order_number) || [];

    return {
      isUsed: productionOrders.length > 0,
      productionOrders
    };
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    return { isUsed: false, productionOrders: [] };
  }
}

export async function getProductionOrdersForOrder(orderId: string): Promise<ProductionOrder[]> {
  try {
    console.log('🔍 Recherche ordres de production pour commande:', orderId);

    // Chercher dans les deux formats (nouveau et ancien)
    const [newFormatResult, oldFormatResult] = await Promise.all([
      // Nouveau format avec bc_origins
      supabase
        .from('production_orders')
        .select(`
          *,
          production_order_items(
            id,
            product_id,
            quantity_required,
            quantity_produced,
            laboratory,
            special_instructions,
            production_status,
            production_validated_at,
            production_validated_by,
            quality_status,
            quality_validated_at,
            quality_validated_by,
            validation_notes,
            products(name, unit, image_url)
          )
        `)
        .contains('bc_origins', [{ orderId }])
        .order('created_at', { ascending: false }),

      // Ancien format avec order_id
      supabase
        .from('production_orders')
        .select(`
          *,
          production_order_items(
            id,
            product_id,
            quantity_required,
            quantity_produced,
            laboratory,
            special_instructions,
            production_status,
            production_validated_at,
            production_validated_by,
            quality_status,
            quality_validated_at,
            quality_validated_by,
            validation_notes,
            products(name, unit, image_url)
          )
        `)
        .eq('production_orders.order_id', orderId)
        .order('created_at', { ascending: false })
    ]);

    console.log('📦 Résultats nouveau format:', newFormatResult.data?.length || 0);
    console.log('📦 Résultats ancien format:', oldFormatResult.data?.length || 0);

    if (newFormatResult.error) {
      console.error('❌ Erreur nouveau format:', newFormatResult.error);
    }
    if (oldFormatResult.error) {
      console.error('❌ Erreur ancien format:', oldFormatResult.error);
    }

    // Combiner les résultats et éliminer les doublons
    const allData = [
      ...(newFormatResult.data || []),
      ...(oldFormatResult.data || [])
    ];

    // Éliminer les doublons par ID
    const data = allData.filter((order, index, arr) =>
      arr.findIndex(o => o.id === order.id) === index
    );

    console.log('✅ Total ordres trouvés (sans doublons):', data.length);

    return data?.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      title: order.title,
      bcOrigins: order.bc_origins || [],
      laboratory: order.laboratory,
      status: mapStatus(order.status),
      priority: mapPriority(order.priority),
      createdAt: new Date(order.created_at),
      targetDate: new Date(order.target_date),
      items: order.production_order_items?.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.products?.name || `Produit ${item.product_id}`,
        quantity: item.quantity_required,
        unit: item.products?.unit || 'pièce',
        notes: item.special_instructions,
        imageUrl: item.products?.image_url || '/logo-essoukri.jpg',
        // Validation par produit
        productionStatus: item.production_status,
        productionValidatedAt: item.production_validated_at,
        productionValidatedBy: item.production_validated_by,
        qualityStatus: item.quality_status,
        qualityValidatedAt: item.quality_validated_at,
        qualityValidatedBy: item.quality_validated_by,
        validationNotes: item.validation_notes,
        quantityProduced: item.quantity_produced
      })) || [],
      qualityApprovedAt: order.quality_validated_at ? new Date(order.quality_validated_at) : undefined,
      qualityApprovedBy: order.quality_validated_by,
      quantityApprovedAt: order.quantity_validated_at ? new Date(order.quantity_validated_at) : undefined,
      quantityApprovedBy: order.quantity_validated_by,
      startedAt: order.actual_start ? new Date(order.actual_start) : undefined,
      completedAt: order.actual_end ? new Date(order.actual_end) : undefined,
      notes: order.notes
    })) || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des ordres de production liés:', error);
    return [];
  }
}

export async function createOrder(orderData: {
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientPhone2?: string;
  clientTaxId?: string;
  clientAddress?: string;
  deliveryDate: Date;
  deliveryTime?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    description?: string;
  }>;
  total: number;
  discount?: number;
  advance?: number;
  secondAdvance?: number;
  paymentType?: PaymentType;
  needsInvoice?: boolean;
  notes?: string;
  createdBy?: string;
}): Promise<Order | null> {
  try {
    // Validation minimale des entrées
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('orderData vide ou invalide');
    }
    if (!orderData.clientName || !orderData.deliveryDate || !orderData.items || orderData.items.length === 0) {
      throw new Error('Champs requis manquants (clientName, deliveryDate, items)');
    }

    // Créer ou mettre à jour le client d'abord
    let customerId = orderData.clientId;

    if (!customerId || customerId === 'new') {
      // Créer un nouveau client
      const newClient = await createClient({
        name: orderData.clientName,
        taxId: orderData.clientTaxId || '',
        contact: orderData.clientName,
        phone: orderData.clientPhone,
        phone2: orderData.clientPhone2,
        address: orderData.clientAddress || ''
      });

      if (!newClient) {
        throw new Error('Impossible de créer le client');
      }

      customerId = newClient.id;
    }

    // Générer le numéro de commande
    const today = new Date();
    const year = today.getFullYear();
    const orderNumber = `BC-${year}-${String(Date.now()).slice(-6)}`;

    // Le total reçu est déjà le montant après remise, donc on ne déduit que les avances
    const remaining = orderData.total - (orderData.advance || 0) - (orderData.secondAdvance || 0);

    // Préparer les données d'insertion avec le statut 'Saisi' par défaut
    const orderInsertData = {
      order_number: orderNumber,
      customer_id: customerId,
      delivery_date: orderData.deliveryDate.toISOString(),
      delivery_time: orderData.deliveryTime,
      status: 'Saisi', // Utiliser directement 'Saisi' qui fonctionne
      total_amount: orderData.total,
      discount: orderData.discount || 0,
      advance: orderData.advance || 0,
      second_advance: orderData.secondAdvance || 0,
      remaining_amount: remaining,
      payment_type: orderData.paymentType,
      needs_invoice: orderData.needsInvoice || false,
      notes: orderData.notes
    };

    console.log('🔍 Création commande avec données:', orderInsertData);

    // Insérer la commande
    const { data: orderResult, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single();

    if (orderError) {
      console.error('🚨 ÉCHEC CRÉATION COMMANDE:', {
        code: orderError.code,
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint,
        données_envoyées: orderInsertData
      });
      throw orderError;
    }

    // Créer les items de la commande
    const orderItems = orderData.items.map(item => ({
      order_id: orderResult.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.total,
      description: item.description
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('🚨 ÉCHEC CRÉATION ITEMS - Erreur complète:', {
        code: itemsError.code,
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint,
        items_envoyés: orderItems
      });
      throw itemsError;
    }

    // Retourner la commande complète
    const orders = await getOrders();
    return orders.find(order => order.id === orderResult.id) || null;

  } catch (error: any) {
    console.error('❌❌❌ ERREUR lors de la création de la commande:', error);
    console.error('Message:', error?.message);
    console.error('Code:', error?.code);
    console.error('Details:', error?.details);
    console.error('Hint:', error?.hint);
    console.error('Détails complets:', JSON.stringify(error, null, 2));
    console.error('orderData envoyé:', orderData || null);
    throw error; // On relance l'erreur pour qu'elle soit capturée dans le formulaire
  }
}

export async function updateOrderStatus(orderId: string, status: string, note?: string): Promise<boolean> {
  try {
    const labelToDb: Record<string, string> = {
      'Saisi': 'en_attente',
      'Validé': 'valide_admin',
      'En fabrication': 'en_fabrication',
      'Contrôle qualité': 'controle_qualite',
      'Terminé': 'termine',
      'Prêt': 'pret',
      'Livré': 'livre',
      'Annulé': 'annule'
    };
    const dbToLabel: Record<string, string> = {
      en_attente: 'Saisi',
      valide_admin: 'Validé',
      en_fabrication: 'En fabrication',
      controle_qualite: 'Contrôle qualité',
      termine: 'Terminé',
      pret: 'Prêt',
      livre: 'Livré',
      annule: 'Annulé'
    };

    const normalizedStatus = labelToDb[status] || status;
    const fallbackLabel = dbToLabel[normalizedStatus];

    console.log('🔄 Mise à jour du statut:', { orderId, requestedStatus: status, normalizedStatus, note });

    // Vérifier d'abord si la commande existe
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('❌ Commande non trouvée:', fetchError);
      return false;
    }

    if (!existingOrder) {
      console.error('❌ Commande inexistante avec ID:', orderId);
      return false;
    }

    // Si aucun changement (accepte code ou label comme équivalents), ne rien faire
    if (existingOrder.status === normalizedStatus || (fallbackLabel && existingOrder.status === fallbackLabel)) {
      console.log('ℹ️ Statut inchangé, aucune mise à jour nécessaire.', { current: existingOrder.status, requested: normalizedStatus });
      return true;
    }

    // Essayer plusieurs variantes pour compatibilité schémas différents
    const dbCodes = ['en_attente','valide_admin','en_fabrication','controle_qualite','pret','livre','annule'];
    // Forcer uniquement les codes DB, pas de labels FR en écriture
    const candidates = Array.from(new Set<string>([
      normalizedStatus,
      ...dbCodes
    ].filter(Boolean)));

    let lastError: any = null;
    for (const candidate of candidates) {
      const { error } = await supabase
        .from('orders')
        .update({ status: candidate })
        .eq('id', orderId);
      if (!error) {
        // Vérifier que la valeur a bien changé côté DB
        const { data: verify, error: verifyError } = await supabase
          .from('orders')
          .select('status')
          .eq('id', orderId)
          .single();
        if (!verifyError && verify && verify.status === candidate) {
          console.log('✅ Statut confirmé côté DB:', { from: existingOrder.status, to: candidate });
          // Historique best-effort
          try {
            const { error: tableError } = await supabase
              .from('order_status_history')
              .select('id')
              .limit(1);
            if (!tableError) {
              await supabase
                .from('order_status_history')
                .insert({
                  order_id: orderId,
                  status: candidate,
                  note: note || null,
                  changed_at: new Date().toISOString()
                });
            }
          } catch {}
          return true;
        } else {
          console.warn('⚠️ Mise à jour non reflétée à la lecture, tentative suivante...', { tried: candidate, verifyError: verifyError?.message, readBack: verify?.status });
          // Continuer avec le prochain candidat
          continue;
        }
      }
      lastError = error;
      console.warn('⚠️ Echec tentative statut:', { tried: candidate, code: error?.code, message: error?.message, details: error?.details });
      // Continuer à essayer d'autres variantes
    }

    if (lastError) {
      try {
        const errInfo = {
          message: (lastError as any)?.message,
          details: (lastError as any)?.details,
          hint: (lastError as any)?.hint,
          code: (lastError as any)?.code,
        } as Record<string, unknown>;
        const hasUseful = Object.values(errInfo).some(v => v !== undefined && v !== null && v !== '');
        if (hasUseful) {
          console.error('❌ Erreur finale lors de la mise à jour du statut:', errInfo);
        } else {
          let raw: string = '';
          try { raw = JSON.stringify(lastError); } catch { raw = String(lastError); }
          console.error('❌ Erreur finale lors de la mise à jour du statut (brute):', raw);
        }
      } catch {
        console.error('❌ Erreur finale lors de la mise à jour du statut (non sérialisable)');
      }
    } else {
      console.error('❌ Impossible de mettre à jour le statut: aucune tentative n\'a réussi', { triedCandidates: candidates });
    }
    return false;
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du statut de la commande:', error);
    console.error('❌ Type d\'erreur:', typeof error);
    console.error('❌ Erreur stringifiée:', JSON.stringify(error, null, 2));
    console.error('❌ Propriétés de l\'erreur:', Object.keys(error || {}));

    if (error && typeof error === 'object') {
      console.error('❌ Message:', (error as any).message);
      console.error('❌ Details:', (error as any).details);
      console.error('❌ Hint:', (error as any).hint);
      console.error('❌ Code:', (error as any).code);
      console.error('❌ Stack:', (error as any).stack);
    }

    return false;
  }
}

export async function updateOrderPayment(orderId: string, advance: number, secondAdvance: number): Promise<boolean> {
  try {
    // Calculer le nouveau montant restant
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('total_amount, discount')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      throw fetchError || new Error('Commande non trouvée');
    }

    const totalAfterDiscount = order.total_amount - (order.discount || 0);
    const remaining = totalAfterDiscount - advance - secondAdvance;

    // Mettre à jour les avances et le montant restant
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        advance,
        second_advance: secondAdvance,
        remaining_amount: remaining
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    // Enregistrer la modification dans l'historique
    const { error: historyError } = await supabase
      .from('order_modifications')
      .insert({
        order_id: orderId,
        modification_type: 'payment_update',
        description: `Avances mises à jour: Première avance: ${advance} TND, Deuxième avance: ${secondAdvance} TND`,
        modified_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Erreur lors de l\'enregistrement de la modification:', historyError);
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du paiement:', error);
    return false;
  }
}

export async function addOrderItem(orderId: string, item: {
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  description?: string;
}): Promise<boolean> {
  try {
    // Ajouter l'item
    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.total,
        description: item.description
      });

    if (itemError) {
      throw itemError;
    }

    // Mettre à jour le total de la commande
    await updateOrderTotal(orderId);

    // Enregistrer la modification
    const productName = await getProductName(item.productId);
    const { error: historyError } = await supabase
      .from('order_modifications')
      .insert({
        order_id: orderId,
        modification_type: 'item_added',
        description: `Produit ajouté: ${productName} (Qté: ${item.quantity}, Total: ${item.total} TND)`,
        modified_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Erreur lors de l\'enregistrement de la modification:', historyError);
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'item:', error);
    return false;
  }
}

export async function updateOrderItem(itemId: string, orderId: string, quantity: number, description?: string): Promise<boolean> {
  try {
    // Récupérer le prix unitaire pour recalculer le total
    const { data: item, error: fetchError } = await supabase
      .from('order_items')
      .select('unit_price, product_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      throw fetchError || new Error('Item non trouvé');
    }

    const newTotal = item.unit_price * quantity;

    // Mettre à jour l'item
    const { error: updateError } = await supabase
      .from('order_items')
      .update({
        quantity,
        total_price: newTotal,
        description
      })
      .eq('id', itemId);

    if (updateError) {
      throw updateError;
    }

    // Mettre à jour le total de la commande
    await updateOrderTotal(orderId);

    // Enregistrer la modification
    const productName = await getProductName(item.product_id);
    const { error: historyError } = await supabase
      .from('order_modifications')
      .insert({
        order_id: orderId,
        modification_type: 'item_updated',
        description: `Produit modifié: ${productName} (Nouvelle qté: ${quantity}, Nouveau total: ${newTotal} TND)`,
        modified_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Erreur lors de l\'enregistrement de la modification:', historyError);
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'item:', error);
    return false;
  }
}

export async function deleteOrderItem(itemId: string, orderId: string): Promise<boolean> {
  try {
    // Récupérer les infos de l'item avant suppression
    const { data: item, error: fetchError } = await supabase
      .from('order_items')
      .select('product_id, quantity, total_price')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      throw fetchError || new Error('Item non trouvé');
    }

    // Supprimer l'item
    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      throw deleteError;
    }

    // Mettre à jour le total de la commande
    await updateOrderTotal(orderId);

    // Enregistrer la modification
    const productName = await getProductName(item.product_id);
    const { error: historyError } = await supabase
      .from('order_modifications')
      .insert({
        order_id: orderId,
        modification_type: 'item_deleted',
        description: `Produit supprimé: ${productName} (Qté: ${item.quantity}, Total: ${item.total_price} TND)`,
        modified_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Erreur lors de l\'enregistrement de la modification:', historyError);
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'item:', error);
    return false;
  }
}

// Fonctions utilitaires
async function updateOrderTotal(orderId: string): Promise<void> {
  // Recalculer le total de la commande
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('total_price')
    .eq('order_id', orderId);

  if (itemsError) {
    console.error('Erreur lors du calcul du total:', itemsError);
    return;
  }

  const total = items?.reduce((sum, item) => sum + item.total_price, 0) || 0;

  // Mettre à jour le total et recalculer le montant restant
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('discount, advance, second_advance')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('Erreur lors de la récupération de la commande:', orderError);
    return;
  }

  const remaining = total - (order.discount || 0) - (order.advance || 0) - (order.second_advance || 0);

  await supabase
    .from('orders')
    .update({
      total_amount: total,
      remaining_amount: remaining
    })
    .eq('id', orderId);
}

async function getProductName(productId: string): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .select('name')
    .eq('id', productId)
    .single();

  return data?.name || 'Produit inconnu';
}

// Fonction de diagnostic pour tester les tables
export async function testStatusTables(): Promise<void> {
  console.log('🔍 Test des tables de statut...');

  try {
    // Test table orders
    const { data: ordersTest, error: ordersError } = await supabase
      .from('orders')
      .select('id, status')
      .limit(1);

    console.log('📋 Table orders:', ordersError ? 'ERREUR' : 'OK', ordersTest?.length || 0, 'records');

    // Test table order_status_history
    const { data: historyTest, error: historyError } = await supabase
      .from('order_status_history')
      .select('id')
      .limit(1);

    console.log('📝 Table order_status_history:', historyError ? 'MANQUANTE' : 'OK', historyTest?.length || 0, 'records');

    // Test table order_modifications
    const { data: modifTest, error: modifError } = await supabase
      .from('order_modifications')
      .select('id')
      .limit(1);

    console.log('🔧 Table order_modifications:', modifError ? 'MANQUANTE' : 'OK', modifTest?.length || 0, 'records');

    if (historyError || modifError) {
      console.warn('⚠️ Certaines tables manquent. Exécutez migration_tables_manquantes.sql');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test des tables:', error);
  }
}

// Ordres de production
export interface ProductionOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  notes?: string;
  imageUrl?: string;
  // Validation par produit
  productionStatus?: 'pending' | 'approved' | 'rejected';
  productionValidatedAt?: Date;
  productionValidatedBy?: string;
  qualityStatus?: 'pending' | 'approved' | 'rejected';
  qualityValidatedAt?: Date;
  qualityValidatedBy?: string;
  quantityProduced?: number;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  title?: string; // Titre personnalisé
  bcOrigins?: Array<{ // Plusieurs BC peuvent être liées à un OF (format camelCase)
    orderId: string;
    orderNumber: string;
    percentage: number;
  }>;
  bc_origins?: Array<{ // Support format snake_case pour compatibilité DB
    orderId?: string;
    order_id?: string;
    orderNumber?: string;
    order_number?: string;
    percentage?: number;
  }>;
  laboratory: string;
  // Aligne avec les statuts DB mis à jour (migration_production_improvements)
  status: 'cree' | 'validation_production' | 'production_validee' | 'validation_qualite' | 'qualite_validee' | 'non_conforme' | 'en_fabrication' | 'production_terminee' | 'termine' | 'annule';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  createdAt: Date;
  targetDate: Date;
  deliveryDate?: Date; // Date de livraison production
  items: ProductionOrderItem[];
  qualityApprovedAt?: Date;
  qualityApprovedBy?: string;
  quantityApprovedAt?: Date;
  quantityApprovedBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  console.log('🔍 Récupération des ordres de production...');

  // D'abord essayer avec toutes les colonnes de validation
  let data: any = null;
  let error: any = null;
  let hasValidationColumns = true;

  try {
    const result = await supabase
      .from('production_orders')
      .select(`
        *,
        production_order_items(
          id,
          product_id,
          quantity_required,
          quantity_produced,
          laboratory,
          special_instructions,
          production_status,
          production_validated_at,
          production_validated_by,
          quality_status,
          quality_validated_at,
          quality_validated_by,
          validation_notes,
          products(name, unit, image_url)
        )
      `)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;

    if (error && error.message.includes('column')) {
      hasValidationColumns = false;
      console.log('⚠️ Colonnes de validation non trouvées, utilisation mode compatibilité');
    }
  } catch (err) {
    hasValidationColumns = false;
    console.log('⚠️ Erreur lors de la récupération avec colonnes validation:', err);
  }

  // Si pas de colonnes de validation, essayer sans
  if (!hasValidationColumns) {
    const fallbackResult = await supabase
      .from('production_orders')
      .select(`
        *,
        production_order_items(
          id,
          product_id,
          quantity_required,
          quantity_produced,
          laboratory,
          special_instructions,
          products(name, unit, image_url)
        )
      `)
      .order('created_at', { ascending: false });

    data = fallbackResult.data;
    error = fallbackResult.error;
    console.log('📦 Mode compatibilité activé: récupération sans colonnes validation');
  }

  if (error) {
    console.error('❌ Erreur lors de la récupération des ordres de production:', error);
    return [];
  }

  console.log(`✅ ${data?.length || 0} ordres récupérés (validation columns: ${hasValidationColumns})`);

  if (!data) return [];

  return data?.map((order: any) => ({
    id: order.id,
    orderNumber: order.order_number,
    title: order.title,
    bcOrigins: order.bc_origins || [],
    laboratory: order.laboratory,
    status: mapStatus(order.status),
    priority: mapPriority(order.priority),
    createdAt: new Date(order.created_at),
    targetDate: order.scheduled_end ? new Date(order.scheduled_end) : new Date(order.created_at),
    deliveryDate: order.delivery_date ? new Date(order.delivery_date) : undefined,
    items: order.production_order_items?.map((item: any) => {
      console.log(`📦 Mapping item ${item.id}:`, {
        production_status: item.production_status,
        quality_status: item.quality_status,
        hasValidationColumns
      });

      return {
        id: item.id,
        productId: item.product_id,
        productName: item.products?.name || 'Produit inconnu',
        quantity: item.quantity_required,
        unit: item.products?.unit || 'pièce',
        notes: item.special_instructions,
        imageUrl: item.products?.image_url || '/logo-essoukri.jpg',
        // Validation par produit avec fallback intelligent
        productionStatus: hasValidationColumns
          ? (item.production_status || 'pending')
          : 'pending', // Par défaut 'pending' si pas de colonnes
        productionValidatedAt: item.production_validated_at ? new Date(item.production_validated_at) : undefined,
        productionValidatedBy: item.production_validated_by,
        qualityStatus: hasValidationColumns
          ? (item.quality_status || 'pending')
          : 'pending', // Par défaut 'pending' si pas de colonnes
        qualityValidatedAt: item.quality_validated_at ? new Date(item.quality_validated_at) : undefined,
        qualityValidatedBy: item.quality_validated_by,
        quantityProduced: item.quantity_produced
      };
    }) || [],
    qualityApprovedAt: order.quality_validated_at ? new Date(order.quality_validated_at) : undefined,
    qualityApprovedBy: order.quality_validated_by,
    quantityApprovedAt: order.quantity_validated_at ? new Date(order.quantity_validated_at) : undefined,
    quantityApprovedBy: order.quantity_validated_by,
    startedAt: order.actual_start ? new Date(order.actual_start) : undefined,
    completedAt: order.actual_end ? new Date(order.actual_end) : undefined,
    notes: order.production_notes || order.notes
  })) || [];
}

// Fonction de mapping des statuts vers le modèle actuel (identité si déjà nouveau)
function mapStatus(dbStatus: string): ProductionOrder['status'] {
  const legacyToNew: Record<string, ProductionOrder['status']> = {
    en_attente_validation_admin: 'validation_production',
    valide_admin: 'production_validee',
    en_attente_validation_qualite: 'validation_qualite',
    valide_qualite: 'qualite_validee',
    en_attente_validation_quantite: 'validation_qualite',
    valide_quantite: 'qualite_validee',
    en_fabrication: 'en_fabrication',
    termine: 'termine',
    annule: 'annule'
  };
  return (
    (['cree','validation_production','production_validee','validation_qualite','qualite_validee','non_conforme','en_fabrication','termine','annule'] as const)
      .includes(dbStatus as any)
      ? (dbStatus as ProductionOrder['status'])
      : (legacyToNew[dbStatus] || 'cree')
  );
}

// Fonction de mapping des priorités (DB vers interface - après migration, les deux sont en anglais)
function mapPriority(priority: string): 'urgent' | 'high' | 'normal' | 'low' {
  // Support pour les anciennes et nouvelles valeurs pendant la transition
  const priorityMap: Record<string, any> = {
    // Anciennes valeurs françaises (pour compatibilité)
    'urgente': 'urgent',
    'haute': 'high',
    'normale': 'normal',
    'basse': 'low',
    // Nouvelles valeurs anglaises (après migration)
    'urgent': 'urgent',
    'high': 'high',
    'normal': 'normal',
    'low': 'low'
  };
  return priorityMap[priority] || 'normal';
}

// Fonction de mapping des priorités (interface anglais vers DB anglais)
function mapPriorityToDB(priority: 'urgent' | 'high' | 'normal' | 'low'): string {
  // Après la migration, la DB attend les valeurs en anglais
  return priority;
}

export async function createProductionOrder(orderData: {
  orderIds: string[]; // Maintenant on peut avoir plusieurs BC
  laboratory: string;
  title?: string; // Titre personnalisé
  items: Array<{
    productId: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  targetDate: Date;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  notes?: string;
}): Promise<ProductionOrder | null> {
  try {
    console.log('🏭 Début création ordre de production:', orderData);

    // Vérifier que nous avons des données valides
    if (!orderData.orderIds || orderData.orderIds.length === 0) {
      throw new Error('Aucune commande sélectionnée');
    }

    if (!orderData.laboratory) {
      throw new Error('Laboratoire non spécifié');
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Aucun produit spécifié');
    }

    // Vérifier que les commandes existent
    console.log('🔍 Vérification des commandes:', orderData.orderIds);
    for (const orderId of orderData.orderIds) {
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('id, order_number, status')
        .eq('id', orderId)
        .single();

      if (checkError || !existingOrder) {
        console.error('❌ Commande non trouvée:', orderId, checkError);
        throw new Error(`Commande ${orderId} non trouvée`);
      }
      // N'autoriser que les BC validés par l'admin
      const isValidatedByAdmin = existingOrder.status === 'valide_admin' || existingOrder.status === 'Validé';
      if (!isValidatedByAdmin) {
        throw new Error(`Le BC ${existingOrder.order_number} doit être "validé par l'admin" avant de créer un OF`);
      }
      console.log('✅ Commande trouvée et validée:', existingOrder.order_number);
    }

    // Générer le numéro d'ordre de production
    const today = new Date();
    const year = today.getFullYear();
    const orderNumber = `OF-${year}-${String(Date.now()).slice(-6)}`;
    console.log('📋 Numéro OF généré:', orderNumber);

    // Après migration, la DB attend les valeurs en anglais
    const priority = orderData.priority || 'normal';

    console.log('🎯 Priorité utilisée:', priority);

    // Préparer les données pour insertion
    const insertData = {
      order_number: orderNumber,
      order_id: orderData.orderIds[0], // Pour compatibilité avec l'ancien schema
      laboratory: orderData.laboratory,
      // Démarre par validation de production avant hygiène (qualité+quantité)
      status: 'validation_production',
      priority: priority,
      scheduled_end: orderData.targetDate.toISOString(),
      production_notes: orderData.notes
    };

    console.log('📝 Données à insérer:', insertData);

    // Créer l'ordre de production, avec fallback legacy des statuts si contrainte CHECK
    let productionOrder: any = null;
    {
      const { data, error } = await supabase
      .from('production_orders')
      .insert(insertData)
      .select()
      .single();
      productionOrder = data;
      if (error && error.code === '23514') {
        // Fallback: utiliser anciens codes
        const legacyInsert = { ...insertData, status: 'en_attente_validation_admin' };
        const { data: legacyData, error: legacyErr } = await supabase
          .from('production_orders')
          .insert(legacyInsert)
          .select()
          .single();
        productionOrder = legacyData;
        if (legacyErr) {
          console.error('❌ Erreur insertion OF (legacy fallback):', {
            message: legacyErr.message,
            details: legacyErr.details,
            hint: legacyErr.hint,
            code: legacyErr.code
          });
          throw legacyErr;
        }
      } else if (error) {
      console.error('❌ Erreur lors de l\'insertion de l\'ordre de production:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
    }

    console.log('✅ Ordre de production créé:', productionOrder);

    // Créer les items de l'ordre de production
    console.log('📦 Création des items de production...');
    const productionOrderItems = orderData.items.map(item => ({
      production_order_id: productionOrder.id,
      product_id: item.productId,
      quantity_required: item.quantity,
      laboratory: orderData.laboratory,
      special_instructions: item.notes,
      // Si la colonne notes existe, elle sera ignorée par Supabase si absente
      notes: item.notes
    }));

    console.log('📦 Items à créer:', productionOrderItems);

    // Insérer les items avec fallback si la colonne 'notes' n'existe pas encore
    let itemsError = null as any;
    {
      const { error } = await supabase
      .from('production_order_items')
      .insert(productionOrderItems);
      itemsError = error;
    }

    if (itemsError) {
      const isMissingNotes =
        itemsError.code === '42703' ||
        (typeof itemsError.message === 'string' && itemsError.message.toLowerCase().includes('notes'));

      if (isMissingNotes) {
        console.warn('⚠️ Colonne notes manquante, ré-essai sans le champ notes');
        const fallbackItems = productionOrderItems.map((it: any) => {
          const { notes, ...rest } = it;
          return rest;
        });
        const { error: retryError } = await supabase
          .from('production_order_items')
          .insert(fallbackItems);
        if (retryError) {
          console.error('❌ Erreur lors de la création des items (retry sans notes):', {
            message: retryError.message,
            details: retryError.details,
            hint: retryError.hint
          });
          throw retryError;
        }
      } else {
      console.error('❌ Erreur lors de la création des items:', {
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint
      });
      throw itemsError;
      }
    }

    console.log('✅ Items de production créés');

    // Ne pas synchroniser automatiquement à la création - le BC garde son statut actuel

    // Retourner l'ordre de production complet
    const allOrders = await getProductionOrders();
    return allOrders.find(order => order.id === productionOrder.id) || null;

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'ordre de production:', error);
    console.error('❌ Type d\'erreur:', typeof error);
    console.error('❌ Erreur stringifiée:', JSON.stringify(error, null, 2));
    console.error('❌ Propriétés de l\'erreur:', Object.keys(error || {}));

    if (error && typeof error === 'object') {
      console.error('❌ Message:', (error as any).message);
      console.error('❌ Details:', (error as any).details);
      console.error('❌ Hint:', (error as any).hint);
      console.error('❌ Code:', (error as any).code);
      console.error('❌ Stack:', (error as any).stack);
    }

    throw error; // Re-lancer l'erreur pour voir ce qui se passe côté frontend
  }
}

export async function updateProductionOrderStatus(
  orderId: string,
  status: ProductionOrder['status'],
  userId?: string
): Promise<boolean> {
  try {
    // Workflow correct: Création → Validation Prod → Validation Qualité → Terminé
    const allowed: ProductionOrder['status'][] = ['cree','validation_production','production_validee','validation_qualite','qualite_validee','non_conforme','en_fabrication','production_terminee','termine','annule'];

    console.log('🔄 Changement statut OF:', { orderId, currentStatus: status, newStatus: status });
    const nextStatus: ProductionOrder['status'] = allowed.includes(status) ? status : 'cree';

    const updateData: any = { status: nextStatus };

    // Mettre en priorité urgente automatiquement si non-conforme
    if (nextStatus === 'non_conforme') {
      updateData.priority = 'urgent';
      console.log('🚨 OF mis en priorité urgente pour non-conformité:', orderId);
    }

    const now = new Date().toISOString();
    if (nextStatus === 'qualite_validee' && userId) {
      // Hygiène (qualité+quantité) validées
      updateData.quality_validated_at = now;
      updateData.quality_validated_by = userId;
      updateData.quantity_validated_at = now;
      updateData.quantity_validated_by = userId;
    } else if (nextStatus === 'production_validee' && userId) {
      updateData.admin_validated_at = now;
      updateData.admin_validated_by = userId;
    } else if (nextStatus === 'en_fabrication') {
      updateData.actual_start = now;
    } else if (nextStatus === 'production_terminee') {
      updateData.production_finished_at = now;
    } else if (nextStatus === 'termine') {
      updateData.actual_end = now;
    }

    let { error } = await supabase
      .from('production_orders')
      .update(updateData)
      .eq('id', orderId);

    if (error && error.code === '23514') {
      // Fallback legacy si la contrainte refuse le nouveau statut
      const newToLegacy: Record<string, string> = {
        validation_production: 'en_attente_validation_admin',
        production_validee: 'valide_admin',
        validation_qualite: 'en_attente_validation_qualite',
        qualite_validee: 'valide_qualite',
        en_fabrication: 'en_fabrication',
        termine: 'termine',
        annule: 'annule',
        non_conforme: 'non_conforme',
        cree: 'cree'
      };
      updateData.status = newToLegacy[nextStatus] || nextStatus;
      const retry = await supabase
        .from('production_orders')
        .update(updateData)
        .eq('id', orderId);
      error = retry.error;
    }

    if (error) throw error;

    // Synchroniser les statuts des commandes liées après succès
    // Pour tous les changements de statut significatifs
    const statusesToSync: ProductionOrder['status'][] = [
      'production_validee',
      'qualite_validee',
      'en_fabrication',
      'production_terminee',
      'termine',
      'non_conforme',
      'annule'
    ];

    if (statusesToSync.includes(nextStatus)) {
      console.log('🔄 Déclenchement synchronisation BC pour statut OF:', nextStatus);
      await synchronizeOrderStatusWithProductionOrders(orderId);
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de l\'ordre de production:', error);
    return false;
  }
}

async function synchronizeOrderStatusWithProductionOrders(productionOrderId: string): Promise<void> {
  try {
    console.log('🔄 Synchronisation statuts BC pour OF:', productionOrderId);

    // Récupérer l'ordre de production avec ses origines BC et order_id
    const { data: productionOrder, error: poError } = await supabase
      .from('production_orders')
      .select('id, status, bc_origins, order_id')
      .eq('id', productionOrderId)
      .single();

    if (poError || !productionOrder) {
      console.error('❌ Erreur lors de la récupération de l\'ordre de production:', poError);
      return;
    }

    // Récupérer les IDs des commandes liées
    let linkedOrderIds: string[] = [];

    // Essayer bc_origins en premier
    if (productionOrder.bc_origins && Array.isArray(productionOrder.bc_origins) && productionOrder.bc_origins.length > 0) {
      linkedOrderIds = productionOrder.bc_origins.map((bc: any) => bc.orderId).filter(Boolean);
    }

    // Fallback vers order_id
    if (linkedOrderIds.length === 0 && productionOrder.order_id) {
      linkedOrderIds = [productionOrder.order_id];
    }

    // Si pas d'origines BC, pas de synchronisation nécessaire
    if (linkedOrderIds.length === 0) {
      console.warn('⚠️ Aucune commande liée trouvée pour la synchronisation');
      return;
    }

    console.log('📋 Commandes à synchroniser:', linkedOrderIds);

    // Pour chaque commande liée, récupérer tous ses ordres de production
    for (const orderId of linkedOrderIds) {
      console.log(`📋 Synchronisation pour commande: ${orderId}`);

      // Récupérer tous les ordres de production liés à cette commande (nouveau format et ancien)
      const [newFormatOrders, oldFormatOrders] = await Promise.all([
        // Nouveau format avec bc_origins
        supabase
          .from('production_orders')
          .select('id, status, bc_origins, order_id')
          .contains('bc_origins', [{ orderId }]),
        // Ancien format avec order_id
        supabase
          .from('production_orders')
          .select('id, status, bc_origins, order_id')
          .eq('order_id', orderId)
      ]);

      const relatedProductionOrders = [
        ...(newFormatOrders.data || []),
        ...(oldFormatOrders.data || [])
      ];

      // Supprimer les doublons
      const uniqueOrders = relatedProductionOrders.filter(
        (order, index, self) => index === self.findIndex(o => o.id === order.id)
      );

      if (uniqueOrders.length === 0) {
        console.warn(`⚠️ Aucun ordre de production trouvé pour la commande ${orderId}`);
        continue;
      }

      console.log(`📦 ${uniqueOrders.length} ordres de production trouvés pour BC ${orderId}`);

      // Calculer le statut global basé sur tous les ordres de production
      const orderStatus = calculateOrderStatusFromProductionOrders(uniqueOrders);

      // Mettre à jour le statut de la commande
      if (orderStatus) {
        console.log(`🔄 Mise à jour statut BC ${orderId} vers: ${orderStatus}`);
        await updateOrderStatus(orderId, orderStatus);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation des statuts:', error);
  }
}

function calculateOrderStatusFromProductionOrders(productionOrders: any[]): string | null {
  if (!productionOrders || productionOrders.length === 0) {
    return null;
  }

  const statusCounts = {
    termine: productionOrders.filter(po => po.status === 'termine').length,
    production_terminee: productionOrders.filter(po => po.status === 'production_terminee').length,
    en_fabrication: productionOrders.filter(po => po.status === 'en_fabrication').length,
    qualite_validee: productionOrders.filter(po => po.status === 'qualite_validee').length,
    validation_qualite: productionOrders.filter(po => po.status === 'validation_qualite').length,
    production_validee: productionOrders.filter(po => po.status === 'production_validee').length,
    validation_production: productionOrders.filter(po => po.status === 'validation_production').length,
    non_conforme: productionOrders.filter(po => po.status === 'non_conforme').length,
    annule: productionOrders.filter(po => po.status === 'annule').length,
    cree: productionOrders.filter(po => po.status === 'cree').length
  };

  const total = productionOrders.length;

  console.log('📊 Calcul statut BC depuis OF:', { statusCounts, total });

  // Si tous les ordres sont terminés (termine ou production_terminee)
  if (statusCounts.termine === total || (statusCounts.termine + statusCounts.production_terminee) === total) {
    console.log('✅ Tous les OF terminés → BC Terminé');
    return 'Terminé';
  }

  // Si au moins un ordre est non conforme ou annulé
  if (statusCounts.non_conforme > 0 || statusCounts.annule > 0) {
    console.log('❌ OF non conforme/annulé détecté → BC Annulé');
    return 'Annulé';
  }

  // Si au moins un ordre est en fabrication
  if (statusCounts.en_fabrication > 0) {
    console.log('🏭 OF en fabrication détecté → BC En fabrication');
    return 'En fabrication';
  }

  // Si tous les ordres sont au moins validés (prêts pour fabrication)
  const validatedCount = statusCounts.production_validee +
                        statusCounts.validation_qualite +
                        statusCounts.qualite_validee +
                        statusCounts.production_terminee +
                        statusCounts.termine;

  if (validatedCount === total) {
    console.log('✓ Tous les OF validés → BC Validé (prêt)');
    return 'pret'; // Nouveau statut pour indiquer que tout est prêt
  }

  // Si au moins un ordre est validé
  if (validatedCount > 0) {
    console.log('⏳ Certains OF validés → BC Validé');
    return 'Validé';
  }

  // Sinon, garder le statut par défaut
  console.log('📝 Aucun OF validé → BC Saisi');
  return 'Saisi';
}

export function getProductionStatistics(orders: ProductionOrder[]) {
  return {
    total: orders.length,
    byStatus: {
      cree: orders.filter(o => o.status === 'cree').length,
      validation_production: orders.filter(o => o.status === 'validation_production').length,
      production_validee: orders.filter(o => o.status === 'production_validee').length,
      validation_qualite: orders.filter(o => o.status === 'validation_qualite').length,
      qualite_validee: orders.filter(o => o.status === 'qualite_validee').length,
      non_conforme: orders.filter(o => o.status === 'non_conforme').length,
      en_fabrication: orders.filter(o => o.status === 'en_fabrication').length,
      production_terminee: orders.filter(o => o.status === 'production_terminee').length,
      termine: orders.filter(o => o.status === 'termine').length,
      annule: orders.filter(o => o.status === 'annule').length,
      // Alias legacy pour compat UI existante
      pendingQuality: orders.filter(o => o.status === 'validation_qualite').length,
      pendingQuantity: 0,
      approved: orders.filter(o => o.status === 'qualite_validee').length,
      inProduction: orders.filter(o => o.status === 'en_fabrication').length,
      completed: orders.filter(o => o.status === 'termine').length
    },
    byPriority: {
      urgent: orders.filter(o => o.priority === 'urgent').length,
      high: orders.filter(o => o.priority === 'high').length,
      normal: orders.filter(o => o.priority === 'normal').length,
      low: orders.filter(o => o.priority === 'low').length
    },
    byLaboratory: orders.reduce((acc, order) => {
      acc[order.laboratory] = (acc[order.laboratory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

// Fonctions pour la validation de production
export async function createProductionValidation(data: {
  productionOrderId: string;
  validationType: ValidationType;
  status: ValidationStatus;
  validatorId?: string;
  notes?: string;
  nonConformityReason?: string;
  correctiveAction?: string;
  correctiveActionProposed?: string;
  priority?: ValidationPriority;
}): Promise<ProductionValidation | null> {
  try {
    const { data: validation, error } = await supabase
      .from('production_validations')
      .insert({
        production_order_id: data.productionOrderId,
        validation_type: data.validationType,
        status: data.status,
        validator_id: data.validatorId,
        notes: data.notes,
        non_conformity_reason: data.nonConformityReason,
        corrective_action: data.correctiveAction,
        corrective_action_proposed: data.correctiveActionProposed,
        priority: data.priority,
        validated_at: data.status === 'valide' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création de la validation:', error);
      return null;
    }

    const result = {
      id: validation.id,
      productionOrderId: validation.production_order_id,
      validationType: validation.validation_type,
      status: validation.status,
      validatorId: validation.validator_id,
      validatedAt: validation.validated_at ? new Date(validation.validated_at) : undefined,
      notes: validation.notes,
      nonConformityReason: validation.non_conformity_reason,
      correctiveAction: validation.corrective_action,
      correctiveActionProposed: validation.corrective_action_proposed,
      priority: validation.priority,
      createdAt: new Date(validation.created_at),
      updatedAt: new Date(validation.updated_at)
    } as ProductionValidation;

    // Transition auto des statuts OF selon validations
    if (data.validationType === 'production') {
      await updateProductionOrderStatus(data.productionOrderId, data.status === 'valide' ? 'production_validee' : 'validation_production', data.validatorId);
    }
    if (data.validationType === 'qualite' || data.validationType === 'quantite' || data.validationType === 'hygiene') {
      if (data.status === 'non_conforme') {
        await updateProductionOrderStatus(data.productionOrderId, 'non_conforme', data.validatorId);
      } else if (data.status === 'valide') {
        // Approche combinée hygiène: service hygiène valide qualité + quantité ensemble
        if (data.validationType === 'hygiene') {
          await updateProductionOrderStatus(data.productionOrderId, 'qualite_validee', data.validatorId);
        } else {
          await updateProductionOrderStatus(data.productionOrderId, 'validation_qualite', data.validatorId);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Erreur lors de la création de la validation:', error);
    return null;
  }
}

export async function updateProductionValidation(
  validationId: string,
  updates: Partial<ProductionValidation>
): Promise<boolean> {
  try {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.validatorId) updateData.validator_id = updates.validatorId;
    if (updates.notes) updateData.notes = updates.notes;
    if (updates.nonConformityReason) updateData.non_conformity_reason = updates.nonConformityReason;
    if (updates.correctiveAction) updateData.corrective_action = updates.correctiveAction;
    if (updates.correctiveActionProposed) updateData.corrective_action_proposed = updates.correctiveActionProposed;
    if (updates.priority) updateData.priority = updates.priority;

    if (updates.status === 'valide') {
      updateData.validated_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('production_validations')
      .update(updateData)
      .eq('id', validationId);

    if (error) {
      console.error('Erreur lors de la mise à jour de la validation:', error);
      return false;
    }

    // Charger la validation pour déterminer le type/ordre et propager le statut OF
    const { data: v } = await supabase
      .from('production_validations')
      .select('id, production_order_id, validation_type, status, validator_id')
      .eq('id', validationId)
      .single();

    if (v) {
      if (v.validation_type === 'production') {
        await updateProductionOrderStatus(v.production_order_id, v.status === 'valide' ? 'production_validee' : 'validation_production', v.validator_id);
      } else if (v.validation_type === 'qualite' || v.validation_type === 'quantite' || v.validation_type === 'hygiene') {
        if (v.status === 'non_conforme') {
          await updateProductionOrderStatus(v.production_order_id, 'non_conforme', v.validator_id);
        } else if (v.status === 'valide') {
          if (v.validation_type === 'hygiene') {
            await updateProductionOrderStatus(v.production_order_id, 'qualite_validee', v.validator_id);
          } else {
            await updateProductionOrderStatus(v.production_order_id, 'validation_qualite', v.validator_id);
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la validation:', error);
    return false;
  }
}

export async function getProductionValidations(productionOrderId: string): Promise<ProductionValidation[]> {
  try {
    const { data, error } = await supabase
      .from('production_validations')
      .select('*')
      .eq('production_order_id', productionOrderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des validations:', error);
      return [];
    }

    return data.map(validation => ({
      id: validation.id,
      productionOrderId: validation.production_order_id,
      validationType: validation.validation_type,
      status: validation.status,
      validatorId: validation.validator_id,
      validatedAt: validation.validated_at ? new Date(validation.validated_at) : undefined,
      notes: validation.notes,
      nonConformityReason: validation.non_conformity_reason,
      correctiveAction: validation.corrective_action,
      correctiveActionProposed: validation.corrective_action_proposed,
      priority: validation.priority,
      createdAt: new Date(validation.created_at),
      updatedAt: new Date(validation.updated_at)
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des validations:', error);
    return [];
  }
}

// Fonctions pour les détails qualité des commandes
export async function createOrderQualityDetails(data: {
  orderId: string;
  qualitySpecifications?: Record<string, any>;
  qualityNotes?: string;
  qualityRequirements?: string;
  quantitySpecifications?: Record<string, any>;
  quantityNotes?: string;
  weightRequirements?: string;
  dimensionsRequirements?: string;
  hygieneRequirements?: string;
  hygieneNotes?: string;
  hygieneCorrectiveActions?: string[];
  canExamineBCWithoutPrice?: boolean;
}): Promise<OrderQualityDetails | null> {
  try {
    const { data: qualityDetails, error } = await supabase
      .from('order_quality_details')
      .insert({
        order_id: data.orderId,
        quality_specifications: data.qualitySpecifications,
        quality_notes: data.qualityNotes,
        quality_requirements: data.qualityRequirements,
        quantity_specifications: data.quantitySpecifications,
        quantity_notes: data.quantityNotes,
        weight_requirements: data.weightRequirements,
        dimensions_requirements: data.dimensionsRequirements,
        hygiene_requirements: data.hygieneRequirements,
        hygiene_notes: data.hygieneNotes,
        hygiene_corrective_actions: data.hygieneCorrectiveActions,
        can_examine_bc_without_price: data.canExamineBCWithoutPrice
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création des détails qualité:', error);
      return null;
    }

    return {
      id: qualityDetails.id,
      orderId: qualityDetails.order_id,
      qualitySpecifications: qualityDetails.quality_specifications,
      qualityNotes: qualityDetails.quality_notes,
      qualityRequirements: qualityDetails.quality_requirements,
      quantitySpecifications: qualityDetails.quantity_specifications,
      quantityNotes: qualityDetails.quantity_notes,
      weightRequirements: qualityDetails.weight_requirements,
      dimensionsRequirements: qualityDetails.dimensions_requirements,
      hygieneRequirements: qualityDetails.hygiene_requirements,
      hygieneNotes: qualityDetails.hygiene_notes,
      hygieneCorrectiveActions: qualityDetails.hygiene_corrective_actions,
      canExamineBCWithoutPrice: qualityDetails.can_examine_bc_without_price,
      createdAt: new Date(qualityDetails.created_at),
      updatedAt: new Date(qualityDetails.updated_at)
    };
  } catch (error) {
    console.error('Erreur lors de la création des détails qualité:', error);
    return null;
  }
}

export async function getOrderQualityDetails(orderId: string): Promise<OrderQualityDetails | null> {
  try {
    const { data, error } = await supabase
      .from('order_quality_details')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Pas de données trouvées, c'est normal
        return null;
      }
      console.error('Erreur lors de la récupération des détails qualité:', error);
      return null;
    }

    return {
      id: data.id,
      orderId: data.order_id,
      qualitySpecifications: data.quality_specifications,
      qualityNotes: data.quality_notes,
      qualityRequirements: data.quality_requirements,
      quantitySpecifications: data.quantity_specifications,
      quantityNotes: data.quantity_notes,
      weightRequirements: data.weight_requirements,
      dimensionsRequirements: data.dimensions_requirements,
      hygieneRequirements: data.hygiene_requirements,
      hygieneNotes: data.hygiene_notes,
      hygieneCorrectiveActions: data.hygiene_corrective_actions,
      canExamineBCWithoutPrice: data.can_examine_bc_without_price,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des détails qualité:', error);
    return null;
  }
}

export async function testDatabaseDiagnostic(): Promise<void> {
  try {
    console.log('🔬 DIAGNOSTIC COMPLET DE LA BASE DE DONNÉES');
    console.log('================================================');

    // Test 1: Structure table production_orders
    console.log('🔍 1. Test structure table production_orders...');
    const { data: prodOrders, error: prodOrdersError } = await supabase
      .from('production_orders')
      .select('*')
      .limit(1);

    if (prodOrdersError) {
      console.error('❌ Erreur table production_orders:', prodOrdersError);
    } else {
      console.log('✅ Table production_orders accessible');
      if (prodOrders && prodOrders.length > 0) {
        console.log('📋 Colonnes:', Object.keys(prodOrders[0]));
      }
    }

    // Test 2: Structure table production_order_items
    console.log('\n🔍 2. Test structure table production_order_items...');
    const { data: items, error: itemsError } = await supabase
      .from('production_order_items')
      .select('*')
      .limit(1);

    if (itemsError) {
      console.error('❌ Erreur table production_order_items:', itemsError);
    } else {
      console.log('✅ Table production_order_items accessible');
    }

    // Test 3: Test insertion simple
    console.log('\n🔍 3. Test insertion simple...');
    const testData = {
      order_number: `TEST-${Date.now()}`,
      order_id: '00000000-0000-0000-0000-000000000000',
      laboratory: 'TEST',
      status: 'cree',
      priority: 'normal',
      scheduled_end: new Date().toISOString()
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('production_orders')
      .insert(testData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erreur insertion test:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
    } else {
      console.log('✅ Insertion test réussie:', insertResult);

      // Nettoyer
      await supabase.from('production_orders').delete().eq('id', insertResult.id);
      console.log('🗑️ Test nettoyé');
    }

    // Test 4: Vérifier les contraintes
    console.log('\n🔍 4. Test contraintes de clés étrangères...');
    const invalidOrderData = {
      order_number: `TEST-INVALID-${Date.now()}`,
      order_id: '11111111-1111-1111-1111-111111111111', // UUID qui n'existe pas
      laboratory: 'TEST',
      status: 'cree',
      priority: 'normal',
      scheduled_end: new Date().toISOString()
    };

    const { error: constraintError } = await supabase
      .from('production_orders')
      .insert(invalidOrderData);

    if (constraintError) {
      console.log('✅ Contraintes FK fonctionnent:', constraintError.message);
    } else {
      console.log('⚠️ Aucune contrainte FK detectée');
    }

    console.log('\n📊 DIAGNOSTIC TERMINÉ');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

// Nouvelles fonctions pour la validation par produit

export async function validateProductionOrderItem(
  orderId: string,
  itemId: string,
  validationType: 'production' | 'quality',
  status: 'approved' | 'rejected',
  userId?: string, // Optionnel car la colonne est UUID dans la BD
  quantityProduced?: number,
  notes?: string
): Promise<boolean> {
  try {
    console.log('🔍 Validation produit:', {
      orderId,
      itemId,
      validationType,
      status,
      userId,
      quantityProduced,
      notes
    });

    // Vérifier d'abord que l'ordre de production existe
    const { data: productionOrder, error: poError } = await supabase
      .from('production_orders')
      .select('id, status, order_number')
      .eq('id', orderId)
      .single();

    if (poError || !productionOrder) {
      console.error('❌ Ordre de production non trouvé:', poError);
      throw new Error(`Ordre de production non trouvé: ${poError?.message || 'ID invalide'}`);
    }

    console.log('📋 Statut actuel de l\'OF:', productionOrder.status);

    // Vérifier que l'item existe
    const { data: existingItem, error: itemError } = await supabase
      .from('production_order_items')
      .select('*')
      .eq('id', itemId)
      .eq('production_order_id', orderId)
      .single();

    if (itemError || !existingItem) {
      console.error('❌ Item non trouvé:', itemError);
      throw new Error(`Item non trouvé: ${itemError?.message || 'ID invalide'}`);
    }

    console.log('📦 Item trouvé:', existingItem);

    // Préparer les données de mise à jour
    const updateData: any = {};
    const now = new Date().toISOString();

    if (validationType === 'production') {
      updateData.production_status = status;
      updateData.production_validated_at = now;
      // Ne pas inclure userId si undefined (colonne UUID dans la BD)
      if (userId) {
        updateData.production_validated_by = userId;
      }
      if (quantityProduced !== undefined) {
        updateData.quantity_produced = quantityProduced;
      }
    } else if (validationType === 'quality') {
      updateData.quality_status = status;
      updateData.quality_validated_at = now;
      // Ne pas inclure userId si undefined (colonne UUID dans la BD)
      if (userId) {
        updateData.quality_validated_by = userId;
      }
    }

    if (notes) {
      updateData.validation_notes = notes;
    }

    console.log('📊 Données à mettre à jour:', updateData);

    // Effectuer la mise à jour
    // Note: select() spécifique pour éviter l'ambiguïté avec order_id lors des jointures RLS
    const { data, error } = await supabase
      .from('production_order_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('production_order_id', orderId)
      .select(`
        id,
        production_order_id,
        product_id,
        quantity,
        unit,
        production_status,
        quality_status,
        quantity_produced,
        production_validated_at,
        production_validated_by,
        quality_validated_at,
        quality_validated_by,
        validation_notes
      `);

    if (error) {
      console.error('❌ Erreur lors de la validation du produit:', error);
      throw new Error(`Échec de la mise à jour: ${error.message}`);
    }

    console.log('✅ Validation produit réussie, données mises à jour:', data?.[0]);

    // Mettre à jour le statut global
    await checkAndUpdateOverallStatus(orderId, validationType);

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la validation du produit:', error);
    // Renvoyer l'erreur au lieu de retourner false pour avoir un message plus détaillé
    throw error;
  }
}

async function checkAndUpdateOverallStatus(orderId: string, validationType: 'production' | 'quality'): Promise<void> {
  try {
    console.log('🔍 Vérification statut global:', { orderId, validationType });

    // Récupérer l'ordre de production et ses items en une seule requête
    const { data: productionOrder, error: poError } = await supabase
      .from('production_orders')
      .select('id, status, order_number')
      .eq('id', orderId)
      .single();

    if (poError || !productionOrder) {
      console.error('❌ Erreur lors de la récupération de l\'ordre de production:', poError);
      return;
    }

    // Récupérer tous les items de l'ordre de production
    const { data: items, error } = await supabase
      .from('production_order_items')
      .select('production_status, quality_status')
      .eq('production_order_id', orderId);

    if (error) {
      console.error('❌ Erreur lors de la récupération des items:', error);
      return;
    }

    if (!items || items.length === 0) {
      console.warn('⚠️ Aucun item trouvé pour l\'ordre:', orderId);
      return;
    }

    console.log('📦 Items trouvés:', items.length, items);
    console.log('🔍 Statut actuel OF:', productionOrder.status);

    if (validationType === 'production') {
      // Vérifier que l'OF est dans un statut compatible pour validation production
      const validProductionStatuses = ['cree', 'validation_production', 'production_validee', 'non_conforme'];
      if (!validProductionStatuses.includes(productionOrder.status)) {
        console.log('ℹ️ OF non dans un statut compatible pour validation production, statut actuel:', productionOrder.status);
        return;
      }

      const allProductionApproved = items.every(item => item.production_status === 'approved');
      const hasRejectedItems = items.some(item => item.production_status === 'rejected');
      const hasPendingItems = items.some(item => !item.production_status || item.production_status === 'pending');

      console.log('🏭 Tous les items production approuvés?', allProductionApproved);
      console.log('🏭 Items rejetés?', hasRejectedItems);
      console.log('🏭 Items en attente?', hasPendingItems);

      if (allProductionApproved && !hasPendingItems) {
        console.log('✅ Mise à jour statut vers production_validee');
        await updateProductionOrderStatus(orderId, 'production_validee');
      } else if (hasRejectedItems) {
        console.log('❌ Mise à jour statut vers non_conforme (items rejetés)');
        await updateProductionOrderStatus(orderId, 'non_conforme');
      } else if (!hasPendingItems && (productionOrder.status === 'cree' || productionOrder.status === 'non_conforme')) {
        // Si tous les items ont un statut (pas pending) mais ne sont pas tous approuvés
        console.log('🔄 Mise à jour statut vers validation_production');
        await updateProductionOrderStatus(orderId, 'validation_production');
      }
    } else if (validationType === 'quality') {
      // Vérifier que l'OF est dans un statut compatible pour validation qualité
      const validQualityStatuses = ['production_validee', 'validation_qualite', 'en_fabrication', 'production_terminee', 'qualite_validee', 'non_conforme'];
      if (!validQualityStatuses.includes(productionOrder.status)) {
        console.log('ℹ️ OF non dans un statut compatible pour validation qualité, statut actuel:', productionOrder.status);
        return;
      }

      const allQualityApproved = items.every(item => item.quality_status === 'approved');
      const hasRejectedItems = items.some(item => item.quality_status === 'rejected');
      const hasPendingItems = items.some(item => !item.quality_status || item.quality_status === 'pending');

      console.log('🛡️ Tous les items qualité approuvés?', allQualityApproved);
      console.log('🛡️ Items rejetés?', hasRejectedItems);
      console.log('🛡️ Items en attente?', hasPendingItems);

      if (allQualityApproved && !hasPendingItems) {
        console.log('✅ Mise à jour statut vers qualite_validee');
        await updateProductionOrderStatus(orderId, 'qualite_validee');
      } else if (hasRejectedItems) {
        console.log('❌ Mise à jour statut vers non_conforme (items rejetés)');
        await updateProductionOrderStatus(orderId, 'non_conforme');
      } else if (!hasPendingItems && ['production_validee', 'en_fabrication', 'production_terminee', 'non_conforme'].includes(productionOrder.status)) {
        // Si tous les items ont un statut qualité mais ne sont pas tous approuvés
        console.log('🔄 Mise à jour statut vers validation_qualite');
        await updateProductionOrderStatus(orderId, 'validation_qualite');
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du statut global:', error);
  }
}

// Fonction pour obtenir les BC liés à un ordre de production en temps réel
export async function getLinkedOrders(productionOrderId: string): Promise<any[]> {
  try {
    console.log('🔍 Recherche BC liés pour OF:', productionOrderId);

    // Récupérer l'ordre de production avec ses BC liés et order_id pour fallback
    const { data: productionOrder, error: poError } = await supabase
      .from('production_orders')
      .select('bc_origins, order_id, order_number')
      .eq('id', productionOrderId)
      .single();

    if (poError || !productionOrder) {
      console.error('❌ Erreur récupération ordre de production:', poError);
      return [];
    }

    console.log('📋 Données OF récupérées:', {
      ...productionOrder,
      bc_origins: productionOrder.bc_origins
    });

    let orderIds: string[] = [];

    // Essayer d'abord bc_origins (nouveau format)
    if (productionOrder.bc_origins && Array.isArray(productionOrder.bc_origins) && productionOrder.bc_origins.length > 0) {
      // Vérifier le format des bc_origins
      console.log('📦 bc_origins brut:', productionOrder.bc_origins);
      orderIds = productionOrder.bc_origins.map((bc: any) => {
        // Supporter différents formats possibles
        if (typeof bc === 'string') return bc;
        if (bc.orderId) return bc.orderId;
        if (bc.orderid) return bc.orderid; // Au cas où en minuscules
        if (bc.order_id) return bc.order_id; // Format snake_case
        if (bc.id) return bc.id;
        return null;
      }).filter(Boolean);
      console.log('📦 OrderIds extraits depuis bc_origins:', orderIds);
    }

    // Fallback vers order_id (ancien format) si bc_origins est vide
    if (orderIds.length === 0 && productionOrder.order_id) {
      orderIds = [productionOrder.order_id];
      console.log('📦 OrderId depuis order_id (fallback):', orderIds);
    }

    if (orderIds.length === 0) {
      console.warn('⚠️ Aucun BC lié trouvé pour OF:', productionOrder.order_number);
      console.warn('   bc_origins:', productionOrder.bc_origins);
      console.warn('   order_id:', productionOrder.order_id);

      // Essayer une recherche alternative par le numéro d'ordre si aucun lien direct
      const { data: alternativeOrders, error: altError } = await supabase
        .from('orders')
        .select(`
          *,
          clients(name),
          order_items(
            id,
            product_id,
            quantity,
            unit_price,
            total,
            products(name, unit, image_url)
          )
        `)
        .textSearch('order_number', productionOrder.order_number?.replace(/OF-/, 'BC-') || '')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!altError && alternativeOrders && alternativeOrders.length > 0) {
        console.log('📦 Commandes trouvées par recherche alternative:', alternativeOrders.length);
        return alternativeOrders;
      }

      return [];
    }

    // Récupérer les détails des commandes liées
    console.log('🔍 Recherche des commandes avec IDs:', orderIds);
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        clients(name),
        order_items(
          id,
          product_id,
          quantity,
          unit_price,
          total,
          products(name, unit, image_url)
        )
      `)
      .in('id', orderIds)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      return [];
    }

    console.log('✅ Commandes récupérées:', orders?.length || 0, 'pour OF:', productionOrder.order_number);
    if (orders && orders.length > 0) {
      console.log('📦 Détails commandes:', orders.map(o => ({ id: o.id, order_number: o.order_number })));
    }

    return orders || [];
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des BC liés:', error);
    return [];
  }
}

// Fonction pour créer un ordre de production avec date de livraison
export async function createProductionOrderWithDeliveryDate(orderData: {
  orderIds: string[];
  laboratory: string;
  title?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  targetDate: Date;
  deliveryDate?: Date; // Nouvelle date de livraison production
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  notes?: string;
}): Promise<ProductionOrder | null> {
  try {
    console.log('🏭 Création OF avec date de livraison:', orderData);

    // Validation de base
    if (!orderData.orderIds || orderData.orderIds.length === 0) {
      throw new Error('Aucune commande sélectionnée');
    }

    if (!orderData.laboratory) {
      throw new Error('Laboratoire non spécifié');
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Aucun produit spécifié');
    }

    // Générer le numéro d'ordre de production
    const today = new Date();
    const year = today.getFullYear();
    const orderNumber = `OF-${year}-${String(Date.now()).slice(-6)}`;

    // Récupérer les numéros de commande réels
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number')
      .in('id', orderData.orderIds);

    if (ordersError) {
      console.error('Erreur récupération BC:', ordersError);
      throw ordersError;
    }

    // Créer l'ordre de production avec date de livraison
    const { data: productionOrder, error: poError } = await supabase
      .from('production_orders')
      .insert({
        order_number: orderNumber,
        title: orderData.title,
        laboratory: orderData.laboratory,
        status: 'cree',
        priority: mapPriorityToDB(orderData.priority || 'normal'),
        bc_origins: orderData.orderIds.map(orderId => {
          const order = orders?.find(o => o.id === orderId);
          return {
            orderId,
            orderNumber: order?.order_number || `BC-${orderId.slice(0, 8)}`,
            percentage: 100 / orderData.orderIds.length
          };
        }),
        scheduled_start: orderData.targetDate.toISOString(),
        scheduled_end: orderData.deliveryDate?.toISOString() || orderData.targetDate.toISOString(),
        delivery_date: orderData.deliveryDate?.toISOString(), // Nouvelle colonne
        production_notes: orderData.notes
      })
      .select()
      .single();

    if (poError) {
      console.error('Erreur création OF:', poError);
      throw poError;
    }

    // Créer les items avec validation initiale
    const productionOrderItems = orderData.items.map(item => ({
      production_order_id: productionOrder.id,
      product_id: item.productId,
      quantity_required: item.quantity,
      quantity_produced: 0,
      laboratory: orderData.laboratory,
      special_instructions: item.notes,
      production_status: 'pending',
      quality_status: 'pending'
    }));

    const { error: itemsError } = await supabase
      .from('production_order_items')
      .insert(productionOrderItems);

    if (itemsError) {
      console.error('Erreur création items OF:', itemsError);
      throw itemsError;
    }

    // Ne pas synchroniser automatiquement à la création - le BC garde son statut actuel

    // Retourner l'ordre créé
    const createdOrders = await getProductionOrders();
    return createdOrders.find(order => order.id === productionOrder.id) || null;

  } catch (error) {
    console.error('❌ Erreur création OF avec date livraison:', error);
    throw error;
  }
}

// =====================================================
// GESTION DES NON-CONFORMITÉS
// =====================================================

export interface NonConformity {
  id: string;
  productionOrderId: string;
  defectType: 'hygiene' | 'aspect' | 'texture' | 'gout' | 'temperature' | 'emballage' | 'quantite' | 'autre';
  reason: string;
  correctiveSolution: string;
  reportedBy?: string;
  reportedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export async function createNonConformity(data: {
  productionOrderId: string;
  defectType: NonConformity['defectType'];
  reason: string;
  correctiveSolution: string;
  reportedBy?: string;
}): Promise<NonConformity | null> {
  try {
    const { data: nonConformity, error } = await supabase
      .from('production_order_non_conformities')
      .insert({
        production_order_id: data.productionOrderId,
        defect_type: data.defectType,
        reason: data.reason,
        corrective_solution: data.correctiveSolution,
        reported_by: data.reportedBy,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création non-conformité:', error);
      return null;
    }

    return {
      id: nonConformity.id,
      productionOrderId: nonConformity.production_order_id,
      defectType: nonConformity.defect_type,
      reason: nonConformity.reason,
      correctiveSolution: nonConformity.corrective_solution,
      reportedBy: nonConformity.reported_by,
      reportedAt: new Date(nonConformity.reported_at),
      resolvedAt: nonConformity.resolved_at ? new Date(nonConformity.resolved_at) : undefined,
      resolvedBy: nonConformity.resolved_by,
      resolutionNotes: nonConformity.resolution_notes,
      status: nonConformity.status,
      createdAt: new Date(nonConformity.created_at),
      updatedAt: new Date(nonConformity.updated_at)
    };
  } catch (error) {
    console.error('Erreur création non-conformité:', error);
    return null;
  }
}

export async function getNonConformitiesForOrder(productionOrderId: string): Promise<NonConformity[]> {
  try {
    const { data, error } = await supabase
      .from('production_order_non_conformities')
      .select('*')
      .eq('production_order_id', productionOrderId)
      .order('reported_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération non-conformités:', error);
      return [];
    }

    return data?.map(item => ({
      id: item.id,
      productionOrderId: item.production_order_id,
      defectType: item.defect_type,
      reason: item.reason,
      correctiveSolution: item.corrective_solution,
      reportedBy: item.reported_by,
      reportedAt: new Date(item.reported_at),
      resolvedAt: item.resolved_at ? new Date(item.resolved_at) : undefined,
      resolvedBy: item.resolved_by,
      resolutionNotes: item.resolution_notes,
      status: item.status,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    })) || [];
  } catch (error) {
    console.error('Erreur récupération non-conformités:', error);
    return [];
  }
}

export async function updateProductionOrderItemQuantity(
  itemId: string,
  quantityProduced: number,
  isCompleted: boolean = false
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('production_order_items')
      .update({
        quantity_produced: quantityProduced,
        production_completed: isCompleted
      })
      .eq('id', itemId);

    if (error) {
      console.error('Erreur mise à jour quantité produite:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur mise à jour quantité produite:', error);
    return false;
  }
}

export async function markProductionOrderAsPartial(
  orderId: string,
  notes: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('production_orders')
      .update({
        is_partial_production: true,
        partial_completion_notes: notes
      })
      .eq('id', orderId);

    if (error) {
      console.error('Erreur marquage production partielle:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur marquage production partielle:', error);
    return false;
  }
}

// =====================================================
// GESTION DES PACKS
// =====================================================

export async function getPacks(): Promise<Pack[]> {
  try {
    const { data: packsData, error: packsError } = await supabase
      .from('packs')
      .select('*')
      .order('created_at', { ascending: false });

    if (packsError) {
      console.error('Erreur récupération packs:', packsError);
      return [];
    }

    if (!packsData) return [];

    // Récupérer les items pour chaque pack
    const packs: Pack[] = await Promise.all(
      packsData.map(async (pack) => {
        const { data: itemsData, error: itemsError } = await supabase
          .from('pack_items')
          .select('*')
          .eq('pack_id', pack.id);

        if (itemsError) {
          console.error('Erreur récupération items pack:', itemsError);
        }

        return {
          id: pack.id,
          name: pack.name,
          description: pack.description,
          items: itemsData?.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
            notes: item.notes
          })) || [],
          totalPrice: Number(pack.total_price),
          discount: pack.discount ? Number(pack.discount) : undefined,
          imageUrl: pack.image_url,
          isActive: pack.is_active,
          createdAt: new Date(pack.created_at),
          updatedAt: new Date(pack.updated_at),
          createdBy: pack.created_by
        };
      })
    );

    return packs;
  } catch (error) {
    console.error('Erreur récupération packs:', error);
    return [];
  }
}

export async function getPackById(packId: string): Promise<Pack | null> {
  try {
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('*')
      .eq('id', packId)
      .single();

    if (packError || !pack) {
      console.error('Erreur récupération pack:', packError);
      return null;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('pack_items')
      .select('*')
      .eq('pack_id', pack.id);

    if (itemsError) {
      console.error('Erreur récupération items pack:', itemsError);
    }

    return {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      items: itemsData?.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        notes: item.notes
      })) || [],
      totalPrice: Number(pack.total_price),
      discount: pack.discount ? Number(pack.discount) : undefined,
      imageUrl: pack.image_url,
      isActive: pack.is_active,
      createdAt: new Date(pack.created_at),
      updatedAt: new Date(pack.updated_at),
      createdBy: pack.created_by
    };
  } catch (error) {
    console.error('Erreur récupération pack:', error);
    return null;
  }
}

export async function createPack(packData: {
  name: string;
  description?: string;
  items: Array<{ productId: string; quantity: number; notes?: string }>;
  totalPrice: number;
  discount?: number;
  imageUrl?: string;
  isActive?: boolean;
  createdBy?: string;
}): Promise<Pack | null> {
  try {
    console.log('📦 Création pack:', packData);

    // Créer le pack
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .insert({
        name: packData.name,
        description: packData.description,
        total_price: packData.totalPrice,
        discount: packData.discount || 0,
        image_url: packData.imageUrl,
        is_active: packData.isActive !== undefined ? packData.isActive : true,
        created_by: packData.createdBy
      })
      .select()
      .single();

    if (packError) {
      console.error('Erreur création pack:', packError);
      throw packError;
    }

    // Créer les items du pack
    if (packData.items.length > 0) {
      const packItems = packData.items.map(item => ({
        pack_id: pack.id,
        product_id: item.productId,
        quantity: item.quantity,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('pack_items')
        .insert(packItems);

      if (itemsError) {
        console.error('Erreur création items pack:', itemsError);
        // Supprimer le pack si échec création items
        await supabase.from('packs').delete().eq('id', pack.id);
        throw itemsError;
      }
    }

    console.log('✅ Pack créé avec succès:', pack.id);
    return await getPackById(pack.id);
  } catch (error) {
    console.error('Erreur création pack:', error);
    return null;
  }
}

export async function updatePack(
  packId: string,
  packData: {
    name?: string;
    description?: string;
    items?: Array<{ productId: string; quantity: number; notes?: string }>;
    totalPrice?: number;
    discount?: number;
    imageUrl?: string;
    isActive?: boolean;
  }
): Promise<Pack | null> {
  try {
    console.log('📦 Mise à jour pack:', packId, packData);

    // Préparer les données de mise à jour du pack
    const updateData: any = {};
    if (packData.name !== undefined) updateData.name = packData.name;
    if (packData.description !== undefined) updateData.description = packData.description;
    if (packData.totalPrice !== undefined) updateData.total_price = packData.totalPrice;
    if (packData.discount !== undefined) updateData.discount = packData.discount;
    if (packData.imageUrl !== undefined) updateData.image_url = packData.imageUrl;
    if (packData.isActive !== undefined) updateData.is_active = packData.isActive;

    // Mettre à jour le pack
    const { error: packError } = await supabase
      .from('packs')
      .update(updateData)
      .eq('id', packId);

    if (packError) {
      console.error('Erreur mise à jour pack:', packError);
      throw packError;
    }

    // Mettre à jour les items si fournis
    if (packData.items !== undefined) {
      // Supprimer les anciens items
      const { error: deleteError } = await supabase
        .from('pack_items')
        .delete()
        .eq('pack_id', packId);

      if (deleteError) {
        console.error('Erreur suppression anciens items:', deleteError);
        throw deleteError;
      }

      // Créer les nouveaux items
      if (packData.items.length > 0) {
        const packItems = packData.items.map(item => ({
          pack_id: packId,
          product_id: item.productId,
          quantity: item.quantity,
          notes: item.notes
        }));

        const { error: itemsError } = await supabase
          .from('pack_items')
          .insert(packItems);

        if (itemsError) {
          console.error('Erreur création nouveaux items:', itemsError);
          throw itemsError;
        }
      }
    }

    console.log('✅ Pack mis à jour avec succès:', packId);
    return await getPackById(packId);
  } catch (error) {
    console.error('Erreur mise à jour pack:', error);
    return null;
  }
}

export async function deletePack(packId: string): Promise<boolean> {
  try {
    console.log('🗑️ Suppression pack:', packId);

    // Les items seront supprimés automatiquement grâce à ON DELETE CASCADE
    const { error } = await supabase
      .from('packs')
      .delete()
      .eq('id', packId);

    if (error) {
      console.error('Erreur suppression pack:', error);
      return false;
    }

    console.log('✅ Pack supprimé avec succès:', packId);
    return true;
  } catch (error) {
    console.error('Erreur suppression pack:', error);
    return false;
  }
}

export async function togglePackActive(packId: string, isActive: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('packs')
      .update({ is_active: isActive })
      .eq('id', packId);

    if (error) {
      console.error('Erreur activation/désactivation pack:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur activation/désactivation pack:', error);
    return false;
  }
}