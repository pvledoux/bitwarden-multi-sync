# Handoff : Vault Bridge — transfert d'entrées entre deux coffres Bitwarden

## Overview
Application web locale (Node.js + front vanilla) qui affiche **deux coffres Bitwarden côte à côte** et permet de transférer des entrées de l'un vers l'autre par **drag & drop** ou par **sélection multiple + bouton**. Ce handoff couvre le redesign complet de l'UI : recherche par coffre, sélection multiple, drag & drop déplacer/copier, popover de confirmation, indicateur de synchronisation et thème sombre/clair.

## À propos des fichiers de design
Le fichier joint (`Vault Transfer.dc.html`) est une **référence de design en HTML** : un prototype interactif qui montre l'apparence et le comportement visés. **Ce n'est pas du code de production à copier tel quel.**

⚠️ Le prototype est écrit avec un petit runtime composant interne (React-like, balises `<x-dc>` / `<sc-for>` / `<sc-if>`, classe `DCLogic`). **Ne reprends pas ce runtime.** La cible imposée par le projet est :

- **Zéro dépendance front** — JavaScript / CSS vanilla uniquement.
- **Trois fichiers** : `index.html`, `app.js`, `style.css`.
- **Desktop uniquement**, pas de responsive mobile.
- Les données viennent d'une **API REST locale** (pas de framework réactif).

Ta tâche : **recréer fidèlement ce design en vanilla JS/CSS**, en t'inspirant du prototype pour le pixel-perfect (couleurs, espacements, typo, interactions) mais en réimplémentant la logique avec des écouteurs DOM natifs et l'API Drag & Drop HTML5.

## Fidelity
**High-fidelity (hifi).** Couleurs, typographie, espacements et interactions sont définitifs. Reproduis l'UI au pixel près. Les valeurs exactes sont dans la section *Design Tokens*.

---

## Architecture cible suggérée (vanilla)

```
index.html      # structure : header, 2 colonnes coffre, gabarits (templates) cachés, conteneurs popover/toast/pastille
style.css       # variables CSS (thèmes), layout, composants, états hover/focus/drop
app.js          # fetch API, rendu des listes, recherche, sélection, drag&drop, popover, sync
```

- Définis les **tokens en variables CSS** sur `:root` (thème sombre) et `:root[data-theme="light"]` (thème clair). Le toggle change l'attribut `data-theme` sur `<html>`.
- Garde un **cache client** des coffres en mémoire (objet JS). Charge une fois via l'API, puis mets à jour **incrémentalement** après chaque transfert (pas de refetch complet) ; bouton refresh = refetch manuel.
- Rends les listes en JS à partir du cache (clone de `<template>` ou `innerHTML` maîtrisé). Re-render ciblé après recherche / sélection / transfert.

---

## Modèle de données (par entrée)

```js
{
  id: "e1",
  type: "login" | "note" | "card" | "identity",
  name: "GitHub",            // nom (gras)
  username: "octave@me.com", // identifiant
  url: "github.com",         // n'afficher QUE le domaine (strip https:// et www.)
  created: "12 mars 2024",   // date de création
  attach: false              // pièce jointe -> badge trombone
}
```
Structure : `vault { id, name, folders[ { id, name, entries[] } ] }`. Deux coffres : `v1` "Coffre Personnel", `v2` "Coffre Équipe".

---

## Écrans / Vues

Le prototype contient **2 vues** basculables par un segmented control dans le header (`Transfert` / `Design System`). **Seule la vue `Transfert` est l'application à livrer.** La vue `Design System` est une planche de specs pour toi (référence visuelle des composants) — pas à implémenter dans le produit.

### Vue principale — « Transfert »

**Layout général** (flex column, `min-height:100vh`) :
1. **Header** (hauteur `62px`, `border-bottom:1px solid var(--border)`, `background:var(--surface)`) : logo bouclier + titre « Vault Bridge » / sous-titre, segmented control de vue, spacer flex, badge de sync + bouton refresh, bouton toggle thème.
2. **Workspace** : `display:grid; grid-template-columns:1fr 1fr`. Deux `<section>` coffre. Bordure verticale `1px solid var(--border)` entre les deux (sur la colonne gauche). Pastille ronde « ⇄ » (42px) centrée absolument au-dessus de la gouttière (`pointer-events:none`).

