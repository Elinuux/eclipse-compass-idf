# Eclipse Compass IDF

PWA mobile-first pour l’éclipse solaire du 12 août 2026 en Île-de-France.

## Fonctionnel dans cette version
- GPS haute précision sur HTTPS
- boussole iPhone via DeviceOrientation / webkitCompassHeading
- direction du Soleil : azimut + hauteur
- circonstances locales de l’éclipse
- maximum et compte à rebours
- météo Météo-France AROME/ARPEGE via Open-Meteo
- PWA / cache de secours
- saisie manuelle de coordonnées

## Sources
- Observatoire de Paris / ÉclipSEOP / IMCCE : référence scientifique
- Astronomy Engine 2.1.19 : calcul embarqué des circonstances locales et positions
- Météo-France AROME/ARPEGE via Open-Meteo
- OpenStreetMap / Nominatim

## Important
L’obscuration instantanée affichée dans ce MVP est une estimation temporelle entre les contacts et le maximum ; elle est explicitement signalée dans l’interface détaillée. Le maximum, les contacts, l’azimut et la hauteur sont calculés astronomiquement.

## iPhone
Le GPS et la boussole doivent être utilisés depuis une origine HTTPS, idéalement GitHub Pages, ouverte dans Safari.
