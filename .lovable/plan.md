# LOT 3 — Newsletter import + Email queue + AgriCapital IM + Media upload

## Branchement automatique
Dès que tu exécutes le SQL ci-dessous dans Supabase, l'UI prend tout en charge sans action supplémentaire :
- 1074 emails ajoutés à `newsletter_subscribers` → ils recevront les prochaines campagnes.
- File d'attente email (`email_queue` + `process_email_queue` cron) : si le quota 400/jour (300 Brevo + 100 Resend) est atteint, les emails sont mis en attente et envoyés automatiquement le lendemain.
- AgriCapital : couverture responsive, description IM (extrait public), équipe, actualité, galerie, documents (échange stratégique), formulaire d'intérêt qui envoie un mail automatique à `invest@ivoireprojet.com`.
- Email templates admin : remplacement image **ou** vidéo (upload direct ou URL) avec optimisation auto.

---

## 1) Import newsletter (1074 emails — fichier généré)

Le fichier SQL complet est disponible en téléchargement ci-dessous (trop volumineux pour être inliné). Il fait `INSERT … ON CONFLICT DO UPDATE` donc il est ré-exécutable sans risque.

<presentation-artifact path="newsletter_import_les_mails_2026.sql" mime_type="application/sql"></presentation-artifact>

---

## 2) File d'attente email (queue 400/jour)

```sql
-- 2.1) Table de file d'attente
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  text_content text,
  kind text DEFAULT 'transactional',
  campaign_id uuid,
  recipient_user_id uuid,
  reply_to text,
  from_address text,
  unsubscribe_url text,
  bypass_unsubscribe_check boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending | processing | sent | failed
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_pending
  ON public.email_queue(status, scheduled_for)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage queue"
  ON public.email_queue FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_email_queue_updated_at
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2.2) Cron toutes les 10 minutes pour vider la file
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Supprime l'ancien job s'il existe puis recrée
DO $$ BEGIN
  PERFORM cron.unschedule('process-email-queue-job');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'process-email-queue-job',
  '*/10 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nrrgqnruoylwztddkntm.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('source','cron')
  );
  $cron$
);
```

---

## 3) AgriCapital — mise à jour vitrine (extrait public IM)

