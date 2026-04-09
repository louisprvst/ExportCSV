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
- Données météo via Meteostat (température, vitesse du vent, condition).
- Trois modes d'extraction :
	- **Laps** : par laps Strava,
	- **Temps** : par pas de temps configurable en secondes,
	- **Distance** : par pas de distance configurable en mètres.

## Utilisation

1. Ouvrir la page d’accueil.
2. Cliquer sur Connecter avec Strava.
3. Autoriser l’accès à vos activités.
4. Arriver sur le tableau de bord.
5. Choisir une activité.
6. Définir le mode d’export et les paramètres.
7. Copier ou télécharger le CSV.

## Sécurité et données

- Aucune donnée personnelle n’est conservée sur le serveur.
- Le token d’accès est conservé uniquement dans la session active.
- Les données sont traitées temporairement pour produire le CSV.
- Le site n’est pas affilié à Strava.