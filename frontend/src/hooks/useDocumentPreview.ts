/* Ce hook charge des données au montage : `load` n'écrit l'état qu'APRÈS le
   premier await (la requête réseau). Même neutralisation ciblée que les autres
   hooks de chargement — voir useOfficeUsers.ts. */
/* oxlint-disable react/set-state-in-effect */
import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';

/** Ce que l'aperçu sait rendre. `unsupported` n'est pas une erreur : c'est une réponse. */
export type PreviewKind = 'pdf' | 'image' | 'text' | 'unsupported';

export interface DocumentPreviewState {
  loading: boolean;
  error: string | null;
  kind: PreviewKind;
  /** URL objet (blob:) pour un PDF ou une image — jamais l'URL du stockage. */
  url: string | null;
  /** Contenu déjà décodé pour un fichier texte. */
  text: string | null;
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tif', 'tiff'];
const TEXT_EXTENSIONS = ['txt', 'csv', 'md', 'xml', 'htm', 'html'];

/** Au-delà, on n'affiche pas : un texte de plusieurs mégaoctets fige l'onglet. */
const MAX_TEXT_BYTES = 512 * 1024;

export function previewKindOf(fileName: string): PreviewKind {
  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
  if (ext === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  return 'unsupported';
}

/**
 * Charge le contenu d'un document pour l'afficher dans l'application.
 *
 * Le fichier transite par un blob et une URL objet, pas par l'URL du stockage :
 * MinIO répond en http, l'application est en https, et le navigateur bloquerait
 * le contenu mixte. L'URL objet est révoquée dès que le document change ou que
 * le composant disparaît — sans quoi chaque pièce consultée resterait en mémoire
 * jusqu'au rechargement de l'onglet.
 *
 * Rien n'est demandé au serveur pour un format non prévisualisable : inutile de
 * télécharger 40 Mo de .zip pour afficher « aperçu indisponible ».
 */
export function useDocumentPreview(
  dataroomId: number | null,
  documentId: number | null,
  fileName: string | null,
): DocumentPreviewState {
  const kind = fileName ? previewKindOf(fileName) : 'unsupported';
  const enabled = dataroomId !== null && documentId !== null && kind !== 'unsupported';

  const [state, setState] = useState<DocumentPreviewState>({
    loading: false, error: null, kind, url: null, text: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, error: null, kind, url: null, text: null });
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;
    setState({ loading: true, error: null, kind, url: null, text: null });

    void (async () => {
      try {
        const blob = await api.documentContent(dataroomId, documentId, controller.signal);
        if (controller.signal.aborted) return;

        if (kind === 'text') {
          if (blob.size > MAX_TEXT_BYTES) {
            setState({
              loading: false,
              error: 'Fichier trop volumineux pour être affiché ici.',
              kind, url: null, text: null,
            });
            return;
          }
          const text = await blob.text();
          if (controller.signal.aborted) return;
          setState({ loading: false, error: null, kind, url: null, text });
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setState({ loading: false, error: null, kind, url: objectUrl, text: null });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Aperçu indisponible',
          kind, url: null, text: null,
        });
      }
    })();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dataroomId, documentId, kind, enabled]);

  return state;
}
