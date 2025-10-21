import ProductCatalog from './product-catalog';

export default function ProductsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-gradient-to-br from-gray-50 via-white to-gray-50/30">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Catalogue des Produits
          </h1>
          <p className="text-muted-foreground text-base">
            Découvrez notre sélection de produits artisanaux
          </p>
        </div>
      </div>
      <ProductCatalog />
    </div>
  );
}
