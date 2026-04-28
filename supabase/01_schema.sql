-- ============================================================
-- FITOGETHER - Schema complet
-- Supabase (PostgreSQL) - Version finale
-- ============================================================
-- Ce script recrée entièrement la base de données.
-- À exécuter dans le SQL Editor de Supabase.
-- ============================================================


-- ############################################################
-- PARTIE 0 : DROP complet (ordre inverse des dépendances)
-- ############################################################

-- Triggers
DROP TRIGGER IF EXISTS tr_utilisateur_updated_at ON utilisateur;
DROP TRIGGER IF EXISTS tr_participation_defi_updated_at ON participation_defi;
DROP TRIGGER IF EXISTS tr_amitie_updated_at ON amitie;
DROP TRIGGER IF EXISTS tr_message_conversation_activite ON message;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Tables (ordre inverse des FK)
DROP TABLE IF EXISTS commentaire CASCADE;
DROP TABLE IF EXISTS reaction CASCADE;
DROP TABLE IF EXISTS publication CASCADE;
DROP TABLE IF EXISTS historique_pas CASCADE;
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS entrainement CASCADE;
DROP TABLE IF EXISTS message CASCADE;
DROP TABLE IF EXISTS participe_conversation CASCADE;
DROP TABLE IF EXISTS conversation CASCADE;
DROP TABLE IF EXISTS amitie CASCADE;
DROP TABLE IF EXISTS vue_story CASCADE;
DROP TABLE IF EXISTS story CASCADE;
DROP TABLE IF EXISTS participation_defi CASCADE;
DROP TABLE IF EXISTS defi CASCADE;
DROP TABLE IF EXISTS badge_obtenu CASCADE;
DROP TABLE IF EXISTS badge CASCADE;
DROP TABLE IF EXISTS utilisateur CASCADE;

-- Fonctions
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_activite() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS creer_notification(UUID, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS nettoyer_stories_expirees() CASCADE;
DROP FUNCTION IF EXISTS compter_amis(UUID) CASCADE;


-- ############################################################
-- PARTIE 1 : Fonctions utilitaires
-- ############################################################

-- 1.1 Trigger : mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1.2 Trigger : maj derniere_activite de conversation à chaque message
CREATE OR REPLACE FUNCTION update_conversation_activite()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation
    SET derniere_activite = NEW.date_envoi
    WHERE id = NEW.id_conversation;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1.3 Trigger : création auto du profil utilisateur à l'inscription auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.utilisateur (id, pseudo, email, date_inscription)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'pseudo', split_part(NEW.email, '@', 1)),
        NEW.email,
        now()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.4 Fonction : créer une notification
CREATE OR REPLACE FUNCTION creer_notification(
    p_id_utilisateur UUID,
    p_type VARCHAR,
    p_message TEXT
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO notification (id_utilisateur, type, message)
    VALUES (p_id_utilisateur, p_type, p_message)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.5 Fonction : nettoyer les stories expirées et leurs vues
CREATE OR REPLACE FUNCTION nettoyer_stories_expirees()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM story WHERE expire_le < now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.6 Fonction : compter les amis acceptés d'un utilisateur
CREATE OR REPLACE FUNCTION compter_amis(p_id_utilisateur UUID)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM amitie
        WHERE statut = 'acceptee'
          AND (id_demandeur = p_id_utilisateur OR id_receveur = p_id_utilisateur)
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ############################################################
-- PARTIE 2 : Tables
-- ############################################################

-- ============================================================
-- 1. UTILISATEUR (profil lié à auth.users)
-- ============================================================
CREATE TABLE utilisateur (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pseudo VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    photo_profil VARCHAR(255),
    bio TEXT,
    date_inscription TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER tr_utilisateur_updated_at
    BEFORE UPDATE ON utilisateur
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger auth : création auto du profil à l'inscription
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. BADGE
-- ============================================================
CREATE TABLE badge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL UNIQUE,
    icone_url VARCHAR(255),
    description TEXT,
    condition_obtention TEXT
);

-- ============================================================
-- 3. BADGE_OBTENU
-- ============================================================
CREATE TABLE badge_obtenu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    id_badge UUID NOT NULL REFERENCES badge(id) ON DELETE CASCADE,
    date_obtention TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_utilisateur, id_badge)
);

-- ============================================================
-- 4. DEFI
-- ============================================================
CREATE TABLE defi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    titre VARCHAR(100) NOT NULL,
    photo_url VARCHAR(255),
    type_activite VARCHAR(50) NOT NULL,
    distance_cible_km DOUBLE PRECISION CHECK (distance_cible_km > 0),
    duree_cible TIME,
    description TEXT,
    date_creation TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. PARTICIPATION_DEFI
