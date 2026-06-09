import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { supabase } from '@/services/supabase';

const CURRENT_VERSION_KEY = 'app_current_version';
const PENDING_VERSION_KEY = 'app_pending_version';

/**
 * Notifie le plugin que l'app a bien démarré (empêche le rollback automatique).
 * Confirme aussi la version en cours dans localStorage.
 */
export async function notifyReady(): Promise<void> {
  try {
    await CapacitorUpdater.notifyAppReady();

    // Confirmer la version pendante comme version courante
    const pending = localStorage.getItem(PENDING_VERSION_KEY);
    if (pending) {
      localStorage.setItem(CURRENT_VERSION_KEY, pending);
      localStorage.removeItem(PENDING_VERSION_KEY);
    }
  } catch {
    // En mode web/dev, nettoyer les versions pour forcer la vérification
    localStorage.removeItem(PENDING_VERSION_KEY);
  }
}

/**
 * Vérifie si une mise à jour est disponible et l'applique.
 * Retourne true si une mise à jour a été trouvée et appliquée (l'app va redémarrer).
 */
export async function checkForUpdate(): Promise<boolean> {
  try {
    const currentVersion = localStorage.getItem(CURRENT_VERSION_KEY) || '0.0.0';

    // Si une version pendante existe mais n'a pas été confirmée, c'est un rollback
    const pending = localStorage.getItem(PENDING_VERSION_KEY);
    if (pending) {
      localStorage.removeItem(PENDING_VERSION_KEY);
    }

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

    // Sauvegarder comme version pendante (sera confirmée par notifyReady au prochain démarrage)
    localStorage.setItem(PENDING_VERSION_KEY, data.version);

    // Appliquer la mise à jour (redémarre l'app)
    await CapacitorUpdater.set(bundle);

    return true;
  } catch {
    // Nettoyer la version pendante en cas d'erreur
    localStorage.removeItem(PENDING_VERSION_KEY);
    return false;
  }
}
