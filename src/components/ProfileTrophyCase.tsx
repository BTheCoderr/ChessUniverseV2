import { useCallback, useEffect, useMemo, useState } from "react";
import { BATTLE_FORMATIONS } from "../lib/battleChess";
import { formationMastery } from "../lib/formationMastery";
import { supabase } from "../lib/supabase";

type ShowcaseReward = {
  rewardKey: string;
  name: string;
  category: "mode" | "formation" | "badge" | "title";
  description: string;
  requirementCopy: string;
  unlockedAt: string | null;
};

type ShowcaseAchievement = {
  achievementKey: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
};

type ShowcaseTitle = {
  titleKey: string;
  name: string;
  description: string;
  earnedAt: string | null;
};

type FormationStat = {
  formation_key: string;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
};

type RivalryRecord = {
  wins: number;
  losses: number;
  draws: number;
  games: number;
};

type Rivalry = {
  totalGames: number;
  relationshipLabel: "New opponent" | "Opponent" | "Rival" | "Nemesis";
  classic: RivalryRecord;
  battle: RivalryRecord;
  favoriteBattleFormation: string | null;
  favoriteBattleFormationGames: number;
  streakResult: "win" | "loss" | "draw" | null;
  streakCount: number;
  lastGame: {
    gameId: string;
    variant: string;
    result: string | null;
    resultReason: string | null;
    timeControlMinutes: number;
    battleFormationKey: string | null;
    endedAt: string | null;
  } | null;
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
  formationStats: FormationStat[];
  favoriteFormation: FormationStat | null;
  rewards: ShowcaseReward[];
  achievements: ShowcaseAchievement[];
  titles: ShowcaseTitle[];
  equippedTitle: ShowcaseTitle | null;
  championshipWins: number;
  rivalry: Rivalry | null;
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
  editable = false,
  onOpenGame,
}: {
  userId: string;
  compact?: boolean;
  editable?: boolean;
  onOpenGame?: (gameId: string) => void;
}) {
  const client = supabase;
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [loading, setLoading] = useState(true);
  const [titleBusy, setTitleBusy] = useState(false);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!client || !userId) return;

    setLoading(true);
    setMessage("");

    const { data, error } = await client.functions.invoke("online-game", {
      body: { action: "profile_showcase", userId },
    });

    if (error || !data?.showcase) {
      setShowcase(null);
      setMessage(error?.message ?? "Unable to load Trophy Case.");
      setLoading(false);
      return;
    }

    setShowcase(data.showcase as Showcase);
    setLoading(false);
  }, [client, userId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const displayedAchievements = useMemo(
    () => (compact ? showcase?.achievements?.slice(0, 6) ?? [] : showcase?.achievements ?? []),
    [compact, showcase]
  );

  const displayedMastery = useMemo(
    () => (compact ? showcase?.formationStats?.slice(0, 3) ?? [] : showcase?.formationStats ?? []),
    [compact, showcase]
  );

  const equipTitle = async (titleKey: string | null) => {
    if (!client || !editable || titleBusy) return;

    setTitleBusy(true);
    setMessage("");

    const { error } = await client.functions.invoke("online-game", {
      body: { action: "equip_title", titleKey },
    });

    if (error) {
      setMessage(error.message);
      setTitleBusy(false);
      return;
    }

    await load();
    setTitleBusy(false);
  };

  const challengeRival = async () => {
    if (!client || !showcase?.rivalry || challengeBusy) return;

    const lastGame = showcase.rivalry.lastGame;
    const variant = lastGame?.variant === "battle" ? "battle" : "traditional";
    const minutes = lastGame?.timeControlMinutes ?? 10;
    const formationKey =
      variant === "battle" ? lastGame?.battleFormationKey ?? "classic" : null;

    setChallengeBusy(true);
    setMessage("");

    const { data, error } = await client.functions.invoke("online-game", {
      body: {
        action: "challenge_rival",
        userId,
        variant,
        minutes,
        formationKey,
      },
    });

    if (error || !data?.gameId) {
      setMessage(error?.message ?? "Unable to create challenge.");
      setChallengeBusy(false);
      return;
    }

    setMessage(
      variant === "battle"
        ? `Battle challenge sent · ${formationName(formationKey)} · ${minutes === 0 ? "Untimed" : `${minutes} min`}`
        : `Classic challenge sent · ${minutes === 0 ? "Untimed" : `${minutes} min`}`
    );
    setChallengeBusy(false);
    onOpenGame?.(String(data.gameId));
  };

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
          <span className="champion-count">
            ♛ {showcase.championshipWins} Championship{showcase.championshipWins === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className={showcase.equippedTitle ? "equipped-title-banner active" : "equipped-title-banner"}>
        <span>Equipped title</span>
        <strong>{showcase.equippedTitle?.name ?? "None"}</strong>
        {showcase.equippedTitle ? <small>{showcase.equippedTitle.description}</small> : null}
      </div>

      {showcase.rivalry ? (
        <div className={`rivalry-card ${showcase.rivalry.relationshipLabel.toLowerCase().replace(" ", "-")}`}>
          <div className="rivalry-heading">
            <div>
              <div className="eyebrow">HEAD-TO-HEAD</div>
              <strong>{showcase.rivalry.relationshipLabel}</strong>
              <span>
                {showcase.rivalry.totalGames === 0
                  ? "No completed meetings yet."
                  : `${showcase.rivalry.totalGames} completed meeting${showcase.rivalry.totalGames === 1 ? "" : "s"}`}
              </span>
            </div>
            {showcase.rivalry.totalGames >= 3 ? (
              <span className="rival-badge">
                {showcase.rivalry.relationshipLabel === "Nemesis" ? "☄" : "⚔"} {showcase.rivalry.relationshipLabel}
              </span>
            ) : null}
          </div>

          <div className="rivalry-record-grid">
            <div>
              <strong>{showcase.rivalry.classic.wins}-{showcase.rivalry.classic.losses}-{showcase.rivalry.classic.draws}</strong>
              <span>Classic series</span>
            </div>
            <div>
              <strong>{showcase.rivalry.battle.wins}-{showcase.rivalry.battle.losses}-{showcase.rivalry.battle.draws}</strong>
              <span>Battle series</span>
            </div>
            <div>
              <strong>
                {showcase.rivalry.streakCount > 0
                  ? `${showcase.rivalry.streakCount} ${showcase.rivalry.streakResult === "win" ? "W" : showcase.rivalry.streakResult === "loss" ? "L" : "D"}`
                  : "—"}
              </strong>
              <span>Current series streak</span>
            </div>
            <div>
              <strong>{formationName(showcase.rivalry.favoriteBattleFormation)}</strong>
              <span>Shared Battle formation</span>
            </div>
          </div>

          {onOpenGame ? (
            <button
              className="primary-action compact rivalry-challenge"
              disabled={challengeBusy}
              onClick={() => void challengeRival()}
            >
              {challengeBusy
                ? "Creating challenge…"
                : showcase.rivalry.totalGames > 0
                  ? "Challenge again"
                  : "Challenge player"}
            </button>
          ) : null}
        </div>
      ) : null}

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

      {(showcase.titles ?? []).length > 0 ? (
        <div className="title-rack">
          <div className="section-heading">
            <div>
              <strong>Earned titles</strong>
              <span>{editable ? "Choose one title to display on your profile." : "Titles earned through verified progression."}</span>
            </div>
          </div>
          <div className="title-chip-grid">
            {(showcase.titles ?? []).map((title) => {
              const equipped = showcase.equippedTitle?.titleKey === title.titleKey;
              return (
                <button
                  type="button"
                  className={equipped ? "title-chip equipped" : "title-chip"}
                  key={title.titleKey}
                  disabled={!editable || titleBusy}
                  onClick={() => void equipTitle(equipped ? null : title.titleKey)}
                >
                  <span>{equipped ? "Equipped" : editable ? "Equip" : "Earned"}</span>
                  <strong>{title.name}</strong>
                  <small>{title.description}</small>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="achievement-section">
        <div className="section-heading">
          <div>
            <strong>Achievements</strong>
            <span>{showcase.achievements?.length ?? 0} earned across Classic, Battle, Seasons and Championships.</span>
          </div>
        </div>
        {displayedAchievements.length === 0 ? (
          <div className="empty-trophy-case">
            <span>☆</span>
            <div>
              <strong>No achievements yet</strong>
              <small>Rated wins and competitive milestones will start filling this section.</small>
            </div>
          </div>
        ) : (
          <div className="achievement-grid">
            {displayedAchievements.map((achievement) => (
              <article className="achievement-card" key={achievement.achievementKey}>
                <span className="achievement-icon">{achievement.icon}</span>
                <div>
                  <strong>{achievement.name}</strong>
                  <small>{achievement.description}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mastery-section">
        <div className="section-heading">
          <div>
            <strong>Formation mastery</strong>
            <span>Mastery grows only from completed rated Battle games with that formation.</span>
          </div>
        </div>
        {displayedMastery.length === 0 ? (
          <p className="muted">No rated Formation Clash games yet.</p>
        ) : (
          <div className="mastery-grid">
            {displayedMastery.map((formation) => {
              const mastery = formationMastery(formation.games_played);
              return (
                <article className="mastery-card" key={formation.formation_key}>
                  <div className="mastery-card-topline">
                    <div>
                      <strong>{formationName(formation.formation_key)}</strong>
                      <span>Level {mastery.level} · {mastery.name}</span>
                    </div>
                    <b>{formation.games_played} games</b>
                  </div>
                  <div className="rank-progress-track" aria-label={`${formationName(formation.formation_key)} mastery progress`}>
                    <span style={{ width: `${mastery.progress}%` }} />
                  </div>
                  <small>
                    {mastery.nextGames
                      ? `${mastery.gamesToNext} games to next mastery level · ${formation.wins}-${formation.losses}-${formation.draws}`
                      : `Mastered · ${formation.wins}-${formation.losses}-${formation.draws}`}
                  </small>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="reward-section">
        <div className="section-heading">
          <div>
            <strong>Universe rewards</strong>
            <span>Permanent modes, badges and titles unlocked by progression.</span>
          </div>
        </div>
        <div className="trophy-grid">
          {featuredRewards.length === 0 ? (
            <div className="empty-trophy-case">
              <span>♙</span>
              <div>
                <strong>No Universe rewards yet</strong>
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
      </div>

      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}