-- ============================================================
CREATE TABLE participation_defi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    id_defi UUID NOT NULL REFERENCES defi(id) ON DELETE CASCADE,
    progression DOUBLE PRECISION NOT NULL DEFAULT 0
        CHECK (progression >= 0 AND progression <= 100),
    statut VARCHAR(20) NOT NULL DEFAULT 'en_cours'
        CHECK (statut IN ('en_cours', 'termine', 'abandonne')),
    date_inscription TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_utilisateur, id_defi)
);

CREATE TRIGGER tr_participation_defi_updated_at
    BEFORE UPDATE ON participation_defi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. STORY
-- ============================================================
CREATE TABLE story (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    media_url VARCHAR(255) NOT NULL,
    duree_secondes INT CHECK (duree_secondes > 0),
    date_publication TIMESTAMPTZ NOT NULL DEFAULT now(),
    expire_le TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- ============================================================
-- 7. VUE_STORY
-- ============================================================
CREATE TABLE vue_story (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    id_story UUID NOT NULL REFERENCES story(id) ON DELETE CASCADE,
    date_vue TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_utilisateur, id_story)
);

-- ============================================================
-- 8. AMITIE (demandeur <-> receveur)
-- ============================================================
CREATE TABLE amitie (
    id_demandeur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    id_receveur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    statut VARCHAR(20) NOT NULL DEFAULT 'en_attente'
        CHECK (statut IN ('en_attente', 'acceptee', 'refusee', 'bloquee')),
    date_demande TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_demandeur, id_receveur),
    CHECK (id_demandeur <> id_receveur)
);

CREATE TRIGGER tr_amitie_updated_at
    BEFORE UPDATE ON amitie
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. CONVERSATION
-- ============================================================
CREATE TABLE conversation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
    derniere_activite TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. PARTICIPE_CONVERSATION
-- ============================================================
CREATE TABLE participe_conversation (
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    id_conversation UUID NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    PRIMARY KEY (id_utilisateur, id_conversation)
);

-- ============================================================
-- 11. MESSAGE
-- ============================================================
CREATE TABLE message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    id_conversation UUID NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    contenu TEXT NOT NULL,
    date_envoi TIMESTAMPTZ NOT NULL DEFAULT now(),
    est_lu BOOLEAN NOT NULL DEFAULT false
);

CREATE TRIGGER tr_message_conversation_activite
    AFTER INSERT ON message
    FOR EACH ROW EXECUTE FUNCTION update_conversation_activite();

-- ============================================================
-- 12. ENTRAINEMENT
-- ============================================================
CREATE TABLE entrainement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    categorie VARCHAR(50),
    nb_tours INT CHECK (nb_tours >= 0),
    nb_pas INT CHECK (nb_pas >= 0),
    distance_km DOUBLE PRECISION CHECK (distance_km >= 0),
    calories INT CHECK (calories >= 0),
    duree TIME,
    date_enregistrement TIMESTAMPTZ NOT NULL DEFAULT now(),
    type_activite VARCHAR(50) NOT NULL
);

-- ============================================================
-- 13. NOTIFICATION
-- ============================================================
CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT,
    est_lue BOOLEAN NOT NULL DEFAULT false,
    date_envoi TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. HISTORIQUE_PAS
-- ============================================================
CREATE TABLE historique_pas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    jour DATE NOT NULL,
    nb_pas INT NOT NULL DEFAULT 0 CHECK (nb_pas >= 0),
    calories INT NOT NULL DEFAULT 0 CHECK (calories >= 0),
    UNIQUE (id_utilisateur, jour)
);

-- ============================================================
-- 15. PUBLICATION
-- ============================================================
CREATE TABLE publication (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    id_entrainement UUID REFERENCES entrainement(id) ON DELETE SET NULL,
    id_publication_originale UUID REFERENCES publication(id) ON DELETE SET NULL,
    photo_url VARCHAR(255),
    description TEXT,
    date_publication TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 16. REACTION
-- ============================================================
CREATE TABLE reaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    id_publication UUID NOT NULL REFERENCES publication(id) ON DELETE CASCADE,
    type_reaction VARCHAR(20) NOT NULL DEFAULT 'like'
        CHECK (type_reaction IN ('like', 'bravo', 'force', 'feu')),
    date_reaction TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_utilisateur, id_publication)
);

-- ============================================================
-- 17. COMMENTAIRE
-- ============================================================
CREATE TABLE commentaire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_utilisateur UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    id_publication UUID NOT NULL REFERENCES publication(id) ON DELETE CASCADE,
    contenu TEXT NOT NULL,
    date_commentaire TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- PARTIE 3 : Index
