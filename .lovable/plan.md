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

## 🛡️ SQL / branchement base

Aucun nouveau schéma n'est requis pour cette étape : le CRUD admin s'appuie sur les tables existantes et leurs RLS déjà en place.

```sql
-- MiPROJET Go
select * from public.profiles order by created_at desc;
select * from public.user_subscriptions order by created_at desc;

-- MiPROJET+
select * from public.mp_projects order by created_at desc;
select * from public.mp_scoring_results where is_active = true order by created_at desc;
select * from public.mp_certifications order by created_at desc;
select * from public.mp_user_service_requests order by created_at desc;

-- MiPROJET Invest
select * from public.projects order by created_at desc;
select * from public.investor_prospects order by created_at desc;
select * from public.opportunities order by created_at desc;

-- Permissions admin existantes côté UI/RLS
select public.current_user_has_role('admin');
```

Les routes publiques supprimées ou obsolètes sont retirées du menu et du sitemap ; `/submit-project` redirige vers `/miprojet-plus`.

## ✅ Point d'entrée équipe

- `https://ivoireprojet.com/me` — auth interne
- `https://ivoireprojet.com/me/admin` — back-office central

Ces routes ne sont référencées nulle part dans le menu public, le footer, ou les CTAs.

## 📌 Note

Si tu souhaites ensuite que je supprime aussi complètement les routes obsolètes
(`/submit-project`, `/dashboard` public), ou que je nettoie les pages métier
non listées dans le cahier des charges, dis-le moi.
