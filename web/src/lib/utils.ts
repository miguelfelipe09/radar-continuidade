import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}

/** Par de cores de cada estado. Índigo nunca entra aqui: ele é marca, não
 *  qualificador de dado. */
export const CORES_ESTADO = {
  alta: 'bg-alta-bg text-alta-fg',
  moderada: 'bg-moderada-bg text-moderada-fg',
  normal: 'bg-normal-bg text-normal-fg',
  queda: 'bg-queda-bg text-queda-fg',
  ausente: 'bg-ausente-bg text-ausente-fg',
} as const;

export type Estado = keyof typeof CORES_ESTADO;

export const ROTULO_ESTADO: Record<Estado, string> = {
  alta: 'Alta',
  moderada: 'Moderada',
  normal: 'Normal',
  queda: 'Queda',
  ausente: 'Ausente',
};
