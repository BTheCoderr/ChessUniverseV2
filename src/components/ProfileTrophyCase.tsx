import { useEffect, useMemo, useState } from "react";
import { BATTLE_FORMATIONS } from "../lib/battleChess";
import { supabase } from "../lib/supabase";

type ShowcaseReward = {
  rewardKey: string;
  name: string;
  category: "mode" | "formation" | "badge" | "title";
  description: string;
  requirementCopy: string;
  unlockedAt: string | null;
};

type Showcase = {
  profile: {
    id: string;
    username: string;
    rating: number;
    wins: number;
    losses: number;
    draws: number;
  };
  battleStats: {
    user_id: string;
    rating: number;
    wins: number;
    losses: number;
    draws: number;
    games_played: number;
  };
  favoriteFormation: {
    formation_key: string;
    wins: number;
    losses: number;
    draws: number;
    games_played: number;
  } | null;
  rewards: ShowcaseReward[];
  championshipWins: number;
};

function formationName(key: string | null | undefined) {
  if (!key) return "—";
  return BATTLE_FORMATIONS.find((formation) => formation.key === key)?.name ?? key;
}

function rewardIcon(rewardKey: string) {
  if (rewardKey === "champion_crown") return "♛";
  if (rewardKey === "championship_crest") return "♜";
  if (rewardKey === "universe_master_title") return "✦";
  if (rewardKey === "season_contender") return "◆";
  if (rewardKey === "season_challenger") return "◇";
  if (rewardKey === "battle_chess") return "⚔";
  if (rewardKey === "back_rank_lab") return "♞";
  return "•";
}

function winRate(wins: number, games: number) {
  return games > 0 ? Math.round((wins / games) * 100) : 0;
}

export function ProfileTrophyCase({
  userId,
  compact = false,
}: {
  userId: string;
  compact?: boolean;
}) {
  const client = supabase;
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!client || !userId) return;

    let cancelled = false;
    setLoading(true);
    setMessage("");

    void client.functions
      .invoke("online-game", {
        body: { action: "profile_showcase", userId },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.showcase) {
          setShowcase(null);
          setMessage(error?.message ?? "Unable to load Trophy Case.");
          return;
        }

        setShowcase(data.showcase as Showcase);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, userId]);

  const featuredRewards = useMemo(() => {
    if (!showcase) return [];
    const priority = [
      "champion_crown",
      "universe_master_title",
      "championship_crest",
      "season_contender",
      "season_challenger",
      "battle_chess",
      "back_rank_lab",
    ];
    return [...showcase.rewards].sort(
      (a, b) => priority.indexOf(a.rewardKey) - priority.indexOf(b.rewardKey)
    );
  }, [showcase]);

  if (loading) {
    return (
      <section className={compact ? "trophy-case compact" : "trophy-case"}>
        <div className="section-heading">
          <div>
            <strong>Trophy Case</strong>
            <span>Loading progression…</span>
          </div>
        </div>
      </section>
    );
  }

  if (!showcase) {
    return message ? <p className="form-message">{message}</p> : null;
  }

  const battle = showcase.battleStats;
  const favorite = showcase.favoriteFormation;

  return (
    <section className={compact ? "trophy-case compact" : "trophy-case"}>
      <div className="section-heading trophy-case-heading">
        <div>
          <strong>Trophy Case</strong>
          <span>Permanent Chess Universe progression.</span>
        </div>
        {showcase.championshipWins > 0 ? (
          <span className="champion-count">♛ {showcase.championshipWins} Championship{showcase.championshipWins === 1 ? "" : "s"}</span>
        ) : null}
      </div>

      <div className="trophy-battle-summary">
        <div><strong>{battle.rating}</strong><span>Battle Elo</span></div>
        <div><strong>{battle.wins}-{battle.losses}-{battle.draws}</strong><span>Battle W-L-D</span></div>
        <div><strong>{battle.games_played}</strong><span>Battle games</span></div>
        <div><strong>{winRate(battle.wins, battle.games_played)}%</strong><span>Battle win rate</span></div>
        <div><strong>{formationName(favorite?.formation_key)}</strong><span>Favorite formation</span></div>
      </div>

      {favorite ? (
        <div className="favorite-formation-line">
          <span>Most used formation</span>
          <strong>{formationName(favorite.formation_key)}</strong>
          <small>{favorite.wins}-{favorite.losses}-{favorite.draws} · {favorite.games_played} battles</small>
        </div>
      ) : null}

      <div className="trophy-grid">
        {featuredRewards.length === 0 ? (
          <div className="empty-trophy-case">
            <span>♙</span>
            <div>
              <strong>No trophies yet</strong>
              <small>Rated wins, Season progress, Championships and rating milestones fill this case.</small>
            </div>
          </div>
        ) : (
          featuredRewards.map((reward) => (
            <article className={`trophy-item ${reward.category}`} key={reward.rewardKey}>
              <span className="trophy-icon" aria-hidden="true">{rewardIcon(reward.rewardKey)}</span>
              <div>
                <div className="trophy-item-topline">
                  <strong>{reward.name}</strong>
                  <em>{reward.category}</em>
                </div>
                <p>{reward.description}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
