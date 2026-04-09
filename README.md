# ExportCSV for Strava

![Node](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)

- Louis Prévost

Application web pour se connecter à Strava, consulter ses dernières activités et exporter les données d’une activité au format CSV.

## Fonctionnalités

- Connexion sécurisée avec Strava.
- Récupération des activités via l’API Strava.
- Export CSV avec métadonnées de l’activité.
- Enrichissement météo via Meteostat (si la clé API est configurée).
- Deux modes d’extraction :
	- par temps, avec un pas configurable en secondes,
	- par distance, avec un pas configurable en mètres.

## Utilisation

1. Ouvrir la page d’accueil.
2. Cliquer sur Connecter avec Strava.
3. Autoriser l’accès à votre compte.
4. Arriver sur le tableau de bord.
5. Choisir une activité.
6. Définir le mode d’export et les paramètres.
7. Copier ou télécharger le CSV.

## Sécurité et données

- Aucune donnée personnelle n’est persistée sur le serveur.
- Le token d’accès est conservé uniquement dans la session active.
- Les données sont traitées temporairement pour produire le CSV.
- Le site n’est pas affilié à Strava.

## Configuration météo

Ajouter une variable d’environnement `METEOSTAT_API_KEY` avec ta clé RapidAPI Meteostat pour activer les colonnes météo dans le CSV.
