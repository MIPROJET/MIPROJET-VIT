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

---

## 🛡️ SQL à exécuter manuellement — Lot « Permissions & durcissement »

Copier/coller dans le SQL Editor Supabase. Dès l'exécution, l'UI (matrice de permissions,
actions groupées, modules admin) fonctionne automatiquement — aucun changement de code requis.

```sql
-- 1) Rôles admin granulaires (stockés dans public.user_roles, jamais dans profiles)
--    Valeurs utilisées par l'UI : 'admin', 'admin_operational', 'admin_readonly'
--    (aucune migration de schéma nécessaire : la colonne role est de type text)

-- 2) Révoquer l'exécution publique des fonctions internes SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.emit_sync_signal(text,text,uuid,uuid,jsonb,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_user_email(uuid,text,text,text,text,text,uuid,jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_email_sent(uuid,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_email_failed(uuid,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pick_email_provider() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_email_provider_usage(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_email_unsubscribed(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_agricapital_partition() FROM anon;

-- 3) Écriture réservée aux rôles admin : actualités
DROP POLICY IF EXISTS news_admin_write ON public.news;
CREATE POLICY news_admin_write ON public.news FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'admin_operational'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'admin_operational'));

DROP POLICY IF EXISTS news_admin_delete ON public.news;
CREATE POLICY news_admin_delete ON public.news FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- 4) Écriture réservée aux rôles admin : opportunités
DROP POLICY IF EXISTS opportunities_admin_write ON public.opportunities;
CREATE POLICY opportunities_admin_write ON public.opportunities FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'admin_operational'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'admin_operational'));

DROP POLICY IF EXISTS opportunities_admin_delete ON public.opportunities;
CREATE POLICY opportunities_admin_delete ON public.opportunities FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- 5) Appels d'offres : import/upsert de masse + suppression admin
DROP POLICY IF EXISTS tenders_admin_write ON public.tenders;
CREATE POLICY tenders_admin_write ON public.tenders FOR ALL TO authenticated
USING (public.is_any_admin(auth.uid()) AND NOT public.has_role(auth.uid(),'admin_readonly'))
WITH CHECK (public.is_any_admin(auth.uid()) AND NOT public.has_role(auth.uid(),'admin_readonly'));

-- Contrainte unique nécessaire à l'import massif (upsert par lots de 500)
CREATE UNIQUE INDEX IF NOT EXISTS tenders_title_deadline_uniq
  ON public.tenders (notice_title, notice_deadline);

-- 6) Lecture de la matrice de permissions par l'équipe admin
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
```

### Après exécution
- Le module **Système → Permissions** affiche la matrice et le rôle courant.
- Les boutons créer / modifier / supprimer / publier se désactivent selon le rôle.
- Les **actions groupées** (Actualités, Opportunités, Appels d'offres) sont opérationnelles.
- L'import d'appels d'offres 100 000+ lignes utilise l'index unique ci-dessus.

---

# LOT — Admin unifié, production réelle & synchronisation Go / MiPROJET+ / Invest

## ✅ Livré (UI, déjà branché)

- **Shell admin unique** (`src/components/admin/ui/AdminPageShell.tsx`) : header (icône, titre, description),
  fil d'Ariane et **barre d'actions unique** partagée par tous les modules.
  `AdminModuleShell` détecte le shell et n'affiche plus de double en-tête : ses actions sont
  automatiquement projetées dans la barre d'actions du shell.
- **MiPROJET Go → Produits & opérations** (`AdminGoManager`) : CRUD réel sur `produits` / `operations`,
  activation/archivage, suppression, KPI, et **propagation automatique** vers Go (`go.produit.*`, `go.sync.request`).
- **MiPROJET+ → Gestion des projets** (`AdminMPPlusManager`) : modifier, valider, rejeter, archiver,
  supprimer, **noter** (`mp_evaluations`), **certifier** (`mp_certifications`), **message au porteur**
  (`notifications`) et **publier vers Invest** (`projects`), chaque action émettant un signal de sync.
- **Système → Synchronisation plateformes** (`AdminSyncHub`) : file réelle `platform_sync_signals`
  (filtres, traiter/ignorer/supprimer, émission manuelle de signaux, push du jeu de données vers Go).
- **Système → Nettoyage production** (`AdminDataCleanup`) : détection + purge des comptes/données
  de démo, de simulation et des doublons de brouillons Invest.

## 🗄️ SQL à exécuter (manuellement) — tout se branche automatiquement ensuite

```sql
-- 1) Autoriser l'admin console à émettre des signaux de synchronisation
GRANT EXECUTE ON FUNCTION public.emit_sync_signal(text, text, uuid, uuid, jsonb, text) TO authenticated;

-- 2) Accès admin à la file de synchronisation (lecture / traitement / purge)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_sync_signals TO authenticated;
GRANT ALL ON public.platform_sync_signals TO service_role;

DROP POLICY IF EXISTS "Admins manage sync signals" ON public.platform_sync_signals;
CREATE POLICY "Admins manage sync signals"
  ON public.platform_sync_signals FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- 3) Notation admin des projets MiPROJET+ (module "Noter")
DROP POLICY IF EXISTS "Admins manage evaluations" ON public.mp_evaluations;
CREATE POLICY "Admins manage evaluations"
  ON public.mp_evaluations FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- 4) Nettoyage production : doublons de brouillons Invest (on garde le plus récent par titre)
DELETE FROM public.projects p
USING (
  SELECT id, row_number() OVER (PARTITION BY lower(btrim(title)) ORDER BY created_at DESC) rn
  FROM public.projects WHERE status = 'draft'
) d
WHERE p.id = d.id AND d.rn > 1;

-- 5) Suppression des éventuels comptes de démo / test (aucun détecté à ce jour)
DELETE FROM public.profiles
WHERE email ILIKE '%demo%' OR email ILIKE '%test%' OR email ILIKE '%example%';
```

> Dès que ce SQL est exécuté : le hub de synchronisation affiche et traite les signaux,
> les actions Go/MiPROJET+ propagent automatiquement, et la notation admin fonctionne.