-- ############################################################

CREATE INDEX idx_badge_obtenu_utilisateur ON badge_obtenu(id_utilisateur);
CREATE INDEX idx_badge_obtenu_badge ON badge_obtenu(id_badge);
CREATE INDEX idx_defi_utilisateur ON defi(id_utilisateur);
CREATE INDEX idx_defi_type_activite ON defi(type_activite);
CREATE INDEX idx_participation_defi_utilisateur ON participation_defi(id_utilisateur);
CREATE INDEX idx_participation_defi_defi ON participation_defi(id_defi);
CREATE INDEX idx_participation_defi_statut ON participation_defi(statut);
CREATE INDEX idx_story_utilisateur ON story(id_utilisateur);
CREATE INDEX idx_story_expire ON story(expire_le);
CREATE INDEX idx_vue_story_story ON vue_story(id_story);
CREATE INDEX idx_amitie_receveur ON amitie(id_receveur);
CREATE INDEX idx_amitie_statut ON amitie(statut);
CREATE INDEX idx_message_conversation ON message(id_conversation);
CREATE INDEX idx_message_utilisateur ON message(id_utilisateur);
CREATE INDEX idx_message_date ON message(date_envoi);
CREATE INDEX idx_entrainement_utilisateur ON entrainement(id_utilisateur);
CREATE INDEX idx_entrainement_date ON entrainement(date_enregistrement);
CREATE INDEX idx_entrainement_type ON entrainement(type_activite);
CREATE INDEX idx_notification_utilisateur ON notification(id_utilisateur);
CREATE INDEX idx_notification_lue ON notification(id_utilisateur, est_lue);
CREATE INDEX idx_historique_pas_utilisateur ON historique_pas(id_utilisateur);
CREATE INDEX idx_historique_pas_jour ON historique_pas(id_utilisateur, jour);
CREATE INDEX idx_publication_utilisateur ON publication(id_utilisateur);
CREATE INDEX idx_publication_date ON publication(date_publication);
CREATE INDEX idx_publication_entrainement ON publication(id_entrainement);
CREATE INDEX idx_reaction_publication ON reaction(id_publication);
CREATE INDEX idx_reaction_utilisateur ON reaction(id_utilisateur);
CREATE INDEX idx_commentaire_publication ON commentaire(id_publication);
CREATE INDEX idx_commentaire_utilisateur ON commentaire(id_utilisateur);


-- ############################################################
-- PARTIE 4 : Row Level Security (RLS) + Policies
-- ############################################################

ALTER TABLE utilisateur ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_obtenu ENABLE ROW LEVEL SECURITY;
ALTER TABLE defi ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation_defi ENABLE ROW LEVEL SECURITY;
ALTER TABLE story ENABLE ROW LEVEL SECURITY;
ALTER TABLE vue_story ENABLE ROW LEVEL SECURITY;
ALTER TABLE amitie ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE participe_conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrainement ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique_pas ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication ENABLE ROW LEVEL SECURITY;
ALTER TABLE reaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentaire ENABLE ROW LEVEL SECURITY;

-- ---- UTILISATEUR ----
CREATE POLICY "Profils visibles par tous les utilisateurs connectés"
    ON utilisateur FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Un utilisateur peut modifier son propre profil"
    ON utilisateur FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ---- BADGE ----
CREATE POLICY "Badges visibles par tous"
    ON badge FOR SELECT
    TO authenticated
    USING (true);

-- ---- BADGE_OBTENU ----
CREATE POLICY "Badges obtenus visibles par tous"
    ON badge_obtenu FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Badges attribués par le système"
    ON badge_obtenu FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

-- ---- DEFI ----
CREATE POLICY "Défis visibles par tous"
    ON defi FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Créer ses propres défis"
    ON defi FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

CREATE POLICY "Modifier ses propres défis"
    ON defi FOR UPDATE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

CREATE POLICY "Supprimer ses propres défis"
    ON defi FOR DELETE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

-- ---- PARTICIPATION_DEFI ----
CREATE POLICY "Participations visibles par tous"
    ON participation_defi FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Participer à un défi"
    ON participation_defi FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

CREATE POLICY "Modifier sa participation"
    ON participation_defi FOR UPDATE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

-- ---- STORY ----
CREATE POLICY "Stories visibles par tous"
    ON story FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Créer ses stories"
    ON story FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

CREATE POLICY "Supprimer ses stories"
    ON story FOR DELETE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

