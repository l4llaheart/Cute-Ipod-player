# 📱 Comment obtenir ton APK Android (sans rien installer)

## Étape 1 — Créer un dépôt GitHub
1. Va sur https://github.com et connecte-toi (ou crée un compte, gratuit)
2. Clique sur **New repository** (bouton vert en haut à droite)
3. Donne-lui un nom, par exemple `ipod-player`
4. Laisse-le en **Public** ou **Private**, peu importe
5. Ne coche AUCUNE case (pas de README, pas de .gitignore), clique juste **Create repository**

## Étape 2 — Envoyer le projet sur GitHub
Sur ta page de dépôt fraîchement créée, GitHub te donne des commandes. Ouvre un terminal dans le dossier du projet (celui que je t'ai donné, dézippé) et tape :

```bash
git init
git add .
git commit -m "Premier envoi de l'app iPod"
git branch -M main
git remote add origin https://github.com/TON-NOM-UTILISATEUR/ipod-player.git
git push -u origin main
```

(remplace `TON-NOM-UTILISATEUR` par ton vrai nom d'utilisateur GitHub, et `ipod-player` par le nom que t'as choisi)

## Étape 3 — Laisser GitHub compiler l'app
1. Va sur ton dépôt sur GitHub.com
2. Clique sur l'onglet **Actions** en haut
3. Tu devrais voir "Build Android APK" en train de tourner (un petit rond jaune qui devient vert ✅ au bout de 3-5 minutes)
4. Clique dessus une fois terminé

## Étape 4 — Télécharger ton APK
1. Toujours dans l'onglet Actions, en bas de la page du build terminé, il y a une section **Artifacts**
2. Clique sur **ipod-player-apk** pour télécharger un fichier .zip
3. Dézippe-le, tu obtiens `app-debug.apk`

## Étape 5 — Installer sur ton téléphone Android
1. Envoie-toi le fichier `app-debug.apk` (par mail, Drive, Discord, peu importe)
2. Ouvre-le depuis ton téléphone
3. Android va te demander d'autoriser l'installation depuis une source inconnue → accepte (c'est normal, c'est pas sur le Play Store)
4. L'app s'installe comme une vraie app ! 🎉

## Pour mettre à jour l'app plus tard
Chaque fois que tu modifies `www/index.html`, `www/script.js` ou `www/style.css`, il suffit de refaire :
```bash
git add .
git commit -m "Mise à jour"
git push
```
Et GitHub recompile automatiquement un nouvel APK à récupérer dans Actions.

## Astuce : autoriser la lecture en arrière-plan
La première fois que tu lances l'app, Android va peut-être te demander la permission d'ignorer l'optimisation de batterie — **accepte-la**, sinon Android risque de couper la musique après quelques minutes en arrière-plan.
