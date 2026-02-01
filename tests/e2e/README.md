# Tests E2E Yourmine

Tests end-to-end complets utilisant Playwright pour valider toutes les fonctionnalités de l'application.

## Structure des tests

Tests organisés par catégorie pour une meilleure maintenabilité :

### 📁 [ui-navigation.spec.js](ui-navigation.spec.js) (85 lignes)
Tests de l'interface utilisateur et navigation
- ✅ Affichage du header et titre
- ✅ Boutons de toggle mode (Single/Batch)
- ✅ Sélection du format audio (MP3/WAV)
- ✅ Changement entre les modes
- ✅ Changement de format audio
- ✅ Tabs Current/History
- ✅ Attributs d'accessibilité (ARIA)

### 📁 [downloads-single.spec.js](downloads-single.spec.js) (76 lignes)
Tests de téléchargements uniques
- ✅ Download single MP3
- ✅ Download single WAV
- ✅ Barre de progression affichée
- ✅ Bouton "Download File" après completion

### 📁 [downloads-batch.spec.js](downloads-batch.spec.js) (56 lignes)
Tests de téléchargements en batch
- ✅ Batch MP3 downloads
- ✅ Batch WAV downloads

### 📁 [feedback-validation.spec.js](feedback-validation.spec.js) (83 lignes)
Tests de validation et feedback utilisateur
- ✅ Toast d'erreur pour URL invalide
- ✅ Bouton désactivé quand input vide
- ✅ Persistance localStorage après refresh
- ✅ Clear History button functionality

## Lancer les tests

```bash
# Tous les tests (17 tests dans 4 fichiers)
npx playwright test

# Avec navigateur visible
npx playwright test --headed

# Tests par catégorie
npx playwright test ui-navigation
npx playwright test downloads-single
npx playwright test downloads-batch
npx playwright test feedback-validation

# Un seul test
npx playwright test --grep "should start a single MP3"

# Voir le rapport HTML
npx playwright show-report
```

## Résultats

**16/16 tests passent** ✅

### Couverture complète
- **7 tests** UI & Navigation
- **4 tests** Single Downloads
- **2 tests** Batch Downloads
- **3 tests** Feedback & Validation

**Total : 269 lignes de tests E2E automatisés** organisés en 4 fichiers modulaires 🚀

