# Système d'Authentification - Guide Complet

Date: 2025-10-21

## Vue d'ensemble

Un système d'authentification hardcodé complet a été implémenté avec:
- ✅ Page de connexion sécurisée
- ✅ 6 comptes utilisateurs prédéfinis
- ✅ Gestion des rôles automatique
- ✅ Bouton de déconnexion
- ✅ Protection des routes
- ✅ Informations utilisateur dans la sidebar

---

## Comptes Utilisateurs

### 1. Administrateur
```
Email: admin@essoukrigroupe.com
Mot de passe: admin
Rôle: Admin
Accès: Toutes les fonctionnalités
Privilège: Peut changer de rôle pour tester l'application
```

### 2. Commercial Space
```
Email: commercialspace@essoukrigroupe.com
Mot de passe: commercialspace
Rôle: Sales
Type: Space
En-tête BC: "Space"
```

### 3. Commercial Salon de Thé
```
Email: commercialsdt@essoukrigroupe.com
Mot de passe: commercialsdt
Rôle: Sales
Type: Salon de Thé
En-tête BC: "Salon de Thé"
```

### 4. Commercial Administration
```
Email: commercialadmin@essoukrigroupe.com
Mot de passe: commercialadmin
Rôle: Sales
Type: Administration
En-tête BC: "Administration"
```

### 5. Service Production
```
Email: production@essoukrigroupe.com
Mot de passe: production
Rôle: Production
Accès: Ordres de fabrication, validation production
```

### 6. Service Qualité
```
Email: quality@essoukrigroupe.com
Mot de passe: quality
Rôle: Quality
Accès: Ordres de fabrication, validation qualité
```

---

## Fonctionnalités Implémentées

### 1. Page de Connexion (`/login`)

**Fichier**: `src/app/login/page.tsx`

**Caractéristiques**:
- Design moderne avec logo Essoukri
- Formulaire avec email et mot de passe
- Validation en temps réel
- Messages d'erreur clairs
- Liste des comptes de test affichée
- Responsive mobile-friendly

**Champs**:
- Email (requis, type email)
- Mot de passe (requis, masqué)
- Bouton "Se connecter"

### 2. Système d'Authentification

**Fichier**: `src/lib/auth.ts`

**Fonctions exportées**:

```typescript
// Connexion
login(email: string, password: string): User | null

// Déconnexion
logout(): void

// Utilisateur actuel
getCurrentUser(): Omit<User, 'password'> | null

// Vérifier authentification
isAuthenticated(): boolean

// En-tête commercial pour BC
getCommercialHeader(user): string
```

**Stockage**:
- LocalStorage pour persistance
- Pas de mot de passe stocké (sécurité)
- Données utilisateur JSON

### 3. Hook d'Authentification

**Fichier**: `src/hooks/use-auth.tsx`

**Provider**: `AuthProvider`

**Hook**: `useAuth()`

**Retourne**:
```typescript
{
  user: User | null,
  logout: () => void,
  isLoading: boolean
}
```

**Fonctionnalités**:
- Protection automatique des routes
- Redirection vers /login si non connecté
- Redirection vers / après connexion réussie
- Gestion du loading state

### 4. Intégration avec use-role

**Fichier**: `src/hooks/use-role.tsx`

**Changements**:
- Synchronisation automatique avec le rôle de l'utilisateur connecté
- Lecture du rôle depuis getCurrentUser()
- Persistance en localStorage pour compatibilité

### 5. App Shell Mis à Jour

**Fichier**: `src/components/app-shell.tsx`

**Nouveautés**:
- Affichage du nom et email de l'utilisateur connecté
- Avatar avec initiale du nom
- Bouton "Déconnexion" dans la sidebar
- Sélecteur de rôle uniquement pour Admin
- Les autres utilisateurs voient leur rôle fixe

**Footer Sidebar**:
```
┌─────────────────────┐
│ Changeur de Rôle    │ (Admin uniquement)
│ [Dropdown Rôles]    │
├─────────────────────┤
│ Badge: Rôle Actuel  │ (Tous)
├─────────────────────┤
│ 👤 Nom Utilisateur  │
│ 📧 Email            │
│ [Bouton Déconnexion]│
└─────────────────────┘
```

### 6. Layout Content

**Fichier**: `src/components/layout-content.tsx`

**Fonction**:
- Affiche AppShell pour toutes les pages SAUF /login
- Permet à la page de login d'avoir son propre design
- Simplifie la logique du layout principal

### 7. Layout Principal

**Fichier**: `src/app/layout.tsx`

**Providers hiérarchie**:
```jsx
<RoleProvider>
  <AuthProvider>
    <NotificationProvider>
      <LayoutContent>
        {children}
      </LayoutContent>
    </NotificationProvider>
  </AuthProvider>
</RoleProvider>
```

**Ordre important**:
1. RoleProvider (contexte de base)
2. AuthProvider (authentification)
3. NotificationProvider (notifications)
4. LayoutContent (affichage conditionnel)

---

## Flow d'Authentification

### Premier chargement (non connecté)

1. User ouvre l'application
2. AuthProvider vérifie localStorage
3. Pas d'utilisateur trouvé
4. Redirection automatique vers `/login`
5. Page de connexion s'affiche

