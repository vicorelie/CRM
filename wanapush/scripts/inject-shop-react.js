#!/usr/bin/env node
// Injecte les composants shop React dans les sites existants :
// 1. Crée src/shop-config.ts, src/contexts/CartContext.tsx, etc.
// 2. Patche src/App.tsx pour wrapper avec CartProvider + ajouter CartButton/Drawer/Hydrator
//
// Usage : node scripts/inject-shop-react.js <slug1> [slug2 ...]

const fs = require("fs");
const path = require("path");

// On require directement les fonctions du module compilé via tsx via ts-node serait l'idéal,
// mais on évite la complexité : on lit les fonctions du fichier source TS et on les évalue.
// Plus simple : on appelle un sous-process qui imprime les fichiers.
const { execSync } = require("child_process");

const EXTRACTION_ROOT = "/var/www/wanapush/website-extraction";
const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error("Usage: inject-shop-react.js <slug1> [slug2...]");
  process.exit(1);
}

// Genère un petit script TS qui imprime les fichiers du composant
const TMP_GEN = "/tmp/shop-files-gen.mjs";
const genCode = `
import { shopConfigFile, cartContextFile, useShopProductsFile, productCardFile, shopGridFile, shopFeaturedFile, shopCategoriesFile, shopBrowseFile, cartButtonFile, cartDrawerFile, shopHydratorFile, customerContextFile, accountButtonFile, accountModalFile, productPageFile, categoryPageFile } from "/var/www/wanapush/lib/shop-react-components.ts";
const slug = process.argv[2];
const out = {
  "src/shop-config.ts": shopConfigFile(slug),
  "src/contexts/CartContext.tsx": cartContextFile(),
  "src/contexts/CustomerContext.tsx": customerContextFile(),
  "src/hooks/useShopProducts.ts": useShopProductsFile(),
  "src/components/shop/ProductCard.tsx": productCardFile(),
  "src/components/shop/ShopGrid.tsx": shopGridFile(),
  "src/components/shop/ShopFeatured.tsx": shopFeaturedFile(),
  "src/components/shop/ShopCategories.tsx": shopCategoriesFile(),
  "src/components/shop/ShopBrowse.tsx": shopBrowseFile(),
  "src/components/shop/CartButton.tsx": cartButtonFile(),
  "src/components/shop/CartDrawer.tsx": cartDrawerFile(),
  "src/components/shop/AccountButton.tsx": accountButtonFile(),
  "src/components/shop/AccountModal.tsx": accountModalFile(),
  "src/components/shop/ShopHydrator.tsx": shopHydratorFile(),
  "src/pages/ProductPage.tsx": productPageFile(),
  "src/pages/CategoryPage.tsx": categoryPageFile(),
};
process.stdout.write(JSON.stringify(out));
`;
fs.writeFileSync(TMP_GEN, genCode);

function generateFiles(slug) {
  // Utilise tsx ou ts-node (déjà installé chez Next 14)
  const cmd = `cd /var/www/wanapush && npx --silent tsx ${TMP_GEN} ${slug}`;
  const stdout = execSync(cmd, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout);
}

function patchAppTsx(siteDir) {
  const appPath = path.join(siteDir, "src/App.tsx");
  if (!fs.existsSync(appPath)) return false;
  let src = fs.readFileSync(appPath, "utf8");

  // Ajoute les routes shop produit/categorie si manquantes (idempotent)
  function ensureShopRoutes(s) {
    let r = s;
    if (!r.includes('import ProductPage')) {
      r = r.replace(
        'import ShopHydrator from "./components/shop/ShopHydrator";',
        `import ShopHydrator from "./components/shop/ShopHydrator";
import ProductPage from "./pages/ProductPage";
import CategoryPage from "./pages/CategoryPage";`,
      );
    }
    if (!r.includes('path="/produit/:slug"')) {
      r = r.replace(
        /(<\/Routes>)/,
        `  <Route path="/produit/:slug" element={<ProductPage />} />\n            <Route path="/categorie/:slug" element={<CategoryPage />} />\n          $1`,
      );
    }
    return r;
  }

  // Si déjà patché avec CustomerProvider → on ajoute juste les routes shop si absentes
  if (src.includes("CustomerProvider")) {
    const patched = ensureShopRoutes(src);
    if (patched !== src) {
      fs.writeFileSync(appPath, patched);
      return "routes-added";
    }
    return "already";
  }

  // Étape 1 : si CartProvider existe déjà mais pas CustomerProvider → upgrade
  if (src.includes("CartProvider")) {
    // Ajoute les nouveaux imports
    src = src.replace(
      'import { CartProvider } from "./contexts/CartContext";',
      `import { CartProvider } from "./contexts/CartContext";
import { CustomerProvider } from "./contexts/CustomerContext";`,
    );
    src = src.replace(
      'import CartDrawer from "./components/shop/CartDrawer";',
      `import CartDrawer from "./components/shop/CartDrawer";
import AccountButton from "./components/shop/AccountButton";
import AccountModal from "./components/shop/AccountModal";`,
    );
    // Wrap CartProvider dans CustomerProvider
    src = src.replace(
      /<CartProvider>([\s\S]*?)<\/CartProvider>/,
      (_m, inner) => `<CustomerProvider>
      <CartProvider>${inner.replace(
        /<ShopHydrator \/>/,
        `<AccountButton />
        <AccountModal />
        <ShopHydrator />`,
      )}</CartProvider>
    </CustomerProvider>`,
    );
    src = ensureShopRoutes(src);
    fs.writeFileSync(appPath, src);
    return true;
  }

  // Étape 2 : pas de shop encore → wrap complet
  src = src.replace(
    'import Footer from "./components/Footer";',
    `import Footer from "./components/Footer";
import { CartProvider } from "./contexts/CartContext";
import { CustomerProvider } from "./contexts/CustomerContext";
import CartButton from "./components/shop/CartButton";
import CartDrawer from "./components/shop/CartDrawer";
import AccountButton from "./components/shop/AccountButton";
import AccountModal from "./components/shop/AccountModal";
import ShopHydrator from "./components/shop/ShopHydrator";`,
  );

  src = src.replace(
    /return\s*\(\s*<>\s*<Nav \/>([\s\S]*?)<\/>\s*\)\s*;/,
    (_match, inner) => `return (
    <CustomerProvider>
      <CartProvider>
        <Nav />${inner}
        <CartButton />
        <CartDrawer />
        <AccountButton />
        <AccountModal />
        <ShopHydrator />
      </CartProvider>
    </CustomerProvider>
  );`,
  );

  src = ensureShopRoutes(src);
  fs.writeFileSync(appPath, src);
  return true;
}

for (const slug of slugs) {
  const siteDir = path.join(EXTRACTION_ROOT, slug);
  if (!fs.existsSync(siteDir)) {
    console.log("SKIP", slug, "(dir absent)");
    continue;
  }
  try {
    const files = generateFiles(slug);
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(siteDir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
    const patched = patchAppTsx(siteDir);
    console.log(`OK  ${slug}  (${Object.keys(files).length} fichiers, App.tsx ${patched === "already" ? "déjà OK" : "patché"})`);
  } catch (e) {
    console.error("ERR", slug, e.message);
  }
}
