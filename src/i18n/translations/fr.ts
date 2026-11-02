// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// French (Français) translation.
// Read docs/TRANSLATING.md first. src/i18n/en.ts lists every message, with
// notes on where each one appears.

import type {Translation} from '../catalogue.ts';

export default {
    // Page header and footer.
	'app.tagline': 'Répartition des points au Ragnarok pour Tokyo Debunker',
	'header.map': 'Map',
	// Read out for the language picker.
	'header.language': 'Langue',
	'footer.licence': 'Logiciel gratuit sous licence AGPL-3.0 ou version ultérieure.',
	// {link} is "footer.sourceLink", linking to the code.
	'footer.source': '{link}.',
	'footer.sourceLink': 'Code source',
	// {link} is "footer.licencesLink", linking to the licences of the code the
	// planner includes from others.
	'footer.licences': '{link}.',
	'footer.licencesLink': 'Licences tierces',
	'footer.disclaimer': 'Un outil fan-made pour Tokyo Debunkers, non affilié avec ZigZaGame Inc.',
	// {version} is the planner's release number, such as "1.0.0".
	'footer.version': 'Version {version}.',

	// The privacy notice, opened from the footer. It must stay true: see
	// "Privacy" in docs/PRIVACY.md before changing what the app stores or
	// where it is hosted. Messages sharing a paragraph are shown one after the
	// other, separated by a space.
	'privacy.title': 'Confidentialité',
	'privacy.summary': '**Aucun compte, cookie, publicité, analyse ou suivi.**',
	'privacy.summaryMore': 'Vos paramètres et plans restent sur votre appareil sauf si vous en partagez le lien.',
	// {name} is the person who runs the site.
	'privacy.operator': 'Ragnapax est un projet gratuit géré par {name}.',
	// Shown only where the site knows its source code. {link} is
	// "privacy.contactLink", linking to the project's issues.
	'privacy.contact': 'Pour des questions ou demandes à propos de vos données, {link}.',
	'privacy.contactLink': 'ouvrir un ticket sur GitHub',
	'privacy.onDevice':
		'**Sur votre appareil**, ce navigateur conserve les données concernant vos paramètres pour chaque map, vos choix tels que votre thème et langue ainsi qu\'une copie du planning pour qu\'il continue de fonctionner hors-ligne.',
	'privacy.deviceMore':
		'Ces données servent uniquement aux fonctionnalités que vous utilisez, ne quittent jamais votre appareil et sont supprimmables ci-dessous.',
	'privacy.links':
		'**Les liens partagés** contiennent les paramètres, le planning et les noms de guildes renseignés après le signe # dans l\'URL. Le navigateur n\'envoie aucune de ces données à un serveur.',
	'privacy.linksMore': 'Seule la personne à qui vous communiquez le lien et l\'application avec laquelle vous l\'envoyez peuvent les lire.',
	// True for GitHub Pages only: change it if the site is published elsewhere.
	'privacy.host':
		'**Hébergement :** GitHub Pages (GitHub, Inc., USA) héberge le site. Comme tout serveur web, il reçoit votre adresse IP et informations de navigateur.',
	'privacy.hostLogs':
		'GitHub enregistre ces adresses IP pour des raisons de sécurité nécessaires au bon fonctionnement du site (selon l\'intérêt légitime, Art. 6(1)(f) du RGPD).',
	// {link} is "privacy.hostLink", linking to GitHub's privacy statement.
	'privacy.hostMore': 'GitHub est certifié sous le Cadre de Protection des Données UE-États-Unis; en savoir plus sur {link}.',
	'privacy.hostLink': 'la politique de confidentialité de GitHub',
	// {link} is "privacy.hostRetentionLink", linking to that part of GitHub's
	// privacy statement. GitHub gives no fixed period.
	'privacy.hostRetention':
		'GitHub ne définit pas de période fixe de conservation de ces données: il les conserve aussi longtemps que la loi le requiert (voir {link}).',
	'privacy.hostRetentionLink': 'comment GitHub conserve les données',
	'privacy.rights':
		'**Vos droits :** selon le RGPD, vous pouvez demander l\'accès, la modifiction ou la suppression de vos données personnelles et vous opposez à leur utilisation.',
	'privacy.rightsMore':
		'Vous pouvez également faire une réclamation auprès de votre autorité de protection des données. Le planificateur ne collecte aucune donnée à propos de vous; les demandes concernant les logs du serveur sont donc à adresser à GitHub.',
	'privacy.forget': 'Supprimer les données',
	// Asked before deleting; the page then starts afresh.
	'privacy.forget.confirm':
		'Voulez-vous supprimer tous vos paramètres, plans et choix sauvegardés sur cet appareil ? Cette action est irréversible.',

	// Shown before the first plan. One person plans for the whole group and
	// shares the link; everyone else only opens it.
	'intro.name':
		'**Nommez les 4 guildes** dans votre groupe et indiquez pour chacune leurs villes de départ. Celles-ci apparaissent le mercredi matin, avant le début des déclarations à 11:00 (heure du serveur).',
	'intro.goal': '**Choisissez un objectif** : égalité des points ou égalité des récompenses.',
	'intro.plan':
		'**Étabtissez un plan équitable** et partagez le lien avec votre groue. Une seule personne gère le planning : tous les autres ouvrent le lien pour savoir quoi déclarer chaque jour.',
	'intro.private': 'Tout fonctionne sur votre appareil rien n\'est envoyé à un serveur.',

	// Opening a plan from someone else's link.
	'shared.intro':
		'Quelqu\'un a partagé ce plan avec vous. Choisissez votre guilde ci-dessous pour voir uniquement vos déclarations. Suivez ce plan plutôt que d\'en comemencer un nouveau, afin que chaque guilde travaille avec le même plan.',
	// The same card for the player's own plan, which puts the setup away.
	'planned.intro':
		'Votre plan est prêt. Partagez-le avec votre groupe :  les autres suivent votre lien au lieu d\'en commencer un nouveau. Le plan est verrouillé afin de le protéger des appuis accidentels.',
	'shared.edit': 'Modifier le plan',
	// Beside "shared.edit": starts a blank setup on the same map, for players
	// who plan for more than one group, such as for each of their guilds.
	'shared.another': 'Faire un plan pour un autre groupe',
	// Asked before "shared.another" clears the setup.
	'shared.another.confirm':
		'Commencer un nouveau plan pour un autre groupe ? Les noms de guildes, villes de départ, jours enregistrés et ce plan seront ; seuls votre  objectif et vos options restent. Partagez dabord ce plan si ce n\'est pas fait.',

	// Banner when a new version of the planner has replaced the one the page
	// was loaded from; the page cannot fetch the solver until it reloads.
	'update.ready': 'Une nouvelle version de Ragnapax est prête. Rafraîchissez votre page pour continuer.',
	'update.reload': 'Rafraîchir',

	// A share link that cannot be opened. The fallback sentence follows the problem.
	'link.damaged': 'Ce lien est défectueux. Demandez à ce qu\'il soit renvoyé.',
	'link.older': 'Ce lien provient d\'une version antérieure du planificateur Demandez-en un nouveau.',
	'link.newer': 'Ce lien provient d\'une version ultérieure du planificateur. Rafraîchissez pour mettre à jour.',
	'link.map': 'Ce lien est pour une map que le planificateur ne connaît pas encore.',
	'link.goal': 'Ce lien n\'a pas d\'objectif défini.',
	'link.towns': 'Les villes de départ de ce lien sont erronées.',
	'link.townRules': 'Les villes de départ de ce lien vont à l\'encontre des règles de la map.',
	'link.plan': 'Le plan de ce lien est erroné.',
	// {problem}: one of the "rule." messages below.
	'link.rules': 'Le plan de ce lien ne respecte pas les règles du Ragnarok : {problem}',
	'link.fallback': 'Votre dernière configuration est affichée à la place.',
	'link.dismiss': 'Fermer',

	// Names. {number} is 1 to 4: the guild's place in the list.
	'guild.default': 'Guilde {number}',
	'kingdom.vacant': 'Vide',

	// Maps and kingdoms. Use the game's own names where it translates them.
	'map.floating-city': 'La Cité Volante',
	'map.galaxy-terminal': 'Le Terminal Galactique',
	'map.sea-of-poseidon': 'La Mer de Poséïdon',
	// {letter}: the town's letter, A to Z.
	'town.name': 'Ville {letter}',
	// Short names are drawn inside the dorm's marker on small screens: keep
	// them to about 6 letters, or 3 Chinese, Japanese or Korean characters.
	'dorm.Dionysia': 'Dionysia',
	'dorm.Dionysia.short': 'Dio',
	'dorm.Vagastrom': 'Vagastrom',
	'dorm.Vagastrom.short': 'Vaga',
	'dorm.Frostheim': 'Frostheim',
	'dorm.Frostheim.short': 'Frost',
	'dorm.Hotarubi': 'Hotarubi',
	'dorm.Hotarubi.short': 'Hota',
	'dorm.Obscuary': 'Obscuary',
	'dorm.Obscuary.short': 'Obscu',
	'dorm.Mortkranken': 'Mortkranken',
	'dorm.Mortkranken.short': 'Mort',
	'dorm.Jabberwock': 'Jabberwock',
	'dorm.Jabberwock.short': 'Jabber',
	'dorm.Sinostra': 'Sinostra',
	'dorm.Sinostra.short': 'Sino',
	'castle.name': 'Château Darkwick',
	// Drawn inside the castle's marker: at most 6 letters, or 3 characters.
	'castle.short': 'Château',

	// Setting up starting towns.
	'setup.title': 'Villes de départ',
	'setup.help': {
		one: 'Choisissez une guilde, puis cliquez sur la ville avec laquelle elle commence la semaine.',
		other: 'Choisissez une guilde, puis cliquez sur les {count} villes avec lesquelles elle commence la semaine.',
	},
	// Instead of "setup.help" with "advanced.townLists" on.
	'setup.help.lists': {
		one: 'Choisissez la guilde avec laquelle chaque ville commence la semaine, {count} ville par semaine.',
		other: 'Choisissez la guilde avec laquelle chaque ville commence la semaine, {count} villes par semaine.',
	},
	'setup.clear': 'Réinitialiser',
	'setup.guilds': 'Guilde à laquelle attribuer des villes',
	// Instead of "setup.guilds" with "advanced.townLists" on, where the guild
	// rows only name the guilds and count their towns.
	'setup.guilds.lists': 'Guildes',
	'setup.assign': 'Attribuer des villes à {guild}',
	'setup.guildName': 'Nom de la guilde {number}',
	// Read out for the "3/4" next to each guild.
	'setup.townCount': '{count} sur {total} villes',
	'setup.map': 'Map {map}. Cliquez sur une ville pour l\'attribuer.',
	// With "advanced.townLists" on, instead of the map: a list of towns, each
	// named by "town.name" and followed by a list of guilds and "kingdom.vacant".
	'setup.towns': 'Villes de {map}',
	'setup.done': 'Tout est prêt.',
	// {kingdoms}: a list of towns, e.g. "Town Q" or "Town Q and Town R".
	'setup.vacant': {one: '{kingdoms} débute vide.', other: '{kingdoms} débutent vides.'},
	'setup.progress': '{count} sur {total} villes attribuées.',
	// Shown under the map (or the towns) once days are recorded as played (see "record.").
	'setup.locked':
		'Les villes de départ sont verrouillées tant que les jours sont marqués comme joués. Supprimez ces jours pour les modifier.',
	// Instead, while a plan is being found for these towns ("solve." messages)
	// and not yet confirmed the best, before any plan is found and after,
	// naming the button shown ("solve.cancel", then "solve.usePlan").
	'setup.lockedSearching':
		'Les villes de départ sont verrouillées tant que le meilleur plan n\'est pas confirmé. Annulez pour les modifier plus tôt.',
	'setup.lockedChecking':
		'Les villes de départ sont verrouillées tant que le meilleur plan n\'est pas confirmé. Utilisez ce plan pour les modifier plus tôt.',
	'setup.tooMany': {
		one: '{guild} a {count} ville en trop; cliquez sur l\'une d\'elles pour la supprimer.',
		other: '{guild} a {count} villes en trop; cliquez sur certaines d\'entre elles pour les supprimer.',
	},
	// Instead of "setup.tooMany" with "advanced.townLists" on.
	'setup.tooMany.lists': {
		one: '{guild} a {count} ville en trop; donnez une de ses villes à une autre guilde ou videz-la.',
		other: '{guild} a {count} villes en trop; donnez-en quelques unes aux autres guildes ou videz-les.',
	},

	// Choosing a goal.
	'goal.title': 'Objectif',
	'goal.help': {
		one: 'Du mercredi au lundi, jusqu\'à {count} déclaration par guilde et par jour.',
		other: 'Du mercredi au lundi, jusqu\'à {count} déclarations par guilde et par jour.',
	},
	'goal.points': 'Égalité des points',
	// {town}, {dorm}, {castle}: points a day for each, 1, 2 and 3.
	'goal.points.description':
		'Le score final de chaque guilde est le même, en répartissant les jours de Château et de dortoirs aussi équitablement que possible. Chaque jour, une ville vaut {town} point, un dortoir {dorm} et le château {castle}.',
	'goal.resources': 'Égalité des récompenses',
	'goal.resources.description':
		'Chaque guilde possède le Château, les dortoirs et les villes pendant le même nombre de jours.',
	'goal.fillMap': 'Occuper toute la map',
	// {guild}: the name of the first guild that plays (see "advanced.inactive").
	'goal.fillMap.description':
		'Occuper la map autant que possible, chaque jour. Les scores finaux peuvent varier légèrement; les excédents seront répartis aussi équitablement que possible, dont la majorité sera attribuée à {guild}.',
	// Instead of "goal.fillMap.description" once days are recorded as played:
	// the first guild may then be unable to get the most.
	'goal.fillMap.description.played':
		'Occuper la map autant que possible, chaque jour. Les scores finaux peuvent varier légèrement; les excédents seront répartis aussi équitablement que les jours passés le permettent.',
	// Under "goal.fillMap" while it is on, and in the title of a plan copied
	// as text.
	'goal.castleLast': 'Château supplémentaire pour la dernière guilde',
	// {first}, {last}: the names of the first and last guilds that play.
	'goal.castleLast.description':
		'Quand le château ne peut pas être partagé équitablement, les jours supplémentaires seront attribués à {last} au lieu de {first}. {first} conserve tout de même le plus de points.',

	// A disclosure under the goal's options, for choices few groups need.
	'advanced.title': 'Options avancées',
	// A switch, also in the title of a plan copied as text. While it is on,
	// the goals, "goal.fillMap" and "goal.castleLast" are disabled, and a
	// table follows: a row per guild, with its name, and a number field per
	// column, headed by "score.townShort", "score.dormShort" and
	// "score.castleShort".
	'advanced.targets': 'Choisir manuellement le nombre d\'occupations',
	'advanced.targets.description':
		'Choisissez le nombre de points que chaque guilde récupérera à partir des villes, dortoirs et château. Le plan final suivra ce choix autant que possible plutôt que l\'objectif. Les valeurs initiales sont identiques à celles de l\'objectif Égalité des récompenses.',
	// Read out for each number field. {kind} is "score.townLong",
	// "score.dormLong" or "score.castleLong"; {guild} is a guild's name.
	'advanced.targets.field': '{kind} for {guild}',
	// Under the table when the guilds' numbers for a kind add up to more days
	// than the map has. {kind} is "score.townLong", "score.dormLong" or
	// "score.castleLong"; {count} is their total, {most} the most possible:
	// every kingdom of the kind, every day.
	'advanced.targets.tooMany':
		'{kind} est égal à {count}, mais la map n\'en possède que {most} sur une semaine. Réduisez-les ou le plan ne fonctionnera pas.',
	// Puts every field back to what equal resources usually gives on the map.
	'advanced.targets.reset': 'Réinitialiser',
	// A switch per guild follows, named by the guild's name.
	'advanced.inactive': 'Guildes inactives',
	'advanced.inactive.description':
		'Le jeu peut mettre des guildes inactives dans votre groupe. Une guilde inactive ne fait pas de déclaration, personne ne déclare sur ses territoires et elle n\'est pas comptée dans le partage des points.',
	// Under the guild switches when every guild but one sits out, whose
	// switch is then disabled.
	'advanced.inactive.last': 'Au moins une guilde doit être active.',
	// A switch, also in the title of a plan copied as text.
	'advanced.fewestDays': 'Réduire le nombre de déclarations',
	'advanced.fewestDays.description':
		'Chaque guilde déclare le moins de jours différents possibles, afin que les joueurs aient à se connecter moins souvent. Cependant, cela peut augmenter le nombre total de déclarations. ',
	// A switch for how starting towns are set ("setup."): a list of towns,
	// each with a list of guilds to choose from, instead of tapping the map.
	'advanced.townLists': 'Attribuer les villes de départ à partir d\'une liste',
	'advanced.townLists.description':
		'Choisissez les villes de départ de chaque guilde depuis une liste, tel qu\'un tableur, plutôt que d\'appuyer sur la map ci-dessus. Ce paramètre ne fonctionnera que pour vous, sur votre appareil et ne pourra etre partagé par lien.',

	// "How plans are ranked", most important first.
	'ranking.title': 'Comment les plans sont classés',
	'ranking.total': 'Le plus grand nombre de points pour chaque guilde',
	'ranking.gap.points': 'Le plus petit écart de points entre les guildes',
	'ranking.gap.castle': 'Le plus petit écart de jours dechâteau entre les guildes',
	'ranking.gap.dormitory': 'Le plus petit écart de jours de dortoirs entre les guildes',
	'ranking.gap.town': 'Le plus petit écart de jours devilles entre les guildes',
	// Instead of the others above with "advanced.targets" on.
	'ranking.miss.castle': 'Nombre de jours de château le plus proche des paramètres d\'occupation pour chaque guilde',
	'ranking.miss.dormitory': 'Nombre de jours de dortoirs le plus proche des paramètres d\'occupation pour chaque guilde',
	'ranking.miss.town': 'Nombre de jours de villes le plus proche des paramètres pour chaque guilde',
	// Before "ranking.declarations" with "advanced.fewestDays" on.
	'ranking.days': 'Le moins de jours avec des déclarations par guilde',
	'ranking.declarations': 'Le moins de déclarations totales',
	'ranking.note': 'Si deux étapes sont à égalité, la suivante les départage.',

	// Finding a plan.
	'solve.find': 'Trouvez un plan équitable',
	'solve.again': 'Planifiez à nouveau',
	'solve.needsSetup': 'Attribuez à chaque guilde ses villes de départ.',
	// Above "solve.again" while the plan is up to date and proven the best,
	// so nobody plans again for nothing or forgets to change the setup first.
	'solve.alreadyBest':
		'Ce plan est déjà le plus équitable possible avec ces paramètres. Générer de nouveau le plan ne peut le rendre plus équitable : changez d\'abord les paramètres.',
	'solve.alreadyBest.targets':
		'Ce plan est déjà au plus proche des occupations souhaitées. Générer de nouveau le plan ne modifiera pas le résultat : changez d\'abord les paramètres.',
	'solve.alreadyBest.fillMap':
		'Ce plan occupe déjà la carte autant que possible, répartie aussi uniformément que possible. Générer de nouveau le plan ne modifiera pas le résultat : changez d\'abord les paramètres.',
	'solve.loading': 'Plan en cours de réalisation…',
	'solve.searching': 'À la recherche d\'un plan…',
	'solve.checking': 'Plan trouvé. Recherche de meilleure solution…',
	'solve.trimming': 'Meilleur plan confirmé. Réduction des déclarations…',
	// Time spent so far, e.g. "12s".
	'solve.elapsed': '{seconds}s',
	'solve.download': 'Le planificateur requiert un téléchargement unique de ~1.3 MB.',
	'solve.usePlan': 'Utiliser ce plan',
	'solve.cancel': 'Annuler',
	'solve.timeout': 'Aucun plan n\'a été trouvé à temps. Réessayez sur un appareil plus performant.',
	'solve.infeasible': 'Aucun plan ne peut être fait à partir de ces villes de départ.',
	'solve.unavailable': 'Le planificateur n\'a pas pu être téléchargé. Vérifiez votre connexion et réessayez.',
	// {detail}: a technical description, in English.
	'solve.error': 'Quelque chose s\'est mal passé: {detail}',
	// Read out when a plan is ready. {summary}: one of the "result." summaries,
	// such as "The fairest plan possible, with the fewest declares."
	'solve.done': 'Le plan est prêt. {summary}',

	// The plan.
	'result.title': 'Plan',
	// Badges next to the title, shown in capitals.
	'result.fairest': 'Le plus équitable',
	'result.best': 'Le meilleur',
	'result.bestFound': 'Meilleur résultat',
	'result.improving': 'Amélioration en cours à mesure que de meilleurs solutions sont trouvées…',
	'result.optimal': 'Le plan le plus équitable, avec le moins de déclarations.',
	'result.proven': 'Le plan le plus équitable, avec le maximum de points pour tout le monde.',
	'result.optimal.fillMap':
		'Occupe la plus grande partie de la map possible, répartie de manière aussi équitable que possible, avec le moins de déclarations totales.',
	'result.proven.fillMap': 'Occupe la plus grande partie de la map possible, répartie de manière aussi équitable que possible.',
	// Instead of "result.optimal" and "result.optimal.fillMap" with
	// "advanced.fewestDays" on.
	'result.optimal.fewestDays': 'Le plan le plus équitable possible, avec le moins de jours de déclarations.',
	'result.optimal.fillMap.fewestDays':
		'Occupe la plus grande partie de la map possible, répartie de manière aussi équitable que possible, avec le moins de jours de déclarations.',
	// Instead of "result.optimal" and "result.proven" with "advanced.targets" on.
	'result.optimal.targets':
		'Le plus proche des paramètres d\'occupation pour chaque guilde, avec le moins de déclarations.',
	'result.optimal.targets.fewestDays':
		'Le plus proche des paramètres d\'occupation pour chaque guilde, avec les déclarations sur le moins de jours.',
	'result.proven.targets': 'Le plus proche des paramètres d\'occupation pour chaque guilde.',
	'result.unproven': 'Le meilleur plan trouvé dans le temps imparti. Une meilleure solution peut exister.',
	// Under the title of a plan brought back from this device, such as after
	// a refresh or on the next visit.
	'result.saved': 'Votre plan enregistré, en accord avec les règles du Ragnarok.',
	'result.shared': 'Votre plan partagé, en accord avec les règles du Ragnarok.',
	'result.stale': 'Les paramètres ont changé après la création de ce plan. Il est donc obsolète.',
	'result.update': 'Mise à jour',
	// {problem}: one of the "rule." messages below.
	'result.broken': 'Ce plan ne respecte pas les règles du Ragnarok : {problem}',
	// A warning above the scores when the plan does not leave a guild sitting
	// out alone (see "advanced.inactive"), such as in a link edited by hand. It
	// breaks no rule. {day} is a weekday, {guild} and {rival} guild names.
	'result.sittingOutAttacked':
		'{day}: {guild} déclare {kingdom}, occupé par {rival}, qui est inactif. Les guildes inactives peuvent défendre leurs territoires lorsqu\'ils sont attaqués.',
	'result.sittingOutDeclares': '{day}: {guild} déclare {kingdom}, alors qu\'ils sont inactifs.',
	'result.share': 'Partager le plan',
	'result.copy': 'Copier en tant que texte',
	'result.copyDeclares': 'Copier les déclarations pour {guild}',
	// The copy buttons while a day after Wednesday is picked in "Day by day":
	// the text then leaves out the days before it. {day}: e.g. "Friday".
	'result.copyFrom': 'Copier en tant que texte à partir de {day}',
	'result.copyDeclaresFrom': 'Copier les déclarations pour {guild} à partir de {day}',
	// Under those buttons, saying how to copy every day instead.
	'result.copyFromHint':
		'Le texte commence {day}, le jour sélectionné ci-dessus. Choisissez mercredi, ou toute la semaine, pour pouvoir copier tous les jours.',
	// Title of the message when sharing through the phone's share menu.
	'result.shareTitle': 'Plan Ragnarok pour {map}',
	'result.linkCopied': 'Lien copié',
	'result.planCopied': 'Plan copié',
	'result.declaresCopied': 'Déclarations pour {guild} copiées',
	'result.planCopiedFrom': 'Plan à partir de {day} copié',
	'result.declaresCopiedFrom': 'Déclarations pour {guild} à partir de {day} copiées',
	// Shown when copying is blocked, above a box with the text to copy.
	'result.copyThis': 'Copier:',

	// Under the plan's summary once days are recorded as played. {day}: the
	// last day recorded, e.g. "Thursday".
	'result.played': 'Planifié à partir de {day} soir, en conservant ce qui est déjà passé.',

	// Recording how days actually went, to plan the rest of the week again.
	'record.title': 'Changements pendant la semaine',
	'record.help':
		'Si un jour ne s\'est pas déroulé comme prévu, enregistrez ce qu\'il s\'est passé, planifiez le reste de la semaine à partir de là et partagez le nouveau plan avec votre groupe.',
	// {days}: a list of weekdays, e.g. "Wednesday and Thursday".
	'record.recorded': 'Passés : {days}.',
	// {day}: a weekday, e.g. "Thursday".
	'record.start': 'Enregistrer {day}',
	'record.forget': 'Supprimer {day}',
	'record.replan': 'Planifier le reste de la semaine',
	// Before a list of weekdays: the days up to the one picked went exactly
	// as planned and can be saved together, so only a day that didn't needs
	// recording by hand.
	'record.until': 'Plan suivi jusqu\'à {day}',
	// {day}: the weekday picked after "record.until", e.g. "Friday".
	'record.asPlanned': 'Conserver le plan jusqu\'à {day}',
	'record.editHelp':
		'{day} s\'est déroulé comme prévu. Choisissez une guilde, puis cliquez sur chacun de ses territoires occupés à la fin de la journée. Cliquez à nouveau pour annuler.',
	'record.guilds': 'Guilde à qui donner des territoires',
	'record.assign': 'Attribuer des territoires à {guild}',
	'record.map': 'Map {map} à la fin de {day}. Appouyez sur un territoire pour modifier son occupant.',
	// {problem}: one of the "rule." messages below.
	'record.broken': 'Cette situation n\'est pas possible : {problem}',
	'record.save': 'Sauvegarder {day}',
	'record.cancel': 'Annuler',

	// Scores.
	'score.points': {
		one: 'Chaque guilde a marqué **{count} point**.',
		other: 'Chaque guilde a marqué **{count} points**.',
	},
	// {towns}, {dorms}, {castle}: the "score.days" messages below.
	'score.holdings': 'Chaque guilde **garde ses territoires**: {towns}, {dorms} and {castle}.',
	'score.townDays': {one: '{count} jour de ville', other: '{count} jours de ville'},
	'score.dormDays': {one: '{count} jour de dortoir', other: '{count} jours de dortoir'},
	'score.castleDays': {one: '{count} jour de château', other: '{count} jours de château'},
	// {extras}: a list of "score.extra", e.g. "Night Owls +2, Bears +1".
	'score.fillPoints': {
		one: 'Chaque guilde marque au moins **{count} point**, avec la carte entièrement utilisée. Extra: {extras}.',
		other:
			'Chaque guilde marque au moins **{count} points**, avec la carte entièrement utilisée. Extra: {extras}.',
	},
	'score.extra': '{guild} +{count}',
	// When the shares are not even and the map is not fully used, as after a
	// day played off-plan or a plan stopped early: the table has the details.
	'score.pointsUneven': 'Les scores des guildes varient entre **{least}** et **{most}** points.',
	'score.holdingsUneven': 'Les territoires diffèrent entre les guildes; le tableau montre ceux de chaque guilde.',
	// With "advanced.targets" on, when every guild that plays holds exactly
	// what was set for it, and otherwise, where {count} is the days by which
	// holdings differ from those set, over or under, in all.
	'score.targets': 'Chaque guilde obtient ses **paramètres d\'occupation**.',
	'score.targetsMissed': {
		one: 'Les occupations sont faussées de **{count} jour** par rapport à celles définies; le tableau montre cette différence sous chaque chiffre.',
		other: 'Les occupations sont faussées de **{count} jours** par rapport à celles définies; le tableau montre cette différence sous chaque chiffre.',
	},
	// Under a number in the table that differs from the one set, with
	// "advanced.targets" on: {count} is the number set.
	'score.target': 'set {count}',
	'score.fillResources':
		'La map a été entièrement répartie et les occupations ont été aussi équitables que possible. Les excédents sont distribués de façon à ce que le total des points reste le plus proche possible.',
	// Table headings: a short word, and its meaning when tapped or hovered.
	'score.guild': 'Guilde',
	'score.pointsShort': 'Pts',
	'score.pointsLong': 'Points',
	'score.townShort': 'Ville',
	'score.townLong': 'Jours de ville',
	'score.dormShort': 'Dortoir',
	'score.dormLong': 'Jours de dortoir',
	'score.castleShort': 'Château',
	'score.castleLong': 'Jours de château',
	'score.declaresShort': 'Déclas',
	'score.declaresLong': 'Déclarations totales durant le Ragnarok',
	// Under the name of a guild sitting out (see "advanced.inactive"), whose
	// numbers are left out of the headline.
	'score.inactive': 'Inactif',

	// Day-by-day replay and the whole week's list. Weekday names need no
	// translation: see `weekday`.
	// Switch between the map a day at a time and every day's declares in a list.
	'days.view': 'View',
	'days.byDay': 'Jour par jour',
	'days.week': 'Semaine complète',
	'days.focus': 'Voir les déclarations pour',
	'days.all': 'Toutes les guildes',
	'days.tabs': 'Jour',
	'days.previous': 'Jour précédent',
	'days.next': 'Jour suivant',
	// Tab before Wednesday, for the starting position.
	'days.start': 'Début',
	'days.startTitle': 'Position de départ',
	'days.mapStart': '{map} au départ',
	'days.mapEnd': '{map} à la fin de {day}',
	'days.startNote': 'Position de départ. Choisissez un jour pour savoir qui déclare quoi.',
	// {today}: points earned that day; {total}: points so far.
	'days.points': '+{today} · {total} pts',
	'days.pointsTitle': 'Points gagnés ce jour, et total actuel',
	// A capture from another guild; {guild} is drawn with the guild's colour.
	'days.from': 'à {guild}',
	'days.none': 'Pas de déclaration',
	// On a day recorded as played (see "record.").
	'days.played': 'Passé : voici le résumé.',
	// Tags by a weekday in the whole week's list: today by the device's
	// calendar, and days recorded as played.
	'days.today': 'Aujourd\'hui',
	'days.playedTag': 'Passé',

	// Read out for each kingdom on the map; {owner} is a guild or "Vacant".
	'marker.owner': '{kingdom}, {owner}',
	'marker.captured': '{kingdom}, {owner}, capturé aujourd\'hui',
	// Read out for a name shown shortened, such as "Wed (Wednesday)" or "Vaga
	// (Vagastrom)": what is on screen first, so people who control the page by
	// voice can say it, then the name in full.
	'label.shortened': '{short} ({full})',
	// Read out on entering a map whose kingdoms can be tapped.
	'map.keys': 'Déplacez vous entre les territoires grâce aux flèches.',

	// Theme switch.
	'theme.title': 'Mode',
	'theme.system': 'Correspondre au mode de l\'appareil',
	'theme.light': 'Mode Jour',
	'theme.dark': 'Mode Nuit',

	// A plan as text for game or Discord chat.
	'text.declaresFor': 'Déclarations pour {guild}',
	// Under the title when the days before {day} are left out, e.g. "From Friday on".
	'text.since': 'À partir de {day}',
	'text.moves': '{guild} : {moves}',
	'text.from': '{kingdom} (from {guild})',
	'text.none': 'Pas de déclaration',
	// {guilds}: the guilds sitting out (see "advanced.inactive"), e.g. "Bears, Owls".
	'text.inactive': 'Inactifs : {guilds}',
	// {scores}: each guild's "text.score", separated by " · ".
	'text.points': 'Points : {scores}',
	'text.score': '{guild} {points}',
	// Between kingdoms in a list, e.g. "Vagastrom, Dionysia".
	'list.separator': ', ',

	// Rules a plan can break. {day} is a weekday, {guild} and {rival} guild names.
	'rule.days': {
		one: 'Le plan compte {count} jour au lieu de {days}.',
		other: 'Le plan compte {count} jours au lieu de {days}.',
	},
	'rule.guilds': '{day} : déclarations pour des guildes inconnues.',
	'rule.limit': {
		one: '{day}: {guild} a {count} déclaration. Le maximum autorisé est de (max {max}).',
		other: '{day}: {guild} a {count} déclarations. Le maximum autorisé est de (max {max}).',
	},
	'rule.unknown': '{day}: {guild} a déclaré un territoire inconnu.',
	'rule.held': '{day}: La guilde {guild} a déclaré {kingdom} alors qu\'elle l\'occupe déjà.',
	'rule.adjacent': '{day}: {guild} a déclaré {kingdom} sans y avoir accès.',
	'rule.twice': '{day}: {guild} a déclaré {kingdom} deux fois.',
	// {rival} declared first, then {guild}.
	'rule.contested': '{day}: {rival} et {guild} ont tous les deux déclaré {kingdom}.',
} satisfies Translation;