### Connexion

1. User entre email et mot de passe
2. Clic sur "Se connecter"
3. Fonction `login()` appelée
4. Vérification dans la liste USERS
5. Si correct:
   - Stockage dans localStorage
   - Toast "Connexion réussie"
   - Redirection vers `/`
6. Si incorrect:
   - Toast d'erreur
   - Reste sur `/login`

### Navigation (connecté)

1. User navigue dans l'application
2. AuthProvider lit localStorage à chaque changement de route
3. Si utilisateur trouvé: Navigation autorisée
4. Si pas d'utilisateur: Redirection vers `/login`
5. Le rôle est automatiquement appliqué

### Déconnexion

1. User clique sur "Déconnexion"
2. Fonction `logout()` appelée
3. localStorage effacé
4. Redirection vers `/login`
5. App Shell disparaît (géré par LayoutContent)

---

## Sécurité

### Points Forts

✅ **Mots de passe non stockés**: Seules les données utilisateur sans mot de passe sont stockées
✅ **Protection des routes**: Redirection automatique si non authentifié
✅ **Rôles fixés**: Les utilisateurs non-admin ne peuvent pas changer de rôle
✅ **Validation stricte**: Vérification email + mot de passe exact

### Limitations (hardcodé)

⚠️ **Pas de hachage**: Mots de passe en clair dans le code (acceptable pour démo/interne)
⚠️ **Pas de BD**: Utilisateurs hardcodés (rapide mais non scalable)
⚠️ **Pas de sessions**: localStorage uniquement (pas de token/JWT)
⚠️ **Pas de refresh**: Pas de renouvellement automatique de session

### Recommandations Production

Pour une utilisation en production réelle, considérer:
- Migration vers Supabase Auth
- Hachage bcrypt des mots de passe
- Tokens JWT avec expiration
- Base de données pour utilisateurs
- 2FA (authentification à deux facteurs)
- Logs d'authentification
- Rate limiting sur login

---

## Utilisation Pour Les Commerciaux

### En-tête des Bons de Commande

Chaque commercial a un type qui détermine l'en-tête du BC:

```typescript
const user = getCurrentUser();
const header = getCommercialHeader(user);

// commercialspace → "Space"
// commercialsdt → "Salon de Thé"
// commercialadmin → "Administration"
```

**À implémenter** (prochaine étape):
Dans la création/affichage des BC, ajouter:

```tsx
{getCurrentUser()?.role === 'Sales' && (
  <div className="text-center font-bold mb-4">
    {getCommercialHeader(getCurrentUser())}
  </div>
)}
```

---

## Tests

### Test de Connexion

1. Ouvrir http://localhost:3000
2. Redirection automatique vers /login
3. Tester chaque compte:
   - admin@essoukrigroupe.com / admin
   - commercialspace@essoukrigroupe.com / commercialspace
   - etc.
4. Vérifier redirection vers /
5. Vérifier nom et email dans sidebar
6. Vérifier rôle appliqué

### Test Admin

1. Se connecter en tant qu'Admin
2. Vérifier dropdown de changement de rôle visible
3. Changer de rôle vers "Sales"
4. Vérifier menu Navigation mis à jour
5. Revenir en Admin

### Test Non-Admin

1. Se connecter en tant que Commercial
2. Vérifier PAS de dropdown de rôle
3. Vérifier badge de rôle "Sales" affiché
4. Vérifier nom "Commercial Space" dans footer

### Test Déconnexion

1. Cliquer sur bouton "Déconnexion"
2. Vérifier redirection vers /login
3. Vérifier localStorage vide
4. Tenter d'accéder à / → redirection vers /login

### Test Protection Routes

1. Déconnecté, tenter d'accéder:
   - /orders → redirige vers /login
   - /production → redirige vers /login
   - /products → redirige vers /login
2. Connecté, accès autorisé selon rôle

---

## Fichiers Créés/Modifiés

### Nouveaux Fichiers

1. `src/lib/auth.ts` - Système d'authentification
2. `src/hooks/use-auth.tsx` - Hook et provider
3. `src/app/login/page.tsx` - Page de connexion
4. `src/components/layout-content.tsx` - Layout conditionnel

### Fichiers Modifiés

1. `src/hooks/use-role.tsx` - Intégration auth
2. `src/components/app-shell.tsx` - Infos utilisateur + déconnexion
3. `src/app/layout.tsx` - Ajout AuthProvider

---

## Prochaines Étapes

### 1. En-tête Commercial dans BC (TODO)

Ajouter l'en-tête commercial dans:
- Page création de commande
- Page affichage de commande
- PDF/Impression de commande

### 2. Optimisation Mobile (TODO)

- Responsive design pour tous les écrans
- Menu mobile optimisé
- Formulaires adaptés
- Tables scrollables horizontalement

### 3. Améliorations Futures

- Mot de passe oublié (si migration BD)
- Changement de mot de passe
- Profil utilisateur éditable
- Historique de connexions
- Gestion multi-sessions

---

## Build

```bash
npm run build
```

**Résultat**: ✅ Build réussi (51s)

**Nouvelle route**: `/login` ajoutée (3.7 kB)

---

Fin du guide.
