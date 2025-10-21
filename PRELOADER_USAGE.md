# Guide d'utilisation du Preloader

Le preloader a été intégré avec succès dans l'application. Il affiche le logo ESSOUKRI animé avec une barre de progression pendant le chargement des données.

## Composants créés

### 1. `Preloader` (`src/components/preloader.tsx`)
Composant principal du preloader avec:
- Logo animé avec effets de pulsation et rotation
- Barre de progression
- Message de chargement personnalisable
- Animations fluides

### 2. `PageLoader` (`src/components/page-loader.tsx`)
Wrapper pour faciliter l'intégration dans les pages

### 3. Animations CSS (`src/app/globals.css`)
Animations personnalisées:
- `animate-shimmer`: Effet de brillance
- `animate-pulse-slow`: Pulsation lente du logo

## Utilisation

### Méthode 1: Avec le composant Preloader directement

```tsx
'use client'

import { useState, useEffect } from 'react';
import { Preloader, usePreloader } from '@/components/preloader';

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const { progress, completeLoading } = usePreloader(loading);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchData();
        completeLoading(); // Met la progression à 100%
      } finally {
        setTimeout(() => setLoading(false), 200); // Transition fluide
      }
    };
    loadData();
  }, [completeLoading]);

  return (
    <>
      <Preloader
        isLoading={loading}
        progress={progress}
        message="Chargement des données..."
      />
      {!loading && (
        <div>Votre contenu ici</div>
      )}
    </>
  );
}
```

### Méthode 2: Avec PageLoader (recommandé)

```tsx
'use client'

import { useState, useEffect } from 'react';
import { PageLoader } from '@/components/page-loader';

export default function MyPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData().then(data => {
      setData(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <PageLoader isLoading={isLoading} loadingMessage="Chargement...">
      <div>{data && <YourContent data={data} />}</div>
    </PageLoader>
  );
}
```

### Méthode 3: Avec le hook usePageLoader

```tsx
'use client'

import { useEffect } from 'react';
import { usePageLoader } from '@/components/page-loader';

export default function MyPage() {
  const { isLoading, setLoading, setLoadingMessage, PageWrapper } = usePageLoader();

  useEffect(() => {
    setLoadingMessage("Chargement des produits...");
    loadProducts().finally(() => setLoading(false));
  }, [setLoading, setLoadingMessage]);

  return (
    <PageWrapper loadingMessage="Chargement...">
      <YourContent />
    </PageWrapper>
  );
}
```

## Exemple d'intégration réussie

La page des commandes (`src/app/orders/order-list.tsx`) a été mise à jour pour utiliser le preloader.

### Avant:
```tsx
if (loading) {
  return <div>Chargement...</div>;
}
return <div>Contenu</div>;
```

### Après:
```tsx
const { progress, completeLoading } = usePreloader(loading);

useEffect(() => {
  const loadData = async () => {
    try {
      const data = await fetchData();
      completeLoading();
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };
  loadData();
}, [completeLoading]);

return (
  <>
    <Preloader isLoading={loading} progress={progress} message="Chargement..." />
    {!loading && <div>Contenu</div>}
  </>
);
```

## Props du Preloader

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isLoading` | `boolean` | `true` | Afficher/masquer le preloader |
| `progress` | `number` | `0` | Progression de 0 à 100 |
| `message` | `string` | `"Chargement..."` | Message affiché |
| `className` | `string` | `undefined` | Classes CSS additionnelles |

## Fonctionnalités

✅ Logo animé avec rotation et pulsation
✅ Barre de progression avec pourcentage
✅ Message de chargement personnalisable
✅ Progression automatique jusqu'à 90%
✅ Transition fluide à la fin du chargement
✅ Design responsive
✅ Intégration facile dans toutes les pages

## Pour intégrer dans d'autres pages

1. Importer le preloader et le hook
2. Ajouter le hook `usePreloader(loading)` dans votre composant
3. Appeler `completeLoading()` quand les données sont chargées
4. Envelopper votre contenu avec le preloader

Le preloader s'affichera automatiquement en plein écran pendant le chargement des données !
