export type ProductCategory =
  | 'Labo traditionnel'
  | 'Laboratoire biscuit'
  | 'Viennoiserie'
  | 'Laboratoire cheese'
  | 'Laboratoire gâteaux français'
  | 'Laboratoire cake'
  | 'Laboratoire tarte'
  | 'Laboratoire gâteaux tunisiens'
  | 'Laboratoire salés';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** Optional sub-family grouping within a category (e.g., Entremets, Gâteaux classiques) */
  subFamily?: string;
  price: number;
  unit: 'pièce' | 'kg' | 'carton' | 'paquet' | 'litre';
  imageUrl: string;
  description: string;
  'data-ai-hint'?: string;
}

export interface Client {
  id: string;
  name: string;
  taxId: string;
  contact: string;
  phone?: string;
  phone2?: string;
  address: string;
}

export type OrderStatus = 'Saisi' | 'Validé' | 'En fabrication' | 'Terminé' | 'Annulé' | 'valide_admin' | 'en_fabrication' | 'en_attente' | 'livre' | 'pret' | 'controle_qualite' | 'annule';

export type PaymentType = 'virement' | 'espece' | 'cheque' | 'especes' | 'carte';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  description?: string;
}

export interface StatusChange {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  orderDate: Date;
  deliveryDate: Date;
  deliveryTime?: string;
  status: OrderStatus;
  statusHistory: StatusChange[];
  items: OrderItem[];
  total: number;
  discount: number;
  advance: number;
  secondAdvance: number;
  remaining: number;
  paymentType?: PaymentType;
  needsInvoice?: boolean;
  notes?: string;
  labDeliveryHours?: number; // Nouveau: temps de livraison laboratoire (défaut 2h)
  qualityDetails?: OrderQualityDetails; // Nouveau: détails qualité/quantité
}

// Nouveaux types pour la validation de production
export type ProductionStatus =
  | 'cree'                    // Créé
  | 'validation_production'   // En attente validation production
  | 'production_validee'      // Production validée
  | 'validation_qualite'      // En attente validation qualité/quantité
  | 'qualite_validee'         // Qualité validée
  | 'non_conforme'           // Non conforme
  | 'en_fabrication'         // En fabrication
  | 'termine'                // Terminé
  | 'annule';                // Annulé

export type ValidationStatus = 'en_attente' | 'valide' | 'non_conforme';
export type ValidationType = 'production' | 'qualite' | 'quantite' | 'hygiene';
export type ValidationPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface ProductionValidation {
  id: string;
  productionOrderId: string;
  validationType: ValidationType;
  status: ValidationStatus;
  validatorId?: string;
  validatedAt?: Date;
  notes?: string;

  // Pour les non-conformités
  nonConformityReason?: string;
  correctiveAction?: string;
  correctiveActionProposed?: string; // Solution corrective proposée par service hygiène
  priority?: ValidationPriority;

  createdAt: Date;
  updatedAt: Date;
}

export interface OrderQualityDetails {
  id: string;
  orderId: string;

  // Détails qualitatifs
  qualitySpecifications?: Record<string, any>;
  qualityNotes?: string;
  qualityRequirements?: string;

  // Détails quantitatifs
  quantitySpecifications?: Record<string, any>;
  quantityNotes?: string;
  weightRequirements?: string;
  dimensionsRequirements?: string;

  // Détails d'hygiène (combiné qualité + quantité)
  hygieneRequirements?: string;
  hygieneNotes?: string;
  hygieneCorrectiveActions?: string[]; // Solutions correctives proposées
  canExamineBCWithoutPrice?: boolean;  // Permission d'examiner BC sans prix

  createdAt: Date;
  updatedAt: Date;
}