**Structure d'une colonne coffre** (flex column) :
- **En-tête coffre** (padding `18px 22px 14px`) : icône cube 30px (fond `--surface3`, couleur `--accent`) + nom (700, 15px) + meta `« N dossiers · N entrées »` (11.5px, `--faint`).
- **Barre de recherche** (voir composant).
- **Zone scrollable** (`flex:1; overflow-y:auto; padding:0 16px 90px`) contenant les dossiers et leurs entrées, ou un état vide.
- **Toolbar de sélection** flottante (voir composant), `position:absolute; left:18px; right:18px; bottom:18px`, visible seulement si ≥1 entrée sélectionnée dans ce coffre.

---

## Composants (specs hifi)

### 1. Item card (carte d'entrée) — 2 lignes
Ligne flex, `gap:11px`, `padding:7px 9px` (compact) / `11px 9px` (confortable), `border-radius:10px`, `cursor:grab`, `draggable="true"`.

De gauche à droite :
- **Checkbox** 18×18, `border-radius:5px`. Masquée par défaut (`opacity:0`), **apparaît au hover de la ligne** (`opacity:1`). Non cochée : `1.5px solid var(--faint)`, fond transparent. Cochée : fond `var(--accent)`, icône check blanche, toujours visible.
- **Type chip** 34×34, `border-radius:9px`, fond/bordure/couleur teintés selon le type (voir tokens type), icône SVG du type 17px à l'intérieur.
- **Bloc texte** (`flex:1; min-width:0`) :
  - Ligne 1 : **nom** (600, 13px, `--text`, ellipsis) + badge pièce jointe si `attach` (icône trombone 11px, couleur `--warning`, fond `--warningSoft`, `border-radius:5px`, `padding:1px 5px`).
  - Ligne 2 : **meta** en mono `IBM Plex Mono` 11px `--faint`, ellipsis. Format : `username  ·  domaine` (séparateur ` · `). Si aucun : `—`.
- **Date** (10.5px, `--faint`, `white-space:nowrap`) alignée à droite.

États :
- **Défaut** : fond transparent.
- **Survol** : `background:var(--surface2)`, checkbox révélée.
- **Sélectionné** : `background:var(--accentSoft)`, `box-shadow:inset 0 0 0 1px var(--accent)`, checkbox remplie.

### 2. Dossier (folder)
Conteneur `border-radius:12px; padding:2px; margin-bottom:4px`.
- **Header** cliquable (`padding:9px 10px`, `border-radius:8px`, hover `background:var(--surface2)`) : chevron (14px, `--faint`, **rotation 90° quand ouvert**, transition `.15s`) + nom (600, 12.5px) + (label de drop si cible) + **compteur** (pill `--surface3`, 11px, 600, `padding:1px 7px`, `border-radius:20px`).
- **Corps** : liste d'item cards, `display:flex; flex-direction:column; gap:3px; padding:2px 0 8px`. Masqué quand replié.
- Repli par défaut : ouvert. Le repli est mémorisé par dossier.

### 3. Drop zone (cible de dépôt)
Quand on survole un dossier valide en drag (coffre **opposé** uniquement), le conteneur du dossier s'illumine :
- **Mode déplacer** : `background:var(--accentSoft)`, `box-shadow:inset 0 0 0 2px var(--accent)`, label `« Déplacer ici »` (10px, 700, uppercase, `--accent`) dans le header.
- **Mode copier** (Ctrl/Cmd maintenu) : `background:var(--copySoft)`, anneau `var(--copy)`, label `« Copier ici »` couleur `--copy`.
- Un dossier du **même** coffre que la source n'est jamais une cible (`dropEffect:'none'`).

