# Bitwarden Multi-Sync

Glissez-déposez des entrées entre deux coffres Bitwarden simultanément — depuis votre navigateur.

![Interface Vault Bridge](docs/design_handoff_vault_bridge/README.md)

## Pourquoi

L'interface officielle de Bitwarden ne permet pas de transférer des entrées entre deux comptes différents. Migrer vers un nouveau compte ou réorganiser entre un coffre perso et pro est une corvée manuelle. Ce projet règle ça avec une UI locale en drag & drop.

Cas d'usage typiques :
- Migration bitwarden.com → Vaultwarden self-hosted
- Réorganisation entre compte perso et compte pro
- Copie sélective de dossiers entre instances

## Fonctionnalités

- **Drag & drop** — glissez une entrée d'un coffre vers un dossier de l'autre
- **Ctrl+drag** — copie directe sans confirmation
- **Multi-sélect** — Ctrl+clic ou clic sur les cases ; barre d'action flottante
- **Copier / Déplacer** — popover de confirmation à chaque transfert
- **Recherche** — filtre live dans chaque coffre indépendamment
- **Cache client** — mise à jour optimiste, pas de rechargement complet
- **Deux méthodes d'auth** — API key (bypass 2FA) ou email/password
- **Sessions persistées** — tokens sauvegardés dans `~/.bw-multi-sync/sessions.json`
- **Thème dark/light** — bascule en haut à droite

## Prérequis

- Node.js ≥ 18
- Deux comptes Bitwarden (ou deux instances, ou le même des deux côtés pour réorganiser)

> **Note :** Le CLI Bitwarden 2026.x est incompatible avec Vaultwarden. Ce projet embarque `@bitwarden/cli@2024.12.0` comme dépendance locale — pas besoin d'installation globale.

## Installation

```bash
git clone https://github.com/yourname/bitwarden-multi-sync
cd bitwarden-multi-sync
npm install
npm start
```

Ouvrez [http://localhost:3333](http://localhost:3333).

## Utilisation

1. **Connectez le coffre gauche** — entrez l'URL du serveur, puis soit vos clés API (`clientId` + `clientSecret`) soit votre email/password.
2. **Connectez le coffre droit** — idem pour le second compte.
3. **Naviguez** — les dossiers et entrées s'affichent dans chaque colonne.
4. **Transférez** :
   - Glissez une entrée vers un dossier de l'autre côté
   - Choisissez **Copier** ou **Déplacer** dans le popover
   - Ou maintenez **Ctrl** pendant le drag pour copier directement

## Architecture

```
server.js          Express + bw CLI wrapper (sessions, transfer, vault CRUD)
public/
  app.js           UI : drag & drop, multi-select, cache optimiste
  style.css        Design system Vault Bridge (tokens CSS, dark/light)
  index.html       Shell HTML
~/.bw-multi-sync/
  sessions.json    Tokens chiffrés par vault (mode 0600)
  vault0/          BITWARDENCLI_APPDATA_DIR pour le coffre gauche
  vault1/          BITWARDENCLI_APPDATA_DIR pour le coffre droit
```

Chaque coffre tourne dans un répertoire isolé (`BITWARDENCLI_APPDATA_DIR`) pour éviter les conflits de sessions entre les deux instances du CLI.

## API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/status` | État des deux sessions |
| POST | `/api/auth/:vaultIndex` | Connexion (API key ou email/password) |
| POST | `/api/disconnect/:vaultIndex` | Déconnexion + nettoyage token |
| GET | `/api/vault/:vaultIndex` | Liste dossiers + entrées |
| POST | `/api/refresh/:vaultIndex` | Force sync vault |
| POST | `/api/transfer` | Copie ou déplace des entrées |
| POST | `/api/delete` | Supprime des entrées |

## Sécurité

- Le serveur écoute uniquement sur `localhost` (pas d'exposition réseau)
- Les sessions sont stockées avec permissions `0600`
- Les index de vault sont validés côté serveur (0 ou 1, rien d'autre)
- Les mots de passe passent par variable d'environnement (`--passwordenv`), jamais en argument CLI

## Limites connues

- **Pièces jointes** : non transférées automatiquement (le CLI Bitwarden ne le supporte pas en mode non-interactif)
- **Collections** : affichées mais le transfert de collections entre organisations n'est pas implémenté
- **Concurrent** : une seule session par coffre, pas de multi-utilisateur

## Licence

MIT
