# Plan de refonte UI/UX MiPROJET — Écosystème v2.0

## Contexte
Refonte complète du portail public + réorganisation de la navigation et du Hub Administratif.
**Aucun changement DB / API / auth / permissions** — uniquement UI/UX + ajout de pages.

## Ce qui a été fait (UI, déjà branché)
- ✅ Nouvelle Navigation (Écosystème / Solutions / Opportunités / Investisseurs & Partenaires / Actualités / Connexion)
- ✅ Nouveau Hero centré sur les 3 solutions (Go / + / Invest)
- ✅ Nouvelle section Solutions `EcosystemSolutions.tsx` (Trois solutions. Une vision.)
- ✅ Nouvelles pages publiques :
  - `/ecosystem` — Vision, mission, impact, parcours
  - `/partners` — Investisseurs, institutions financières, partenaires stratégiques
  - `/solutions/miprojet-go` — Application terrain (orange)
  - `/solutions/miprojet-invest` — Investissement (vert)
  - `/miprojet-plus` (existant, conservé)
- ✅ Nouvelle Homepage réordonnée : Hero → Solutions → Impact → Opportunités → Projets → Partenaires → Actualités → CTA
- ✅ AdminSidebar réorganisé en modules :
  Hub Admin • MiPROJET Go • MiPROJET+ • MiPROJET Invest • Communication • Opportunités • Partenariats • Finances • Contenu • Administration

## SQL — aucun changement requis pour cette refonte
Cette version n'introduit **aucune migration**. Toutes les tables existantes (projects, opportunities, tenders, leads, users, subscriptions, etc.) restent inchangées et alimentent les nouvelles pages automatiquement.

## Optionnel (à exécuter si tu veux tracer les nouvelles pages)
```sql
-- Aucun SQL obligatoire.
-- Si tu veux tracker les nouvelles URLs comme sources de leads/analytics,
-- rien à faire : lead_source enregistre déjà l'URL entrante côté frontend.
```

## Prochaines étapes possibles (à ta demande)
1. Retirer les liens vers les pages métier obsolètes du portail (submit-project, services/*, incubation, ebook) — actuellement conservés fonctionnels mais dé-référencés du menu principal.
2. Ajouter les logos définitifs quand tu les fournis (MiPROJET Go, MiPROJET+, MiPROJET Invest).
3. Extraire vision/mission/impact en pages dédiées si besoin (actuellement en sections ancrées sur `/ecosystem`).

**Aucune action SQL nécessaire — tout est déjà branché.**
