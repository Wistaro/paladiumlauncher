<p align="center"><img src="https://paladium-pvp.fr/styles/ndzn/paladiumpvp/logo-sm.png" width="400px" height="225px" alt="paladium-pvp"></p>

<h1 align="center">Paladium Launcher</h1>

<p align="center">
  <img src="https://img.shields.io/badge/build-dev-red.svg?style=for-the-badge" alt="build">
  <img src="https://img.shields.io/badge/version-0.0.01-d4--dev-red.svg?style=for-the-badge" alt="version"> 
  <img src="https://img.shields.io/badge/dist-windows-blue.svg?style=for-the-badge"  height="28px" alt="distribution">
</p>

<p align="center">Paladium Launcher</p>

## Nouveauté

* ⚙️ En dev ♡＾▽＾♡

Toutes les nouveautés concernant les builds du launcher se font ici!

## Télécharger

#### Dernière Release
![](https://img.shields.io/badge/release-v0.0.01-d4-red.svg?style=flat-square)

#### Dernière Pre-Release
![](https://img.shields.io/badge/release-v0.0.01-d4-red.svg?style=flat-square)

**Plateformes supportées**

| Platform | File |
| -------- | ---- |
| Windows x64 | `paladiumlauncher-setup-VERSION.exe` |
| macOS | `non disponible (en cours)` |
| Linux x64 | `non disponible (en cours)` |

## Console

Pour ouvrir la console, utilisez le raccourci clavier suivant :

```console
ctrl + shift + i
```

## Développement

**Configuration requise**

* [Node.js][nodejs] v10.x.x

---

**Cloner et installer les dépendances**

```console
> git clone git@ssh.palagitium.dev:Master/launcher.git
> cd Launcher
> npm install
```

---

**Lancer l'application**

```console
> npm start
```

---

**Installateurs**

Build pour sa plateforme :

```console
> npm run dist
```

Build pour une plateforme spécifique :

| Platform    | Command              |
| ----------- | -------------------- |
| Windows x64 | `npm run dist:win`   |
| macOS       | `non disponible (en cours)`   |
| Linux x64   | `non disponible (en cours)` |

Builds for macOS may not work on Windows/Linux and vice-versa.

---
Copyright 2019 Paladium. All rights reserved.

[nodejs]: https://nodejs.org/en/ 'Node.js'