```sql
-- 3.1) Champs supplémentaires (déjà présents la plupart, ON CONFLICT-safe)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_url_mobile text,
  ADD COLUMN IF NOT EXISTS tagline text;

-- 3.2) Mise à jour du projet AgriCapital (id connu via URL preview)
UPDATE public.projects SET
  title = 'AgriCapital — Plantations agricoles intégrées en Côte d''Ivoire',
  tagline = 'Investir la terre. Cultiver l''avenir.',
  sector = 'Agro-industrie',
  category = 'Agriculture',
  country = 'Côte d''Ivoire',
  city = 'Daloa',
  website_url = 'https://www.agricapital.ci',
  logo_url  = '/__l5e/assets-v1/334f2efc-b014-4515-bea3-518f3d8e4b24/agricapital-logo.png',
  cover_url = '/__l5e/assets-v1/dac95186-7b95-4e72-9ba7-e3acc6899fe2/agricapital-cover-desktop.png',
  cover_url_mobile = '/__l5e/assets-v1/99763a84-5681-4800-9a5e-26e070b1ea35/agricapital-cover-mobile.png',
  image_url = '/__l5e/assets-v1/dac95186-7b95-4e72-9ba7-e3acc6899fe2/agricapital-cover-desktop.png',
  gallery_urls = ARRAY[
    '/__l5e/assets-v1/335afa94-a00d-4136-95a2-49eb380bd581/agricapital-palmier.jpg',
    '/__l5e/assets-v1/c93ba69a-9b2c-49fd-aa71-ded811b422f6/agricapital-pepiniere.jpg',
    '/__l5e/assets-v1/1327af09-2b46-4f74-a041-0357aa11df09/agricapital-pepiniere-2.jpg',
    '/__l5e/assets-v1/eed1ccc5-ad8d-4121-90eb-e57b0511d1ab/agricapital-equipe.jpg',
    '/__l5e/assets-v1/17d7a63d-26ae-47cd-b625-2bd9487a4d91/agricapital-lancement.jpg',
    '/__l5e/assets-v1/69317e8a-dc21-4f50-b7ff-4af0b8fc2c7d/agricapital-leve.jpg',
    '/__l5e/assets-v1/c7382555-8cea-4d8c-88ba-321dfe7d609b/agricapital-fonciere.jpg'
  ],
  public_summary = 'AgriCapital SARL développe un modèle agricole intégré en Côte d''Ivoire — sécurisation foncière, plantations clé en main, suivi agronomique professionnel, garantie d''écoulement — avec une vision long terme de création d''actifs agricoles durables.',
  description = E'## Présentation stratégique\n\n**AgriCapital SARL** développe un modèle agricole intégré en Côte d''Ivoire — de la sécurisation foncière jusqu''à la plantation clé en main, avec une implantation initiale sur le **palmier à huile**, appelée à s''étendre vers d''autres cultures à forte valeur agronomique et commerciale — avec une vision de création d''actifs agricoles durables sur le long terme.\n\n### Ce que le projet offre\n\n- **Accès à des terres sécurisées** dans des zones productives\n- **Plantations mises en place de A à Z** (clé en main)\n- **Suivi agronomique professionnel** inclus\n- **Garantie d''écoulement** de la production\n- **Fourniture d''intrants premium**\n- **Option de gestion intégrale** sur 28 ans\n- **Impact direct** sur l''emploi local et les communautés rurales\n\n### Actifs opérationnels\n\n- **~120 ha** de pépinière propre en développement actif\n- **~250 ha** de terres identifiées et mobilisables\n- **~500 ha** via le réseau de pépiniéristes partenaires\n- Équipe terrain expérimentée et partenaires techniques structurés\n- Modèle économique structuré et rentable dès la phase de construction\n- Vision long terme : création d''actifs agricoles durables sur **25 ans**\n\n### Phases de développement\n\n| Phase | Horizon |\n|---|---|\n| Court terme | 12 – 18 mois : déploiement de ~200 ha additionnels |\n| Moyen terme | 24 – 36 mois : extension vers 500 à 1 000 ha |\n| Long terme  | Structuration d''un portefeuille de plusieurs milliers d''hectares |\n\n---\n\n## Information Memorandum confidentiel\n\nLes informations stratégiques, financières et opérationnelles détaillées (modèle économique, projections, structure du capital, modalités d''investissement, stratégie de sortie) sont consignées dans le **Information Memorandum (IM) confidentiel** d''AgriCapital.\n\n**L''IM est disponible sur demande, après un premier échange de qualification.**\n\nMerci de manifester votre intérêt via le bouton ci-dessous — notre équipe vous recontactera dans les 48 h.',
  mp_score = 73,
  recommendation_level = 'standard',
  risk_score = 'B',
  status = 'published',
  is_public = true,
  updated_at = now()
WHERE id = '5cbe6b0a-bfba-49d6-8893-94f1160431d5';

-- 3.3) Équipe AgriCapital (table dédiée projets publics)
CREATE TABLE IF NOT EXISTS public.project_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role_title text NOT NULL,
  bio text,
  photo_url text,
  display_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_team TO anon, authenticated;
GRANT ALL ON public.project_team TO service_role;
ALTER TABLE public.project_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public project team"
  ON public.project_team FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage project team"
  ON public.project_team FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.project_team (project_id, role_title, full_name, bio, display_order) VALUES
('5cbe6b0a-bfba-49d6-8893-94f1160431d5','Direction Générale','AgriCapital SARL','Pilotage stratégique interne — structuration, déploiement opérationnel et coordination des partenaires techniques.',1),
('5cbe6b0a-bfba-49d6-8893-94f1160431d5','Ingénieurs agronomes','Partenaires techniques','Cabinets agronomiques spécialisés assurant le suivi technique des pépinières et plantations.',2),
('5cbe6b0a-bfba-49d6-8893-94f1160431d5','Cabinet juridique','Partenaire juridique','Structuration contractuelle, conventions foncières long terme et conformité.',3),
('5cbe6b0a-bfba-49d6-8893-94f1160431d5','Cabinet comptable & fiscal','Partenaire financier','Comptabilité, fiscalité et reporting financier structuré.',4),
('5cbe6b0a-bfba-49d6-8893-94f1160431d5','Structuration & accompagnement','MIPROJET','Structuration complète, labellisation et accompagnement stratégique du projet.',5);

-- 3.4) Actualité AgriCapital
INSERT INTO public.project_updates (project_id, title, content) VALUES
('5cbe6b0a-bfba-49d6-8893-94f1160431d5',
'MiProjet présente AgriCapital : quand la structuration professionnelle transforme le foncier africain en actif durable',
E'**AgriCapital SARL** est l''un des projets que MiProjet a accompagnés dans sa structuration complète. Un modèle agricole intégré, une équipe terrain, une vision long terme — voici pourquoi ce projet mérite l''attention des investisseurs, partenaires techniques, souscripteurs et propriétaires fonciers.\n\nMiProjet a accompagné AgriCapital dans la construction d''un modèle agricole rigoureux — de la définition de la stratégie jusqu''à la publication de l''Information Memorandum. Ce travail de structuration a abouti à un projet opérationnel, documenté et prêt à accueillir des partenaires financiers et techniques.\n\n### Le constat de départ\nL''Afrique de l''Ouest dispose d''un potentiel agricole considérable — des terres fertiles, une demande croissante, des filières structurantes comme le palmier à huile. Pourtant, deux écarts persistent : des terres inexploitées faute d''accompagnement, et des capitaux disponibles sans structure d''accueil sérieuse. **AgriCapital comble exactement ces deux écarts.**\n\n### Ce qu''AgriCapital propose concrètement\n- Identification et sécurisation des terres agricoles\n- Mise en place complète de plantations de palmier à huile\n- Suivi agronomique professionnel inclus\n- Fourniture d''intrants premium\n- Garantie d''écoulement de la production\n- Option de gestion intégrale sur 28 ans\n\n### À qui s''adresse ce projet\n**Investisseurs et partenaires stratégiques** — fonds, family offices, diaspora, institutions souhaitant un véhicule d''investissement agricole structuré en Afrique de l''Ouest. *L''Information Memorandum est disponible sur demande.*\n\n**Souscripteurs** — cadres, fonctionnaires, opérateurs économiques souhaitant développer leur propre plantation clé en main sans gérer les aspects techniques. La liste d''attente est ouverte.\n\n**Partenaires techniques** — agronomes, usiniers, acheteurs, fournisseurs d''intrants souhaitant intégrer un écosystème agricole structuré et en croissance.\n\n**Propriétaires fonciers** — propriétaires de terres agricoles souhaitant mettre en valeur leur patrimoine dans le cadre d''un partenariat structuré et professionnel.\n\n### Contact\n📩 invest@ivoireprojet.com\n📞 +225 07 07 16 79 21 · +225 05 05 23 30 05\n🌐 www.agricapital.ci');
```

