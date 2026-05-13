import { supabase } from './supabase';

interface BadgeCondition {
  type: 'entrainements' | 'defis' | 'amis' | 'publications' | 'pas' | 'stories';
  count: number;
}

/**
 * Parse la condition_obtention d'un badge (format: "type:count", ex: "entrainements:5")
 */
const parseCondition = (condition: string): BadgeCondition | null => {
  const parts = condition.split(':');
  if (parts.length !== 2) return null;
  const type = parts[0] as BadgeCondition['type'];
  const count = parseInt(parts[1]);
  if (isNaN(count)) return null;
  return { type, count };
};

/**
 * Récupère les statistiques de l'utilisateur pour la vérification des badges
 */
const getUserStats = async (userId: string) => {
  const [entrainements, defis, amis, publications, stories] = await Promise.all([
    supabase.from('entrainement').select('*', { count: 'exact', head: true }).eq('id_utilisateur', userId),
    supabase.from('participation_defi').select('*', { count: 'exact', head: true }).eq('id_utilisateur', userId),
    supabase.from('amitie').select('*', { count: 'exact', head: true }).eq('statut', 'acceptee').or(`id_demandeur.eq.${userId},id_receveur.eq.${userId}`),
    supabase.from('publication').select('*', { count: 'exact', head: true }).eq('id_utilisateur', userId),
    supabase.from('story').select('*', { count: 'exact', head: true }).eq('id_utilisateur', userId)
  ]);

  return {
    entrainements: entrainements.count || 0,
    defis: defis.count || 0,
    amis: amis.count || 0,
    publications: publications.count || 0,
    pas: 0,
    stories: stories.count || 0
  };
};

/**
 * Vérifie et attribue automatiquement les badges à l'utilisateur
 * Retourne les nouveaux badges obtenus
 */
export const checkAndAwardBadges = async (userId: string): Promise<Array<{ nom: string; description: string }>> => {
  // Charger tous les badges disponibles
  const { data: allBadges } = await supabase
    .from('badge')
    .select('id, nom, description, condition_obtention');

  if (!allBadges || allBadges.length === 0) return [];

  // Charger les badges déjà obtenus
  const { data: obtainedBadges } = await supabase
    .from('badge_obtenu')
    .select('id_badge')
    .eq('id_utilisateur', userId);

  const obtainedIds = new Set((obtainedBadges || []).map((b: any) => b.id_badge));

  // Récupérer les stats
  const stats = await getUserStats(userId);

  const newBadges: Array<{ nom: string; description: string }> = [];

  for (const badge of allBadges) {
    // Skip si déjà obtenu
    if (obtainedIds.has(badge.id)) continue;

    const condition = parseCondition(badge.condition_obtention || '');
    if (!condition) continue;

    const userValue = stats[condition.type] || 0;

    if (userValue >= condition.count) {
      // Attribuer le badge
      const { error } = await supabase.from('badge_obtenu').insert({
        id_utilisateur: userId,
        id_badge: badge.id
      });

      if (!error) {
        newBadges.push({ nom: badge.nom, description: badge.description });

        // Créer une notification
        await supabase.from('notification').insert({
          id_utilisateur: userId,
          type: 'badge',
          message: `Nouveau badge obtenu : ${badge.nom} !`
        });
      }
    }
  }

  return newBadges;
};
