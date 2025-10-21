
'use client';

import { useState, useMemo, useEffect } from 'react';
import { ProductImage } from '@/components/product-image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Preloader, usePreloader } from '@/components/preloader';
// Catégories de produits définies localement
const productCategories = [
  'Labo traditionnel',
  'Laboratoire biscuit',
  'Viennoiserie',
  'Laboratoire cheese',
  'Laboratoire gâteaux français',
  'Laboratoire cake',
  'Laboratoire tarte',
  'Laboratoire gâteaux tunisiens',
  'Laboratoire salés'
] as const;
import { getProducts, createProduct, updateProduct, getSubCategories, type SubCategory } from '@/lib/supabase-service';
import type { Product, ProductCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRole } from '@/hooks/use-role';
import { Edit, PlusCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/image-upload';

const productSchema = z.object({
  id: z.string().optional(),
  customId: z.string().optional(), // ID personnalisé saisi manuellement
  name: z.string().min(1, 'Nom est requis'),
  category: z.custom<ProductCategory>(),
  subFamily: z.string().optional(),
  price: z.number().min(0, 'Prix doit être positif'),
  unit: z.enum(['pièce', 'kg', 'carton', 'paquet', 'litre']),
  imageUrl: z.string().optional(),
  description: z.string().min(1, 'Description est requise'),
});

type ProductFormValues = z.infer<typeof productSchema>;

// Fonction pour générer un ID automatique basé sur la catégorie
const generateProductId = async (category: ProductCategory, existingProducts: Product[]): Promise<string> => {
  const categoryAbbr: Record<ProductCategory, string> = {
    'Labo traditionnel': 'LT',
    'Laboratoire biscuit': 'LB',
    'Viennoiserie': 'VI',
    'Laboratoire cheese': 'LC',
    'Laboratoire gâteaux français': 'GF',
    'Laboratoire cake': 'CA',
    'Laboratoire tarte': 'TA',
    'Laboratoire gâteaux tunisiens': 'GT',
    'Laboratoire salés': 'LS'
  };

  const abbr = categoryAbbr[category] || 'XX';

  // Compter le nombre de produits dans cette catégorie
  const productsInCategory = existingProducts.filter(p => p.category === category);
  const nextSequence = productsInCategory.length + 1;

  // Formater avec des zéros devant (ex: 0001, 0002, etc.)
  const sequenceStr = String(nextSequence).padStart(4, '0');

  return `${abbr}${sequenceStr}`;
};

const ProductForm = ({ product, onSave, onCancel, allProducts }: { product?: Product | null; onSave: (data: Product) => Promise<void>; onCancel: () => void; allProducts: Product[] }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [generatedId, setGeneratedId] = useState<string>('');
  const { role } = useRole();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      name: '',
      category: 'Labo traditionnel',
      customId: '',
      price: 0,
      unit: 'pièce',
      imageUrl: '',
      description: '',
    },
  });

  const { toast } = useToast();

  // Fonction pour regénérer l'ID quand la catégorie change
  const handleCategoryChange = async (newCategory: ProductCategory) => {
    form.setValue('category', newCategory);
    if (!product) { // Seulement pour les nouveaux produits
      const newId = await generateProductId(newCategory, allProducts);
      form.setValue('customId', newId);
      setGeneratedId(newId);
    }
  };

  // Fonction pour regénérer un nouvel ID
  const regenerateId = async () => {
    const currentCategory = form.getValues('category');
    const newId = await generateProductId(currentCategory, allProducts);
    form.setValue('customId', newId);
    setGeneratedId(newId);
  };

  useEffect(() => {
    const loadSubCategories = async () => {
      const subs = await getSubCategories();
      setSubCategories(subs);
    };
    loadSubCategories();
  }, []);

  useEffect(() => {
    const initializeForm = async () => {
      if (product) {
        form.reset(product);
      } else {
        const newId = await generateProductId('Labo traditionnel', allProducts);
        setGeneratedId(newId);
        form.reset({
          name: '',
          category: 'Labo traditionnel',
          customId: newId,
          subFamily: '',
          price: 0,
          unit: 'pièce',
          imageUrl: '',
          description: '',
        });
      }
    };
    initializeForm();
  }, [product, form, allProducts]);

  const handleSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      // S'assurer que l'ID est défini correctement
      const finalId = product?.id || data.customId || await generateProductId(data.category, allProducts);

      const productData = {
        ...data,
        id: finalId,
        customId: undefined, // Supprimer customId du produit final
        'data-ai-hint': data.name.toLowerCase().split(' ').slice(0, 2).join(' ')
      } as Product;

      console.log('🔍 Données produit à sauvegarder:', productData);
      await onSave(productData);

      const isNew = !product;
      toast({
        title: `Produit ${isNew ? 'créé' : 'mis à jour'}`,
        description: `Le produit "${data.name}" a été sauvegardé.`,
      });
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le produit. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{product ? 'Modifier le produit' : 'Ajouter un nouveau produit'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du produit</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Pizza" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Champ ID personnalisé */}
            <FormField
              control={form.control}
              name="customId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Produit</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="ex: GT0001"
                        {...field}
                        disabled={!!product}
                        className={product ? "bg-muted cursor-not-allowed" : ""}
                      />
                    </FormControl>
                    {!product && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={regenerateId}
                        className="shrink-0"
                      >
                        Générer
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {product
                      ? "L'ID ne peut pas être modifié pour les produits existants"
                      : "ID automatique basé sur l'abréviation de catégorie + numéro séquentiel"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Famille</FormLabel>
                   <Select onValueChange={handleCategoryChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une famille" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {productCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subFamily"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sous-famille (optionnel)</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === 'none' ? '' : v)} value={field.value ?? 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une sous-famille" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucune sous-famille</SelectItem>
                      {subCategories.map(subCat => (
                        <SelectItem key={subCat.id} value={subCat.name}>{subCat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix (TND)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unité</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Unité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pièce">Pièce</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="carton">Carton</SelectItem>
                          <SelectItem value="paquet">Paquet</SelectItem>
                          <SelectItem value="litre">Litre</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description du produit" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image du produit</FormLabel>
                  <FormControl>
                    <ImageUpload
                      productId={product?.id || form.watch('customId') || generatedId}
                      currentImageUrl={field.value}
                      onImageUploaded={(url) => field.onChange(url)}
                      onImageRemoved={() => field.onChange('')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};


export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { progress, completeLoading } = usePreloader(loading);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [selectedSubFamily, setSelectedSubFamily] = useState<string | 'all'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const { role } = useRole();

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      completeLoading(); // Compléter la progression à 100%
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      // Petit délai pour une transition fluide
      setTimeout(() => setLoading(false), 200);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProduct = async (productData: Product) => {
    try {
      const isNew = !productToEdit;

      if (isNew) {
        await createProduct(productData);
      } else {
        await updateProduct(productData.id, productData);
      }

      // Reload products to reflect changes
      await loadProducts();

      setProductModalOpen(false);
      setProductToEdit(null);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      throw error; // Re-throw to let the form handle the error
    }
  };

  const handleOpenEditModal = (product: Product) => {
      setSelectedProduct(null); // Close details modal first
      setProductToEdit(product);
      setProductModalOpen(true);
  }

  const subFamilies = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if ((selectedCategory === 'all' || p.category === selectedCategory) && p.subFamily) set.add(p.subFamily);
    });
    return Array.from(set).sort();
  }, [products, selectedCategory]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSub = selectedSubFamily === 'all' || product.subFamily === selectedSubFamily;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSub && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory, selectedSubFamily]);

  return (
    <>
      <Preloader
        isLoading={loading}
        progress={progress}
        message="Chargement des produits..."
      />
      {!loading && (
    <div className="space-y-8">
      {/* En-tête amélioré avec gradient */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Notre Collection</h2>
                <p className="text-lg text-muted-foreground mt-1">
                  {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} de qualité artisanale
                </p>
              </div>
            </div>
          </div>
          {role === 'Admin' && (
            <Button onClick={() => { setProductToEdit(null); setProductModalOpen(true); }} size="lg" className="shadow-xl hover:shadow-2xl transition-all">
              <PlusCircle className="mr-2 h-5 w-5" /> Nouveau Produit
            </Button>
          )}
        </div>
      </div>

      {/* Filtres améliorés avec design moderne */}
      <Card className="shadow-lg border-2 border-primary/10 hover:border-primary/20 transition-colors">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Input
                placeholder="Rechercher par nom, catégorie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-10 border-2 focus:border-primary transition-colors"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={(value: ProductCategory | 'all') => setSelectedCategory(value)}
            >
              <SelectTrigger className="w-full md:w-[260px] h-12 border-2 focus:border-primary">
                <SelectValue placeholder="Toutes les familles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les familles</SelectItem>
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedSubFamily}
              onValueChange={(value: string | 'all') => setSelectedSubFamily(value)}
            >
              <SelectTrigger className="w-full md:w-[260px] h-12 border-2 focus:border-primary">
                <SelectValue placeholder="Toutes les sous-familles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sous-familles</SelectItem>
                {subFamilies.map((sf) => (
                  <SelectItem key={sf} value={sf}>
                    {sf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grille de produits améliorée avec animations */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product, index) => (
          <div
            key={product.id}
            onClick={() => setSelectedProduct(product)}
            className="cursor-pointer group"
            style={{
              animation: 'fadeInUp 0.6s ease-out forwards',
              animationDelay: `${index * 80}ms`,
              opacity: 0
            }}
          >
            <Card className="overflow-hidden flex flex-col h-full hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-out transform hover:scale-[1.02] border-2 hover:border-primary/50 bg-white relative">
              <CardHeader className="p-0 relative overflow-hidden">
                {/* Badge ID avec design amélioré */}
                <div className="absolute top-3 left-3 z-10 flex gap-2">
                  <Badge className="shadow-lg backdrop-blur-sm bg-gradient-to-r from-primary to-primary/80 text-white font-bold px-2.5 py-1 text-xs border border-white/30">
                    {product.id}
                  </Badge>
                </div>
                {/* Badge unité avec icône */}
                <Badge variant="secondary" className="absolute top-3 right-3 z-10 shadow-lg backdrop-blur-sm bg-white/95 font-semibold px-2.5 py-1 text-xs border border-gray-200">
                  <svg className="w-3 h-3 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {product.unit === 'kg' ? 'Kg' : product.unit === 'pièce' ? 'Unité' : product.unit}
                </Badge>
                {/* Image avec overlay gradient */}
                <div className="relative overflow-hidden h-56 bg-gradient-to-br from-primary/5 via-gray-50 to-gray-100">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {role === 'Admin' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl hover:scale-105 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(product);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" /> Modifier
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-grow bg-gradient-to-b from-white to-gray-50/30">
                <CardTitle className="text-lg font-bold mb-2 group-hover:text-primary transition-colors duration-200 line-clamp-2 min-h-[3rem] leading-tight">{product.name}</CardTitle>
                <CardDescription className="text-sm line-clamp-2 mb-3 min-h-[2.5rem] text-gray-600 leading-snug">{product.description}</CardDescription>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary hover:bg-primary/10 transition-colors px-2 py-0.5">
                    {product.category.replace('Laboratoire', 'Lab.')}
                  </Badge>
                  {product.subFamily && (
                    <Badge variant="secondary" className="text-xs bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 px-2 py-0.5">
                      {product.subFamily}
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-5 pt-3 flex justify-between items-center border-t border-gray-100 bg-gradient-to-r from-gray-50/30 to-white">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium mb-0.5">Prix</span>
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent group-hover:scale-105 transition-transform origin-left">
                    {product.price.toFixed(2)}
                    <span className="text-sm font-semibold ml-1 text-gray-600">TND</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-primary font-semibold opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all hover:bg-primary/10 text-xs">
                  Voir
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-10 animate-fade-in">
            <div className="text-6xl mb-4 opacity-50">🔍</div>
            <p className="text-lg">Aucun produit ne correspond à votre recherche.</p>
          </div>
        )}
      </div>
      
      {/* Details Modal - Design modernisé */}
      <Dialog open={!!selectedProduct} onOpenChange={(isOpen) => !isOpen && setSelectedProduct(null)}>
        {selectedProduct && (
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-2">
            <div className="relative">
              {/* Image en grand avec overlay */}
              <div className="relative h-72 overflow-hidden bg-gradient-to-br from-primary/10 to-gray-100">
                <ProductImage
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {/* Badge ID flottant */}
                <Badge className="absolute top-4 left-4 bg-gradient-to-r from-primary to-primary/80 text-white font-bold px-4 py-2 text-base shadow-xl border-2 border-white/20">
                  {selectedProduct.id}
                </Badge>
              </div>

              {/* Contenu */}
              <div className="p-8 bg-white">
                <DialogHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <DialogTitle className="text-3xl font-bold text-gray-900 leading-tight flex-1">
                      {selectedProduct.name}
                    </DialogTitle>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground font-medium mb-1">Prix</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        {selectedProduct.price.toFixed(2)}
                        <span className="text-lg font-semibold text-gray-600 ml-1">TND</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">par {selectedProduct.unit}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-primary/30 text-primary font-medium px-3 py-1">
                      {selectedProduct.category}
                    </Badge>
                    {selectedProduct.subFamily && (
                      <Badge variant="secondary" className="bg-gray-100 px-3 py-1">
                        {selectedProduct.subFamily}
                      </Badge>
                    )}
                  </div>
                </DialogHeader>

                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Description
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>

                <DialogFooter className="mt-8 flex gap-3">
                  {role === 'Admin' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenEditModal(selectedProduct)}
                      className="border-2"
                    >
                      <Edit className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="shadow-lg"
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Add/Edit Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
            <ProductForm
                product={productToEdit}
                onSave={handleSaveProduct}
                onCancel={() => { setProductModalOpen(false); setProductToEdit(null); }}
                allProducts={products}
            />
        </DialogContent>
      </Dialog>
    </div>
      )}
    </>
  );
}