---

## 4) Tout est branché côté UI

- `ProjectDetail` : couverture responsive (desktop / mobile), description rendue en **Markdown professionnel** (titres, gras, listes, tableaux), équipe lue depuis `project_team`, actualités lues depuis `project_updates`, onglet Documents avec message "échange stratégique de qualification" + CTA ouvrant le formulaire d'intérêt.
- `InvestorInterestDialog` : à la soumission, déclenche la fonction edge `notify-investor-interest` qui envoie automatiquement un email à **invest@ivoireprojet.com** + confirmation au candidat.
- `mailer.ts` : si Brevo + Resend saturés (400/jour atteint), l'email est automatiquement **mis en file** dans `email_queue` au lieu d'échouer.
- `process-email-queue` : edge function appelée par cron toutes les 10 min, vide la file dès qu'il reste du quota.
- `EmailTemplateManager` : nouveau panneau **Média** permettant de coller une URL d'image ou de vidéo, ou d'uploader directement un fichier ; un bloc HTML responsive (img ou vidéo `<video>`) est injecté dans le template.

---

# LOT 4 (correctifs urgents) — à exécuter

## 4.1) AgriCapital — description sans `## Présentation stratégique`, table propre, équipe fixée

```sql
-- Description : commence directement par "AgriCapital SARL…", retire le sous-titre Markdown
UPDATE public.projects SET
  description = E'**AgriCapital SARL** développe un modèle agricole intégré en Côte d''Ivoire — de la sécurisation foncière jusqu''à la plantation clé en main, avec une implantation initiale sur le **palmier à huile**, appelée à s''étendre vers d''autres cultures à forte valeur agronomique et commerciale — avec une vision de création d''actifs agricoles durables sur le long terme.\n\n## Ce que le projet offre\n\n- **Accès à des terres sécurisées** dans des zones productives\n- **Plantations mises en place de A à Z** (clé en main)\n- **Suivi agronomique professionnel** inclus\n- **Garantie d''écoulement** de la production\n- **Fourniture d''intrants premium**\n- **Option de gestion intégrale** sur 28 ans\n- **Impact direct** sur l''emploi local et les communautés rurales\n\n## Actifs opérationnels\n\n- **~120 ha** de pépinière propre en développement actif\n- **~250 ha** de terres identifiées et mobilisables\n- **~500 ha** via le réseau de pépiniéristes partenaires\n- Équipe terrain expérimentée et partenaires techniques structurés\n- Modèle économique structuré et rentable dès la phase de construction\n- Vision long terme : création d''actifs agricoles durables sur **25 ans**\n\n## Phases de développement\n\n| Phase | Horizon |\n| --- | --- |\n| Court terme | 12 – 18 mois — déploiement de ~200 ha additionnels |\n| Moyen terme | 24 – 36 mois — extension vers 500 à 1 000 ha |\n| Long terme  | Structuration d''un portefeuille de plusieurs milliers d''hectares |\n\n---\n\n## Information Memorandum confidentiel\n\nLes informations stratégiques, financières et opérationnelles détaillées (modèle économique, projections, structure du capital, modalités d''investissement, stratégie de sortie) sont consignées dans le **Information Memorandum (IM) confidentiel** d''AgriCapital.\n\n**L''IM est disponible sur demande, après un premier échange de qualification.**\n\nMerci de manifester votre intérêt via le bouton ci-dessous — notre équipe vous recontactera dans les 48 h.',
  public_summary = 'AgriCapital SARL développe un modèle agricole intégré en Côte d''Ivoire — sécurisation foncière, plantations clé en main, suivi agronomique professionnel, garantie d''écoulement — avec une vision long terme de création d''actifs agricoles durables.',
  updated_at = now()
WHERE id = '5cbe6b0a-bfba-49d6-8893-94f1160431d5';

-- Équipe : corrige la formulation "Expert agronome spécialisés"
UPDATE public.project_team
SET bio = 'Cabinets agronomiques spécialisés assurant le suivi technique des pépinières et plantations.'
WHERE project_id = '5cbe6b0a-bfba-49d6-8893-94f1160431d5'
  AND role_title = 'Ingénieurs agronomes';
```

