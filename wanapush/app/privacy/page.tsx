export const metadata = {
  title: "Politique de confidentialité — WanaPush",
  description: "Comment WanaPush collecte et utilise vos données personnelles.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16 prose prose-invert">
        <h1>Politique de confidentialité</h1>
        <p className="text-slate-400 text-sm">
          Dernière mise à jour : 26 mai 2026
        </p>

        <h2>1. Responsable du traitement</h2>
        <p>
          WanaPush, accessible à <a href="https://wanapush.com">https://wanapush.com</a>,
          est responsable du traitement de vos données personnelles. Contact :{" "}
          <a href="mailto:contact@wanapush.com">contact@wanapush.com</a>.
        </p>

        <h2>2. Données collectées</h2>
        <h3>2.1 Données de compte</h3>
        <ul>
          <li>Adresse email et mot de passe (hashé via bcrypt)</li>
          <li>Nom et prénom (si fournis)</li>
          <li>Informations de paiement (gérées par Stripe, jamais stockées chez nous)</li>
        </ul>

        <h3>2.2 Données des comptes connectés</h3>
        <p>
          Lorsque vous connectez Facebook, Instagram, LinkedIn, YouTube, TikTok,
          Google Ads, ou autre service tiers via OAuth, nous stockons :
        </p>
        <ul>
          <li>Tokens d&apos;accès et de rafraîchissement (chiffrés au repos)</li>
          <li>Identifiants publics (ID de compte, nom d&apos;utilisateur, avatar)</li>
          <li>Liste des Pages, Ad Accounts ou chaînes auxquels vous nous donnez accès</li>
        </ul>
        <p>
          Nous ne stockons jamais vos mots de passe pour ces services tiers.
        </p>

        <h3>2.3 Données d&apos;utilisation</h3>
        <ul>
          <li>Posts, vidéos et campagnes publicitaires créés via WanaPush</li>
          <li>Statistiques de performance récupérées via les API des plateformes connectées</li>
          <li>Logs techniques (adresse IP, navigateur, dates de connexion)</li>
        </ul>

        <h2>3. Finalités du traitement</h2>
        <ul>
          <li>Fournir et améliorer le service WanaPush</li>
          <li>Publier votre contenu sur les plateformes connectées en votre nom</li>
          <li>Récupérer et afficher vos statistiques de performance</li>
          <li>Vous envoyer des notifications opérationnelles (factures, alertes)</li>
          <li>Détecter et prévenir les abus</li>
        </ul>

        <h2>4. Partage des données</h2>
        <p>
          Nous ne vendons pas vos données. Nous partageons uniquement avec :
        </p>
        <ul>
          <li>
            <strong>Plateformes connectées</strong> (Meta, Google, LinkedIn,
            TikTok, etc.) : pour publier votre contenu et récupérer vos stats
          </li>
          <li>
            <strong>Fournisseurs d&apos;infrastructure</strong> (hébergeur,
            Stripe pour les paiements)
          </li>
          <li>
            <strong>Autorités légales</strong> : uniquement en cas de demande
            légale impérative
          </li>
        </ul>

        <h2>5. Durée de conservation</h2>
        <ul>
          <li>Données de compte : tant que votre compte est actif</li>
          <li>Tokens OAuth : jusqu&apos;à révocation ou expiration</li>
          <li>Données après suppression de compte : 30 jours, puis effacement définitif</li>
          <li>Logs : 12 mois maximum</li>
        </ul>

        <h2>6. Vos droits (RGPD)</h2>
        <p>Vous disposez des droits suivants :</p>
        <ul>
          <li><strong>Accès</strong> : obtenir une copie de vos données</li>
          <li><strong>Rectification</strong> : corriger des données inexactes</li>
          <li><strong>Effacement</strong> : supprimer votre compte et vos données</li>
          <li><strong>Portabilité</strong> : exporter vos données dans un format ouvert</li>
          <li><strong>Opposition</strong> : refuser certains traitements</li>
          <li><strong>Limitation</strong> : restreindre certains traitements</li>
        </ul>
        <p>
          Pour exercer ces droits :{" "}
          <a href="mailto:contact@wanapush.com">contact@wanapush.com</a>. Nous
          répondons sous 30 jours.
        </p>

        <h2>7. Sécurité</h2>
        <p>
          Vos données sont chiffrées en transit (HTTPS) et au repos. Les tokens
          OAuth sont chiffrés. Les mots de passe sont hashés avec bcrypt
          (cost 12). Nous appliquons les standards de l&apos;industrie.
        </p>

        <h2>8. Cookies</h2>
        <p>
          WanaPush utilise des cookies essentiels (session, langue) nécessaires
          au fonctionnement. Aucun cookie publicitaire ou de tracking tiers
          n&apos;est utilisé.
        </p>

        <h2>9. Données spécifiques aux plateformes</h2>

        <h3>TikTok</h3>
        <p>
          Lorsque vous connectez TikTok, nous accédons à votre profil public,
          uploadons des vidéos en votre nom, et lisons les statistiques. Nous ne
          lisons jamais vos messages privés. Conformément aux règles TikTok,
          vous pouvez révoquer l&apos;accès à tout moment depuis vos paramètres
          TikTok.
        </p>

        <h3>Meta (Facebook & Instagram)</h3>
        <p>
          Nous accédons à vos Pages, comptes Instagram Business associés, et
          comptes publicitaires. Nous publions du contenu uniquement à votre
          demande.
        </p>

        <h3>Google (YouTube & Google Ads)</h3>
        <p>
          Nous accédons à vos chaînes YouTube et comptes Google Ads avec les
          scopes minimaux nécessaires aux fonctionnalités souscrites.
        </p>

        <h2>10. Réclamations</h2>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez
          saisir la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>) ou
          l&apos;autorité de protection des données de votre pays.
        </p>

        <h2>11. Modifications</h2>
        <p>
          Cette politique peut être mise à jour. Les modifications
          significatives seront notifiées par email.
        </p>
      </div>
    </main>
  );
}