### 4. Search bar
`height:40px; padding:0 13px; border-radius:10px; background:var(--surface2); border:1px solid var(--border); gap:9px`. Icône loupe 15px `--faint` + input transparent (13px). Au focus (`:focus-within`) : `border-color:var(--accent); box-shadow:0 0 0 3px var(--accentSoft)`. Bouton clear (✕) à droite quand non vide.
**Comportement** : filtre en temps réel sur `name`, `username`, `url` (insensible à la casse). Les dossiers contenant ≥1 résultat **restent ouverts** ; les dossiers sans résultat sont **masqués**. Si 0 résultat dans le coffre → état vide (loupe + « Aucun résultat »).

### 5. Selection toolbar
Barre flottante, `padding:10px 12px 10px 16px`, `background:var(--toolbar)` (semi-transparent + `backdrop-filter:blur(10px)`), `border:1px solid var(--accent)`, `border-radius:13px`, ombre portée, animation d'entrée (slide-up `.18s`).
Contenu : pastille compteur (26px carré, fond `--accent`, blanc, 800) + label `« N entrée(s) sélectionnée(s) »` + bouton texte `« Désélectionner »` + bouton plein `« Transférer vers [autre coffre] → »` (fond `--accent`, blanc, 700, `padding:9px 14px`, `border-radius:9px`).

### 6. Pastille de glisser (drag pill)
Élément `position:fixed` qui **suit le curseur** pendant le drag (`left:x+14; top:y+12`, `pointer-events:none`, `z-index:80`). Contenu : icône grip + `« N entrée(s) »` + badge `MOVE`/`COPY`.
- Déplacer : fond `var(--accent)`. Copier : fond `var(--copy)`.
- Badge : `font-size:9.5px; font-weight:800; letter-spacing:.08em; padding:2px 6px; border-radius:5px; background:rgba(255,255,255,.18-.22)`.
> Astuce d'implémentation : masquer l'image de drag native (`setDragImage` avec un GIF transparent 1×1) et dessiner soi-même la pastille, position mise à jour sur l'évènement `drag`.

### 7. Popover de confirmation
Carte `position:fixed` ancrée au point de dépôt (ou sous le bouton transfert), **non bloquante** (clic extérieur = fermer), `width:290px; padding:16px; border-radius:15px; background:var(--surface); border:1px solid var(--border)`, grosse ombre, animation pop `.16s`.
Contenu :
- Header : icône ⇄ (chip `--accentSoft`/`--accent`) + titre `« N entrée(s) à transférer »` + sous-titre `« Destination — [coffre › dossier] »` + bouton ✕.
- **Si pièce jointe** dans la sélection : bandeau warning (`background:var(--warningSoft)`, icône alerte, texte « Contient des pièces jointes — elles seront transférées aussi. »).
- Deux boutons : **Copier** (outline `--copy`, fond `--copySoft`) et **Déplacer** (plein `--accent`).
- Note de bas : « Astuce — maintiens **Ctrl** pendant le glisser pour copier directement ».
> La popover n'apparaît **que si l'utilisateur n'a pas utilisé Ctrl**. Avec Ctrl (drag ou non), le transfert est une copie directe, sans popover.

### 8. Toast
`position:fixed; bottom:28px; left:50%`, `background:var(--toastBg); color:var(--toastFg)`, icône check verte + message. Auto-disparaît après ~2.6 s. Messages : `« N entrée(s) déplacée(s)/copiée(s) vers [coffre] »`, `« Coffres synchronisés »`.

### 9. Indicateur de sync (header)
Pastille verte + texte relatif (`« Sync à l'instant »`, `« Sync il y a X min »`, `« … il y a X h »`) recalculé périodiquement. Bouton refresh (icône flèches circulaires) qui **tourne** pendant la synchro (`animation: spin .85s linear infinite`), puis remet la dernière sync à maintenant + toast.

### 10. Toggle thème (header)
Bouton 38px qui bascule sombre ⇄ clair (icône soleil/lune). Change `data-theme` sur `<html>`.

