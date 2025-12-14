// Liste des routes publiques (non protégées)
const publicRoutes = [
  '/login',
  // Ajouter d'autres routes publiques si nécessaire
];

// Vérifie si une route est publique
export const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some(route =>
    pathname === route ||
    pathname.startsWith(route) ||
    pathname.startsWith(`${route}/`)
  ) || pathname === '/';
};