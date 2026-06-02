import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { supabase } from '@/services/supabase';

const CURRENT_VERSION_KEY = 'app_current_version';

/**
 * Notifie le plugin que l'app a bien démarré (empêche le rollback automatique).
 * Doit être appelé dans les 10 premières secondes après le lancement.
 */
export async function notifyReady(): Promise<void> {
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch {
    // Ignore en mode web / dev
  }
}

/**
 * Vérifie si une mise à jour est disponible et l'applique.
 * Retourne true si une mise à jour a été trouvée et appliquée (l'app va redémarrer).
 */
export async function checkForUpdate(): Promise<boolean> {
  try {
    const currentVersion = localStorage.getItem(CURRENT_VERSION_KEY) || '0.0.0';

    const { data, error } = await supabase
      .from('app_version')
      .select('version, url')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return false;

    if (data.version === currentVersion) return false;

    // Nouvelle version disponible — télécharger
    const bundle = await CapacitorUpdater.download({
      url: data.url,
      version: data.version
    });

    // Sauvegarder la version avant de recharger
    localStorage.setItem(CURRENT_VERSION_KEY, data.version);

    // Appliquer la mise à jour (redémarre l'app)
    await CapacitorUpdater.set(bundle);

    return true;
  } catch {
    // Silencieux en cas d'erreur (pas de réseau, mode web, etc.)
    return false;
  }
}