---

## Interactions & comportement

- **Clic simple sur une entrée** : la sélectionne seule (vide la sélection du coffre + celle de l'autre coffre). Re-clic sur la même seule entrée → désélectionne.
- **Ctrl/Cmd/Shift + clic** ou **clic sur la checkbox** : ajoute/retire de la sélection (toggle), vide l'autre coffre.
- **Une seule sélection active à la fois** : sélectionner dans un coffre vide la sélection de l'autre.
- **Drag** : si on drague une entrée non sélectionnée, elle devient la sélection. Drag de toute la sélection courante. `Ctrl/Cmd` pendant le drag = mode copie (réévalué en continu via `e.ctrlKey` sur `dragover`).
- **Drop** sur un dossier du coffre opposé : si Ctrl → copie directe + toast ; sinon → ouvre la popover de confirmation au point de dépôt.
- **Bouton « Transférer »** : ouvre la popover, destination = premier dossier du coffre opposé (à ajuster selon ta logique métier).
- **Move** = retirer de la source + ajouter à la destination. **Copy** = dupliquer dans la destination (nouvel id) en gardant la source.
- Après transfert : maj du cache, sync = maintenant, toast, sélection source vidée.
- **Recherche** : filtrage temps réel par coffre (voir composant Search bar).

### Animations / transitions
- Chevron dossier : `transform .15s`.
- Item card fond : `transition: background .12s`.
- Checkbox : `transition: opacity .12s`.
- Drop zone : `transition: all .15s`.
- Toolbar : slide-up `.18s ease`. Popover/pastille : pop `.12–.16s`. Toast : `.22s`. Refresh : `spin .85s linear infinite`.

## State management (vanilla)
Variables d'état à tenir en mémoire dans `app.js` :
- `theme` ('dark' | 'light')
- `vaults` (cache des données, source de vérité, muté incrémentalement)
- `query` ({ v1, v2 } chaînes de recherche)
- `closed` (map folderId → bool, dossiers repliés)
- `sel` ({ v1:[ids], v2:[ids] }, une seule liste non vide à la fois)
- `drag` (null | { vaultId, ids[], copy, x, y })
- `dropTarget` (folderId courant survolé en drag)
- `pop` (null | { x, y, srcVault, destVault, destFolder, destName, ids, count, attach })
- `lastSync` (timestamp), `syncing` (bool)

### API REST locale (à câbler)
Le prototype utilise des données en dur. À remplacer par :
- `GET /api/vaults` → charge les deux coffres (au démarrage + refresh).
- `POST /api/transfer` body `{ ids, fromVault, toVault, toFolder, mode: 'move'|'copy' }` → exécute le transfert côté serveur, puis maj du cache client (optimiste ou après réponse).

---

## Design Tokens

### Couleurs — thème sombre (`:root`)
| Token | Hex |
|---|---|
| `--bg` | `#0e1320` |
| `--surface` | `#151b2c` |
| `--surface2` | `#1b2236` |
| `--surface3` | `#242d45` |
| `--border` | `#2b3450` |
| `--borderSoft` | `#222a40` |
| `--text` | `#e9edf7` |
| `--dim` | `#9aa4c2` |
| `--faint` | `#646e8e` |
| `--accent` | `#5b8def` |
| `--accentSoft` | `rgba(91,141,239,.20)` |
| `--emerald` | `#2fd6a6` |
| `--emeraldSoft` | `rgba(47,214,166,.22)` |
| `--copy` | `#b48bff` |
| `--copySoft` | `rgba(180,139,255,.16)` |
| `--danger` | `#f0566d` |
| `--warning` | `#f5a623` |
| `--warningSoft` | `rgba(245,166,35,.16)` |
| `--toolbar` | `rgba(21,27,44,.92)` |
| `--toastBg` | `#1b2236` |
| `--toastFg` | `#e9edf7` |

### Couleurs — thème clair (`:root[data-theme="light"]`)
| Token | Hex |
|---|---|
| `--bg` | `#eceff5` |
| `--surface` | `#ffffff` |
| `--surface2` | `#f4f6fb` |
| `--surface3` | `#e8ecf5` |
| `--border` | `#d8dde9` |
| `--borderSoft` | `#e6eaf3` |
| `--text` | `#161d33` |
| `--dim` | `#5a6680` |
| `--faint` | `#97a0b8` |
| `--accent` | `#3a6df0` |
| `--accentSoft` | `rgba(58,109,240,.14)` |
| `--emerald` | `#0fae82` |
| `--emeraldSoft` | `rgba(15,174,130,.14)` |
| `--copy` | `#7c54ec` |
| `--copySoft` | `rgba(124,84,236,.10)` |
| `--danger` | `#e23d57` |
| `--warning` | `#c47e00` |
| `--warningSoft` | `rgba(196,126,0,.12)` |
| `--toolbar` | `rgba(255,255,255,.92)` |
| `--toastBg` | `#161d33` |
| `--toastFg` | `#ffffff` |

### Couleurs par type d'entrée (identiques sur les 2 thèmes)
| Type | Couleur (fg) | Fond | Bordure |
|---|---|---|---|
| login | `#5b8def` | `rgba(91,141,239,.16)` | `rgba(91,141,239,.30)` |
| note | `#f5a623` | `rgba(245,166,35,.16)` | `rgba(245,166,35,.30)` |
| card | `#2fd6a6` | `rgba(47,214,166,.16)` | `rgba(47,214,166,.30)` |
| identity | `#b48bff` | `rgba(180,139,255,.16)` | `rgba(180,139,255,.30)` |

### Typographie
- **Interface** : `Public Sans` (Google Fonts), poids 400 / 500 / 600 / 700 / 800. Base 14px, `letter-spacing:-0.01em`, `line-height:1.4`.
- **Identifiants & URL** : `IBM Plex Mono`, 400 / 500.
- Échelle utilisée : 30px (titre system), 15px (titres coffre/marque), 13px (nom entrée, boutons), 12.5px (nom dossier), 11–11.5px (meta, captions), 10–10.5px (dates, labels uppercase).

### Border radius
`5px` (checkbox, badges), `7–8px` (boutons header, chips), `9px` (chip type, logo, boutons popover), `10px` (item card, search, pastille), `12px` (conteneur dossier), `13px` (toolbar), `15px` (popover), `20px`/`50%` (pills, pastille ronde).

### Ombres
- Boutons accent : `0 4px 14px var(--accentSoft)`.
- Toolbar : `0 14px 36px -10px rgba(0,0,0,.5)`.
- Popover : `0 22px 60px -14px rgba(0,0,0,.55)`.
- Pastille drag : `0 10px 28px -6px rgba(0,0,0,.6)`.
- Toast : `0 12px 34px -8px rgba(0,0,0,.5)`.

## Assets
- **Polices** : Public Sans + IBM Plex Mono via Google Fonts.
- **Icônes** : SVG stroke maison (style « feather », `viewBox 0 0 24 24`, `fill:none; stroke:currentColor; stroke-width:2; stroke-linecap/linejoin:round`). Aucune emoji. Icônes nécessaires : key (login), file-text (note), credit-card (card), user (identity), paperclip, search, refresh, arrow-right, swap (⇄), copy, move, check, x, chevron, sun, moon, alert-triangle, check-circle, grip, box, shield. Les tracés `d` exacts sont dans la map `P` de la méthode `icon()` du fichier de référence — copie-les tels quels.

## Files
- `Vault Transfer.dc.html` — prototype de référence hifi (header + 2 coffres + tous les états + planche Design System). Ouvre-le dans un navigateur pour voir les interactions. **Reproduire en vanilla**, ne pas reprendre le runtime `<x-dc>`.
- Les tracés d'icônes, les données d'exemple (`buildData()`), la logique de recherche (`matchEntry`), de transfert (`execTransfer`) et de sélection sont lisibles directement dans le `<script>` du fichier — utilise-les comme spec de comportement.