-- ---- VUE_STORY ----
CREATE POLICY "Voir qui a vu ses stories"
    ON vue_story FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id_utilisateur
        OR auth.uid() = (SELECT id_utilisateur FROM story WHERE id = id_story)
    );

CREATE POLICY "Enregistrer une vue de story"
    ON vue_story FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

-- ---- AMITIE ----
CREATE POLICY "Voir ses amitiés"
    ON amitie FOR SELECT
    TO authenticated
    USING (auth.uid() = id_demandeur OR auth.uid() = id_receveur);

CREATE POLICY "Envoyer une demande d'amitié"
    ON amitie FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_demandeur);

CREATE POLICY "Répondre à une demande d'amitié"
    ON amitie FOR UPDATE
    TO authenticated
    USING (auth.uid() = id_receveur);

CREATE POLICY "Supprimer une amitié"
    ON amitie FOR DELETE
    TO authenticated
    USING (auth.uid() = id_demandeur OR auth.uid() = id_receveur);

-- ---- CONVERSATION ----
CREATE POLICY "Voir ses conversations"
    ON conversation FOR SELECT
    TO authenticated
    USING (
        id IN (SELECT id_conversation FROM participe_conversation WHERE id_utilisateur = auth.uid())
    );

CREATE POLICY "Créer une conversation"
    ON conversation FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ---- PARTICIPE_CONVERSATION ----
CREATE POLICY "Voir les participants de ses conversations"
    ON participe_conversation FOR SELECT
    TO authenticated
    USING (
        id_conversation IN (SELECT id_conversation FROM participe_conversation pc WHERE pc.id_utilisateur = auth.uid())
    );

CREATE POLICY "Rejoindre une conversation"
    ON participe_conversation FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

-- ---- MESSAGE ----
CREATE POLICY "Voir les messages de ses conversations"
    ON message FOR SELECT
    TO authenticated
    USING (
        id_conversation IN (SELECT id_conversation FROM participe_conversation WHERE id_utilisateur = auth.uid())
    );

CREATE POLICY "Envoyer un message"
    ON message FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id_utilisateur
        AND id_conversation IN (SELECT id_conversation FROM participe_conversation WHERE id_utilisateur = auth.uid())
    );

CREATE POLICY "Marquer ses messages comme lus"
    ON message FOR UPDATE
    TO authenticated
    USING (
        id_conversation IN (SELECT id_conversation FROM participe_conversation WHERE id_utilisateur = auth.uid())
    );

-- ---- ENTRAINEMENT ----
CREATE POLICY "Entraînements visibles par tous"
    ON entrainement FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Créer ses entraînements"
    ON entrainement FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

CREATE POLICY "Modifier ses entraînements"
    ON entrainement FOR UPDATE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

CREATE POLICY "Supprimer ses entraînements"
    ON entrainement FOR DELETE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

-- ---- NOTIFICATION ----
CREATE POLICY "Voir ses notifications"
    ON notification FOR SELECT
    TO authenticated
    USING (auth.uid() = id_utilisateur);

CREATE POLICY "Marquer ses notifications comme lues"
    ON notification FOR UPDATE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

-- ---- HISTORIQUE_PAS ----
CREATE POLICY "Voir son historique de pas"
    ON historique_pas FOR SELECT
    TO authenticated
    USING (auth.uid() = id_utilisateur);

CREATE POLICY "Enregistrer ses pas"
    ON historique_pas FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

CREATE POLICY "Modifier son historique"
    ON historique_pas FOR UPDATE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

-- ---- PUBLICATION ----
CREATE POLICY "Publications visibles par tous"
    ON publication FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Créer ses publications"
    ON publication FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

CREATE POLICY "Modifier ses publications"
    ON publication FOR UPDATE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

CREATE POLICY "Supprimer ses publications"
    ON publication FOR DELETE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

-- ---- REACTION ----
CREATE POLICY "Réactions visibles par tous"
    ON reaction FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Réagir à une publication"
    ON reaction FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

CREATE POLICY "Modifier sa réaction"
    ON reaction FOR UPDATE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

CREATE POLICY "Supprimer sa réaction"
    ON reaction FOR DELETE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

-- ---- COMMENTAIRE ----
CREATE POLICY "Commentaires visibles par tous"
    ON commentaire FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Commenter une publication"
    ON commentaire FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id_utilisateur);

CREATE POLICY "Modifier son commentaire"
    ON commentaire FOR UPDATE
    TO authenticated
    USING (auth.uid() = id_utilisateur);

CREATE POLICY "Supprimer son commentaire"
    ON commentaire FOR DELETE
    TO authenticated
    USING (auth.uid() = id_utilisateur);
