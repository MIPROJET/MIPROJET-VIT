# Plan de refonte MiPROJET — Vitrine v2.0 (final)

## 🎯 Livré (UI vitrine)

- Nouvelle **Navigation** (7 groupes du cahier des charges) :
  Écosystème · Solutions · Acteurs · Services · Opportunités · Ressources · Partenaires · Contact.
  **Aucun bouton Connexion / Se connecter / Créer un compte visible.**
- Nouveau **Hero** bleu institutionnel + 3 cartes solutions avec logos officiels.
- **EcosystemSolutions** : logos officiels + boutons redirigeant vers les sous-domaines externes.
- **CallToAction** : 3 CTAs "Développer / Structurer / Investir" → sous-domaines externes.
- **Solutions pages** (`/solutions/miprojet-go`, `/miprojet-plus`, `/solutions/miprojet-invest`) :
  - Logos officiels intégrés
  - Couleurs officielles en aplat (vert Go / orange + / or Invest)
  - CTAs uniquement vers `go.ivoireprojet.com`, `plus.ivoireprojet.com`, `invest.ivoireprojet.com`
  - **Suppression de tous les formulaires d'auth inline** (MiProjetPlusLanding réécrit en vitrine pure).
- **Footer** : colonnes réorganisées Écosystème / Ressources, liens externes vers sous-domaines.
- Route interne équipe : **`/me`** (non affichée dans le menu) → auth, puis `/me/admin` → back-office.

## 🔗 Redirections sous-domaines externes

| Bouton                          | Cible                              |
| ------------------------------- | ---------------------------------- |
| Développer mon activité         | https://go.ivoireprojet.com        |
| Structurer mon projet           | https://plus.ivoireprojet.com      |
| Trouver des opportunités        | https://invest.ivoireprojet.com    |

## 🎨 Couleurs officielles appliquées (aplats)

- MiPROJET (vitrine) : bleu `hsl(214 88% 18%)`
- MiPROJET Go       : vert `hsl(140 55% 38%)`
- MiPROJET+         : orange `hsl(25 92% 55%)`
- MiPROJET Invest   : or `hsl(42 78% 50%)`

Aucun gradient excessif, aplats propres, secondaires neutres.

## 🖼️ Logos officiels

Uploadés dans `src/assets/logos/` en tant qu'assets CDN :

- `miprojet.png` (vitrine)
- `miprojet-go.png`
- `miprojet-plus.png`
- `miprojet-invest.png`

## 🛡️ SQL manuel — aucun requis pour cette étape

La refonte de la vitrine est **UI/UX uniquement**. Aucun schéma de base ne change.

Les routes `/auth`, `/submit-project`, `/dashboard` restent dans le code (utilisées par l'équipe interne via `/me`), mais **ne sont plus liées depuis aucun élément public** (navigation, footer, hero, CTA).

## ✅ Point d'entrée équipe

- `https://ivoireprojet.com/me` — auth interne
- `https://ivoireprojet.com/me/admin` — back-office central

Ces routes ne sont référencées nulle part dans le menu public, le footer, ou les CTAs.

## 📌 Note

Si tu souhaites ensuite que je supprime aussi complètement les routes obsolètes
(`/submit-project`, `/dashboard` public), ou que je nettoie les pages métier
non listées dans le cahier des charges, dis-le moi.