## 4.2) Routes courtes `/projects/<slug>`

L'UI accepte déjà `/projects/agricapital`, `/projects/<short_slug>` ou `/projects/<uuid>`. Pour pré-remplir un slug stable on peut ajouter une colonne :

```sql
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Backfill : pour chaque projet publié sans slug, générer un slug propre depuis le titre
UPDATE public.projects
SET slug = regexp_replace(
  lower(unaccent(title)),
  '[^a-z0-9]+', '-', 'g'
)
WHERE slug IS NULL AND title IS NOT NULL;

-- Cas AgriCapital : forcer "agricapital"
UPDATE public.projects SET slug = 'agricapital'
WHERE id = '5cbe6b0a-bfba-49d6-8893-94f1160431d5';
```

> Nécessite l'extension `unaccent` : `CREATE EXTENSION IF NOT EXISTS unaccent;`

## 4.3) Newsletter — déclencher automatiquement la suite après import

Après l'import (section 1), pour que les nouveaux abonnés reçoivent immédiatement la dernière campagne (en respectant le quota) :

```sql
-- Met en file la dernière campagne envoyée vers tous les abonnés qui ne l'ont pas reçue
WITH last_campaign AS (
  SELECT id, subject, html_content
  FROM public.email_campaigns
  WHERE status = 'sent'
  ORDER BY sent_at DESC NULLS LAST, created_at DESC
  LIMIT 1
)
INSERT INTO public.email_queue (to_email, subject, html, kind, campaign_id, scheduled_for)
SELECT s.email, lc.subject, lc.html_content, 'newsletter_resync', lc.id, now()
FROM public.newsletter_subscribers s
CROSS JOIN last_campaign lc
WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.email_logs el
    WHERE el.recipient_email = s.email AND el.campaign_id = lc.id AND el.status IN ('sent','delivered')
  );
```

