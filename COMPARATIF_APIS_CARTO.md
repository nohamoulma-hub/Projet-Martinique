# Comparatif des API de cartographie

Document de décision, rédigé le 17 septembre 2026. Les tarifs et conditions de ces
services changent souvent : **vérifier les sources en fin de page avant de s'engager.**

## Le besoin

Le catalogue propose un filtre « Par commune » avec un rayon de recherche. Aujourd'hui, la
distance est calculée à vol d'oiseau, dans `backend/app/services/communes_service.py`.

C'est imprécis en Martinique, où le relief impose de longs détours. Le cas le plus parlant :
Grand'Rivière et Le Prêcheur sont à une dizaine de kilomètres l'un de l'autre à vol d'oiseau,
mais aucune route ne les relie. Il faut contourner l'île par la côte atlantique.

Objectif : remplacer la distance à vol d'oiseau par une distance et une durée par la route.
Besoins éventuels plus tard : une carte interactive (prévue en v2) et des données de lieux
pour les restaurants et logements.

**Volume de calcul.** 34 communes x 24 activités = **816 trajets**. Ce nombre ne bouge qu'à
l'ajout d'activités. Les distances peuvent donc être calculées une fois et conservées, plutôt
que recalculées à chaque visite.

## Le tableau

| Critère | Google Maps Platform | OpenRouteService | IGN Géoplateforme |
|---|---|---|---|
| **Éditeur** | Google | HeiGIT, institut de recherche allemand | IGN, établissement public français |
| **Données routières** | Google | OpenStreetMap | BD TOPO de l'IGN |
| **Couverture Martinique** | oui | oui | oui, DOM inclus explicitement |
| **Coût** | 5 $ / 1 000 appels pour le calcul d'itinéraire, 10 000 appels offerts par mois | gratuit dans les quotas | gratuit |
| **Quotas** | au-delà du gratuit, facturation à l'appel | environ 2 500 requêtes/jour et 40 000/mois (à confirmer) | 5 requêtes/seconde par adresse IP |
| **Clé d'API** | oui, avec carte bancaire | oui, gratuite | non requise pour le calcul d'itinéraire |
| **Conservation des résultats** | **interdite au-delà de 30 jours** | autorisée, avec attribution | autorisée, licence Etalab par défaut |
| **Carte interactive** | oui, 7 $ / 1 000 chargements, 10 000 offerts | non, service de calcul uniquement | oui, fonds de carte |
| **Données de lieux** (horaires, avis) | oui, Places API | non | non |

## Le point décisif : la conservation des résultats

C'est ce critère, et non le prix, qui tranche pour ce projet.

Les conditions de Google (section 3.2.3) interdisent de stocker ou mettre en cache le contenu
renvoyé, **sauf pendant moins de 30 jours consécutifs**, et uniquement pour des raisons de
performance. Seuls les identifiants de lieux (« place ID ») peuvent être conservés
indéfiniment.

Or la solution naturelle ici est justement de calculer les 816 trajets une fois et de les
garder en base. Avec Google, il faudrait soit tout recalculer chaque mois, soit interroger
l'API à chaque visite. OpenRouteService et l'IGN n'imposent pas cette contrainte.

## Le coût réel, si on choisissait Google

Le calcul des 816 trajets tient dans très peu de requêtes, et le quota gratuit de 10 000
événements par mois suffirait probablement, même en recalculant tout tous les mois.

**Attention cependant :** la page de tarifs annonce un prix « par 1 000 appels », mais
Google facture historiquement la matrice d'itinéraires **par trajet calculé**, pas par
requête. Si c'est le cas, un recalcul complet consomme 816 événements au lieu de quelques
unités. Cela reste dans le quota gratuit, mais l'écart est important à vérifier avant de
s'engager.

À noter aussi : le crédit universel de 200 $ par mois, souvent cité dans les articles de blog,
**a été supprimé en mars 2025**. Chaque service a désormais son propre quota gratuit, et ces
quotas ne se cumulent pas.

## Recommandation

**Pour le calcul de distance : IGN Géoplateforme.**

- Gratuit, sans clé d'API ni carte bancaire, donc aucune surprise de facturation.
- Couvre explicitement les DOM, avec les données routières de l'IGN, adaptées au territoire
  français.
- Les résultats peuvent être conservés en base, ce qui correspond exactement à notre usage.
- Service public français : pas de risque de changement de tarification du jour au lendemain.

**Solution de repli : OpenRouteService**, qui repose sur OpenStreetMap, déjà utilisé dans le
projet pour les informations des rhumeries. Sa matrice accepte jusqu'à 50 origines par
50 destinations en une requête : nos 816 trajets tiendraient dans un seul appel. Il demande
une clé gratuite et l'affichage d'une attribution.

**Google reste pertinent pour deux usages futurs**, mais pas pour celui-ci :

- **Places API**, si on ajoute les restaurants et les logements. Sa base de lieux est bien plus
  fournie qu'OpenStreetMap sur les horaires et les avis.
- **Maps JavaScript API**, pour la carte interactive, si les fonds IGN ne conviennent pas.

## Comment l'intégrer, le moment venu

1. **Un script de calcul**, dans `backend/scripts/`, qui interroge l'API et enregistre les
   distances. À relancer après un ajout d'activité, comme `seed.py`.
2. **Une table** `commune_distances` (commune, activité, distance, durée), donc une migration
   Alembic.
3. **Un seul point de changement dans le code** : `communes_service.py`. Les routes et le
   frontend ne changeraient presque pas, puisque le format de réponse resterait le même.
4. **La distance à vol d'oiseau reste le mode de secours**, si un trajet manque en base.
5. **Aucune clé côté navigateur.** Si un service en demande une, elle vit dans `.env`, et
   seul le backend appelle l'API.
6. **Pas de nouvelle librairie** pour le calcul : `httpx` est déjà installé. La carte
   interactive en demanderait une, par exemple Leaflet, à décider séparément.

## Ce qui reste à vérifier

- Le mode de facturation exact de la matrice Google : par requête ou par trajet.
- Les quotas d'OpenRouteService : la valeur citée vient d'une source secondaire, la page
  officielle des offres n'ayant pas pu être lue automatiquement.
- La qualité du réseau routier de la BD TOPO en Martinique, à tester sur quelques trajets
  connus avant de s'engager.
- L'existence d'un quota journalier chez l'IGN, au-delà des 5 requêtes par seconde.

## Sources

- [Tarifs Google Maps Platform](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Suppression du crédit mensuel de 200 $](https://developers.google.com/maps/billing-and-pricing/faq)
- [Conditions de service Google Maps Platform](https://cloud.google.com/maps-platform/terms/maps-service-terms)
- [Règles de mise en cache de Google](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Calcul d'itinéraire IGN Géoplateforme](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-itineraire/)
- [Conditions générales cartes.gouv.fr](https://cartes.gouv.fr/cgu/)
- [Restrictions techniques OpenRouteService](https://openrouteservice.org/restrictions/)
- [Offres OpenRouteService](https://account.heigit.org/info/plans)
