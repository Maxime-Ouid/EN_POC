import { useContext } from 'react';
import { TenantThemeContext, type TenantThemeContextValue } from './context';

// Accès au moteur de personnalisation depuis n'importe quel composant monté
// sous <ThemeProvider>.
export function useTenantTheme(): TenantThemeContextValue {
  const ctx = useContext(TenantThemeContext);
  if (!ctx) {
    throw new Error('useTenantTheme doit être appelé sous un <ThemeProvider>.');
  }
  return ctx;
}
