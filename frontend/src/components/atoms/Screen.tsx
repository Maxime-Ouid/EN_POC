import type { ReactNode } from 'react';

export interface ScreenProps {
  children?: ReactNode;
}

// Conteneur d'un écran principal — `<section class="screen is-active">`. Un seul
// écran est monté à la fois côté React (le prototype, lui, les gardait tous dans
// le DOM et jouait sur .is-active).
export function Screen({ children }: ScreenProps) {
  return <section className="screen is-active">{children}</section>;
}