Le cron `process-email-queue-job` (section 2) draine ensuite la file en respectant le quota 300 Brevo + 100 Resend / jour. Tant que le quota n'est pas atteint, les envois partent en continu ; sinon, ils sont automatiquement reportés au lendemain.

## 4.4) LOT 2 — Profils entités (squelette SQL à valider)

```sql
-- Table des entités publiques (entreprises, coopératives, ONG, institutions…)
CREATE TABLE IF NOT EXISTS public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  legal_form text,
  entity_type text CHECK (entity_type IN ('enterprise','cooperative','ngo','institution','funder')),
  tagline text,
  description text,
  logo_url text,
  cover_url text,
  cover_url_mobile text,
  website_url text,
  country text,
  city text,
  sector text,
  founded_year int,
  team_size text,
  contact_email text,
  contact_phone text,
  socials jsonb DEFAULT '{}'::jsonb,
  gallery_urls text[] DEFAULT '{}',
  is_public boolean DEFAULT true,
  mp_score int,
  recommendation_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entities TO anon, authenticated;
GRANT ALL ON public.entities TO service_role;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads public entities" ON public.entities FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY "Admins manage entities" ON public.entities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_entities_updated_at BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Réutilise project_team / project_updates pour les actualités/équipes des entités
-- (en attendant le sous-lot UI dédié)
```

---

## ✅ Côté UI — déjà branché dans ce lot

- **Routes** : `/projects/agricapital`, `/projects/<short_slug>` et `/projects/<uuid>` fonctionnent (résolution automatique).
- **Carte projet** : aperçu nettoyé (plus de `##`, `**…**` visibles) via `stripMarkdown`.
- **Hero** : badges traduits en français (Vérifié MIPROJET, Financé, Investisseurs, Jours restants, Investir maintenant, Partager).
- **Description** : titres avec barre primaire à gauche, paragraphes aérés, **tableaux rendus comme dans Word** (en-tête en gras, lignes alternées, bordures arrondies).
- **Galerie** : grille responsive avec lien plein écran.
- **Données** : tableau Word-like épuré (12 lignes max), sans répétition de la description.
- **Équipe / Actualités** : restent branchés sur `project_team` et `project_updates` (designs déjà pro et modernes via MarkdownView v2).
- **Email Media Inserter** : (déjà livré au LOT 3) — image **ou** vidéo, upload **ou** URL, optimisation automatique via Supabase Storage.

