
## Livré dans cette réponse
- Page d'administration **Témoignages** (CRUD + publier/dépublier) ajoutée dans Admin → Gestion de contenu → Témoignages. Connectée à la table `testimonials` existante.

---

## LOT 1 — Affichage public des projets (priorité absolue)

### Objectifs
1. Une grille moderne et dynamique des projets (publique + investisseurs + bailleurs).
2. Page détail projet "vitrine" : résumé auto-généré, KPI, logo + image de couverture, montant, score MiProjet+, recommandation.
3. Bouton **"Ce projet m'intéresse"** → formulaire prospect investisseur (capacité, type d'engagement, retour souhaité…) → table dédiée + notification admin.
4. Auto-publication des projets MiProjet+ qui atteignent le niveau **Finançable** (déjà partiellement câblé via `mp_auto_publish_eligible_project`), avec récupération automatique du logo, photo, score, secteur, montant pour affichage immédiat (cas Agricapital).

### Composants front à créer/refondre
- `src/components/projects/PublicProjectCard.tsx` — carte moderne (logo + cover + score badge + montant + secteur + pays + CTA).
- `src/components/projects/PublicProjectGrid.tsx` — grille responsive avec filtres (secteur, montant, score, type d'engagement).
- `src/pages/PublicProjectDetail.tsx` (ou refonte `ProjectDetail.tsx` pour visiteur non-propriétaire) : hero, résumé IA, chiffres clés (montant demandé, capacité de remboursement, ROI estimé, durée), score MiProjet+ + recommandation, équipe (anonymisée), CTA.
- `src/components/projects/InvestorInterestDialog.tsx` — formulaire :
  - capacité d'investissement (tranche),
  - type souhaité (capital, prêt, don, amorçage, mixte),
  - retour attendu (%),
  - souhait actionnariat (oui/non + %),
  - horizon temps,
  - message libre,
  - coordonnées (pré-remplies si connecté).
- Hook `useAutoSummary(project)` : génère un résumé pertinent (champs présents + niveau MiProjet+) sans exposer données sensibles.

### Côté admin
- `AdminProjectsTable` : ajouter colonne "Visible public" + toggle, bouton "Publier maintenant" et affichage du score MiProjet+ lié.
- Nouveau tab admin **"Prospects investisseurs"** listant les soumissions du formulaire d'intérêt (statut, contact, projet visé).

### SQL à exécuter manuellement (LOT 1)
```sql
-- 1) Champs vitrine sur projects (si absents)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS public_summary text,
  ADD COLUMN IF NOT EXISTS expected_roi numeric,
  ADD COLUMN IF NOT EXISTS repayment_capacity text,
  ADD COLUMN IF NOT EXISTS funding_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommendation_level text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS mp_score numeric,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text;

-- 2) Vue publique sécurisée (sans contacts ni données sensibles)
CREATE OR REPLACE VIEW public.public_projects AS
SELECT
  p.id, p.display_id, p.short_slug, p.title, p.sector, p.country, p.city,
  p.amount_requested, p.currency, p.logo_url, p.cover_url, p.public_summary,
  p.expected_roi, p.repayment_capacity, p.funding_types,
  p.recommendation_level, p.mp_score, p.status, p.created_at
FROM public.projects p
WHERE p.is_public = true AND p.status IN ('published','validated','oriented');

GRANT SELECT ON public.public_projects TO anon, authenticated;

-- 3) Table prospects investisseurs (formulaire "Ce projet m'intéresse")
CREATE TABLE IF NOT EXISTS public.investor_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text,
  investment_capacity text,
  engagement_type text[] DEFAULT '{}', -- equity, loan, donation, seed, mixed
  expected_return_pct numeric,
  wants_equity boolean DEFAULT false,
  equity_share_pct numeric,
  time_horizon text,
  message text,
  status text DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_prospects TO authenticated;
GRANT INSERT ON public.investor_prospects TO anon;
GRANT ALL ON public.investor_prospects TO service_role;

ALTER TABLE public.investor_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit interest"
  ON public.investor_prospects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND char_length(full_name) BETWEEN 2 AND 120
  );

CREATE POLICY "Owner sees own submissions"
  ON public.investor_prospects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage prospects"
  ON public.investor_prospects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_investor_prospects_updated_at
  BEFORE UPDATE ON public.investor_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Mise à jour de la fonction d'auto-publication MiProjet+
-- pour synchroniser logo, cover, score, summary depuis mp_projects
CREATE OR REPLACE FUNCTION public.mp_auto_publish_eligible_project()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project public.mp_projects%ROWTYPE;
  v_existing_id uuid;
BEGIN
  IF NEW.level IS DISTINCT FROM 'Finançable' THEN RETURN NEW; END IF;
  SELECT * INTO v_project FROM public.mp_projects WHERE id = NEW.project_id;
  IF NOT FOUND OR COALESCE(v_project.publish_when_eligible, false) = false THEN RETURN NEW; END IF;

  SELECT id INTO v_existing_id FROM public.projects
  WHERE owner_id = v_project.user_id AND metadata->>'mp_project_id' = v_project.id::text LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.projects
      (owner_id, title, sector, amount_requested, status, source, is_public, mp_score, country, city, metadata)
    VALUES (
      v_project.user_id,
      COALESCE(v_project.title, 'Projet MiProjet+'),
      v_project.sector, v_project.amount_needed,
      'published', 'miprojet', true,
      NEW.score_global, v_project.country, v_project.city,
      jsonb_build_object('mp_project_id', v_project.id, 'mp_score', NEW.score_global)
    );
  ELSE
    UPDATE public.projects
    SET title = COALESCE(v_project.title, title),
        sector = COALESCE(v_project.sector, sector),
        amount_requested = COALESCE(v_project.amount_needed, amount_requested),
        status = 'published', is_public = true,
        mp_score = NEW.score_global,
        country = COALESCE(v_project.country, country),
        city = COALESCE(v_project.city, city),
        metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('mp_project_id', v_project.id, 'mp_score', NEW.score_global),
        updated_at = now()
    WHERE id = v_existing_id;
  END IF;
  RETURN NEW;
END $$;
```

---

## LOT 2 — Refonte profils entités (entreprise, startup, ONG, coopérative, association)

### Objectifs
- Retirer "Porteur de projet" du parcours principal : MIPROJET = entités formelles à fort potentiel.
- Formulaires de soumission enrichis : chiffre d'affaires, capital social, gouvernance (postes + titulaires), produits/services, marchés desservis, modèle économique, actions menées, indicateurs.
- Pages publiques par profil : Investisseurs · Entreprises & Start-ups · Bailleurs & Institutions · Coopératives · Associations · ONG (contenu spécifique + opportunités filtrées).
- Espaces clients connectés adaptés par `user_type`.
- Pages admin par profil pour gérer/segmenter.

### SQL à exécuter manuellement (LOT 2)
```sql
-- Enrichissement profile / entité
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_form text,
  ADD COLUMN IF NOT EXISTS share_capital numeric,
  ADD COLUMN IF NOT EXISTS annual_revenue numeric,
  ADD COLUMN IF NOT EXISTS employees_count integer,
  ADD COLUMN IF NOT EXISTS founding_year integer,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS business_model text;

-- Gouvernance (postes stratégiques)
CREATE TABLE IF NOT EXISTS public.entity_governance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  role_title text NOT NULL,
  full_name text NOT NULL,
  bio text,
  linkedin_url text,
  is_strategic boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_governance TO authenticated;
GRANT ALL ON public.entity_governance TO service_role;
ALTER TABLE public.entity_governance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages governance" ON public.entity_governance
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Produits / services
CREATE TABLE IF NOT EXISTS public.entity_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  name text NOT NULL,
  description text,
  market text,
  revenue_share_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_products TO authenticated;
GRANT ALL ON public.entity_products TO service_role;
ALTER TABLE public.entity_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages products" ON public.entity_products
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
```

### Front (LOT 2)
- Pages publiques `/profils/investisseurs`, `/profils/entreprises`, `/profils/bailleurs`, `/profils/cooperatives`, `/profils/associations`, `/profils/ong` (contenu + bénéfices + CTA + opportunités filtrées).
- Refonte `SubmitProject` en multi-étapes spécifique au `user_type`.
- Adapter `Dashboard` : composants par profil (Investor / Funder / Enterprise / NGO / Cooperative / Association).
- Admin : onglet "Entités" avec filtres par profil + KPIs.

---

## Important — base partagée avec l'autre projet (MIPROJET app)
Toutes les tables ci-dessus restent dans le même schéma `public`. Le déclencheur `mp_auto_publish_eligible_project` continue de fonctionner pour les scores produits par l'autre app. Aucune duplication n'est créée : on enrichit `projects` et on lit `mp_projects` / `mp_scoring_results`.

---

## Ordre de livraison proposé
1. Tu exécutes le SQL **LOT 1**.
2. Je code l'UI publique projets + détail + formulaire d'intérêt + admin prospects + auto-import Agricapital.
3. Sur "continue", on enchaîne le **LOT 2** (SQL puis code).

---

## LOT 2 — Vitrine AgriCapital + champs site web / galerie (à exécuter manuellement)

**Objectif** : afficher AgriCapital comme projet vitrine (score 73/100, badge Standard argent), avec cover, logo, galerie et lien vers www.agricapital.ci. Une fois ce SQL exécuté, la carte apparaît automatiquement dans `/projects` et la page détail `/projects/{id}` charge tout sans aucun code à modifier.

### SQL à exécuter (LOT 2)

```sql
-- 1) Champs vitrine supplémentaires
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}';

-- 2) Insertion (ou mise à jour) du projet AgriCapital
INSERT INTO public.projects (
  id, title, sector, category, country, city,
  description, public_summary,
  logo_url, cover_url, image_url, gallery_urls, website_url,
  amount_requested, currency, expected_roi,
  mp_score, recommendation_level, risk_score,
  status, is_public, funds_raised, funding_goal,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'AgriCapital — Plantation industrielle de palmier à huile',
  'Agro-industrie',
  'Agriculture',
  'Côte d''Ivoire',
  'Soubré',
  E'AgriCapital structure une filière intégrée de production durable d''huile de palme en Côte d''Ivoire, du planteur à la transformation. Le projet mobilise une réserve foncière sécurisée, une pépinière opérationnelle de plants sélectionnés haut rendement, et un réseau de planteurs partenaires accompagnés sur tout le cycle (préparation, plantation clé-en-main, suivi agronomique, récolte, valorisation).\n\n## Pourquoi AgriCapital ?\n- Filière palmier à huile : marché structurellement déficitaire en Afrique de l''Ouest, demande industrielle et alimentaire en forte croissance.\n- Modèle intégré planteurs + pépinière + accompagnement technique = sécurisation du rendement et de la qualité.\n- Foncier sécurisé, levés polygonaux réalisés, mobilisation communautaire active.\n- Équipe terrain expérimentée, gouvernance structurée, ancrage local fort.\n\n## Bénéfices pour les investisseurs & partenaires\n- Exposition à un actif agricole tangible, productif sur 25+ ans.\n- Revenus récurrents post-maturation, marché à forte profondeur.\n- Co-investissement possible sur plusieurs tranches (foncier, pépinière, plantation, transformation).\n- Reporting structuré selon les standards MIPROJET.\n\n## Impact\n- Création d''emplois ruraux directs et indirects.\n- Inclusion économique des planteurs partenaires (formation, intrants, débouchés garantis).\n- Reforestation productive, diversification des revenus agricoles locaux.\n- Souveraineté alimentaire et industrielle nationale renforcée.\n\n## Statut du projet\nPhase active : sécurisation foncière finalisée, pépinière en production, premières mobilisations communautaires effectuées (lancement officiel — juin 2026).',
  'Filière intégrée et durable de palmier à huile en Côte d''Ivoire : foncier sécurisé, pépinière haut rendement, planteurs partenaires accompagnés, ancrage local et impact social fort.',
  '/__l5e/assets-v1/334f2efc-b014-4515-bea3-518f3d8e4b24/agricapital-logo.png',
  '/__l5e/assets-v1/135e906a-f237-47a1-bdd6-cf8784044e43/agricapital-cover.jpg',
  '/__l5e/assets-v1/135e906a-f237-47a1-bdd6-cf8784044e43/agricapital-cover.jpg',
  ARRAY[
    '/__l5e/assets-v1/335afa94-a00d-4136-95a2-49eb380bd581/agricapital-palmier.jpg',
    '/__l5e/assets-v1/c93ba69a-9b2c-49fd-aa71-ded811b422f6/agricapital-pepiniere.jpg',
    '/__l5e/assets-v1/eed1ccc5-ad8d-4121-90eb-e57b0511d1ab/agricapital-equipe.jpg',
    '/__l5e/assets-v1/17d7a63d-26ae-47cd-b625-2bd9487a4d91/agricapital-lancement.jpg',
    '/__l5e/assets-v1/69317e8a-dc21-4f50-b7ff-4af0b8fc2c7d/agricapital-leve.jpg',
    '/__l5e/assets-v1/c7382555-8cea-4d8c-88ba-321dfe7d609b/agricapital-fonciere.jpg'
  ],
  'https://www.agricapital.ci',
  NULL,        -- amount_requested : volontairement non public
  'XOF',
  NULL,        -- expected_roi : volontairement non public
  73,          -- score MIPROJET → badge Standard (argent)
  'standard',
  'B',
  'published',
  true,
  0,
  0,
  now(),
  now()
)
ON CONFLICT DO NOTHING;
```

### Branchement automatique côté UI (déjà livré dans cette réponse)
- `src/lib/scoreTier.ts` — tiers Bronze / Argent / Or / Platine selon le score.
- `src/components/projects/ScoreBadge.tsx` — badge premium réutilisable (gradient + glow).
- `PublicProjectCard.tsx` — affiche le nouveau badge en overlay sur la cover.
- `ProjectDetail.tsx` — header avec logo + score badge tier, bouton "Site officiel" si `website_url`, image de cover dans la carte latérale, nouvel onglet "Galerie" lisant `gallery_urls`, montant masqué si non public.

Aucun code supplémentaire à modifier après exécution du SQL : AgriCapital apparaîtra automatiquement avec le score 73 affiché en argent et toute la vitrine s'auto-câblera.
