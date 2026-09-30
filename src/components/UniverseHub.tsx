import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BATTLE_FORMATIONS } from "../lib/battleChess";
import { supabase } from "../lib/supabase";

type Reward = {
  reward_key: string;
  name: string;
  category: "mode" | "formation" | "badge" | "title";
  description: string;
  requirement_copy: string;
  sort_order: number;
};

type Unlock = {
  reward_key: string;
  source_type: string;
  source_id: string | null;
  unlocked_at: string;
};

type Profile = {
  wins: number;
  rating: number;
};

type SeasonStats = {
  points: number;
};

export function UniverseHub({
  session,
  onOpenHorse,
  onOpenQueens,
  onOpenBattle,
  onSignIn,
}: {
  session: Session | null;
  onOpenHorse: () => void;
  onOpenQueens: () => void;
  onOpenBattle: (unlockKeys: string[]) => void;
  onSignIn: () => void;
}) {
  const client = supabase;
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bestSeasonPoints, setBestSeasonPoints] = useState(0);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!client || !session) {
      setRewards([]);
      setUnlocks([]);
      setProfile(null);
      setBestSeasonPoints(0);
      return;
    }

    const [{ data: rewardRows, error: rewardError }, { data: unlockRows, error: unlockError }, { data: profileRow }] =
      await Promise.all([
        client
          .from("universe_rewards")
          .select("reward_key,name,category,description,requirement_copy,sort_order")
          .order("sort_order", { ascending: true }),
        client
          .from("player_unlocks")
          .select("reward_key,source_type,source_id,unlocked_at")
          .eq("user_id", session.user.id)
          .order("unlocked_at", { ascending: true }),
        client
          .from("profiles")
          .select("wins,rating")
          .eq("id", session.user.id)
          .single(),
      ]);

    if (rewardError || unlockError) {
      setMessage(rewardError?.message ?? unlockError?.message ?? "Unable to load Universe rewards.");
      return;
    }

    setRewards((rewardRows ?? []) as Reward[]);
    setUnlocks((unlockRows ?? []) as Unlock[]);
    setProfile((profileRow ?? null) as Profile | null);

    const { data: seasonRows } = await client
      .from("season_player_stats")
      .select("points")
      .eq("user_id", session.user.id)
      .order("points", { ascending: false })
      .limit(1);

    setBestSeasonPoints(Number(((seasonRows ?? [])[0] as SeasonStats | undefined)?.points ?? 0));
    setMessage("");
  }, [client, session?.user.id]);

  useEffect(() => {
    void load();
    if (!client || !session) return;

    const channel = client
      .channel("universe-unlocks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_unlocks",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => void load()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${session.user.id}`,
        },
        () => void load()
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, load, session]);

  const unlockKeys = useMemo(
    () => unlocks.map((unlock) => unlock.reward_key),
    [unlocks]
  );
  const unlockSet = useMemo(() => new Set(unlockKeys), [unlockKeys]);
  const battleUnlocked = unlockSet.has("battle_chess");

  return (
    <section className="universe-hub">
      <div className="universe-hero">
        <div>
          <div className="eyebrow">CHESS UNIVERSE</div>
          <h1>Build your Universe.</h1>
          <p>
            Core worlds stay playable. Rated wins, Season progress, Championship runs and all-time rating unlock new Battle formations, badges and titles.
          </p>
        </div>
        <div className="universe-orbit" aria-hidden="true">♞</div>
      </div>

      <div className="universe-world-grid">
        <article className="universe-world">
          <div className="eyebrow">CORE WORLD</div>
          <h2>Magic Horse</h2>
          <p>Capture queens with knight-only routes and unlock harder local challenge levels.</p>
          <button className="secondary-action" onClick={onOpenHorse}>Enter Magic Horse</button>
        </article>

        <article className="universe-world">
          <div className="eyebrow">CORE WORLD</div>
          <h2>Evolving Queens</h2>
          <p>Change how queens move across four evolution levels against AI or another local player.</p>
          <button className="secondary-action" onClick={onOpenQueens}>Enter Queens</button>
        </article>

        <article className={battleUnlocked ? "universe-world battle unlocked" : "universe-world battle locked"}>
          <div className="eyebrow">{battleUnlocked ? "UNLOCKED" : "LOCKED WORLD"}</div>
          <h2>Battle Chess</h2>
          <p>
            Formation Clash changes the back rank while keeping normal chess movement and the Black-first Universe rule.
          </p>
          {battleUnlocked ? (
            <button className="primary-action" onClick={() => onOpenBattle(unlockKeys)}>
              Enter Battle Chess
            </button>
          ) : session ? (
            <div className="locked-world-progress">
              <strong>{Math.min(profile?.wins ?? 0, 3)} / 3 rated wins</strong>
              <span>Win 3 rated online games to unlock Battle Chess + Back Rank Lab.</span>
            </div>
          ) : (
            <button className="primary-action" onClick={onSignIn}>Sign in to unlock</button>
          )}
        </article>
      </div>

      {session ? (
        <>
          <section className="card universe-progress-card">
            <div className="section-heading">
              <div>
                <strong>Universe progress</strong>
                <span>Your permanent progression across rated play and Seasons.</span>
              </div>
            </div>

            <div className="universe-progress-grid">
              <div>
                <strong>{profile?.wins ?? 0}</strong>
                <span>Rated wins</span>
              </div>
              <div>
                <strong>{profile?.rating ?? 1200}</strong>
                <span>All-time rating</span>
              </div>
              <div>
                <strong>{bestSeasonPoints}</strong>
                <span>Best Season points</span>
              </div>
              <div>
                <strong>{unlocks.length}</strong>
                <span>Rewards unlocked</span>
              </div>
            </div>
          </section>

          <section className="card reward-vault">
            <div className="section-heading">
              <div>
                <strong>Reward Vault</strong>
                <span>Unlocks are earned from trusted game, Season and Championship results.</span>
              </div>
            </div>

            <div className="reward-grid">
              {rewards.map((reward) => {
                const unlocked = unlockSet.has(reward.reward_key);
                return (
                  <article className={unlocked ? "reward-card unlocked" : "reward-card"} key={reward.reward_key}>
                    <div className="reward-card-topline">
                      <span>{reward.category}</span>
                      <b>{unlocked ? "Unlocked" : "Locked"}</b>
                    </div>
                    <strong>{reward.name}</strong>
                    <p>{reward.description}</p>
                    <small>{reward.requirement_copy}</small>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="card formation-vault">
            <div className="section-heading">
              <div>
                <strong>Battle formations</strong>
                <span>Higher achievements unlock more Formation Clash starting lines.</span>
              </div>
            </div>

            <div className="formation-preview-grid">
              {BATTLE_FORMATIONS.map((formation) => {
                const unlocked = !formation.requires || unlockSet.has(formation.requires);
                return (
                  <div className={unlocked ? "formation-preview unlocked" : "formation-preview"} key={formation.key}>
                    <code>{formation.backRank.toUpperCase()}</code>
                    <strong>{formation.name}</strong>
                    <span>{unlocked ? formation.description : "Locked"}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <section className="card universe-signin-card">
          <div className="eyebrow">PROGRESSION</div>
          <h2>Sign in to build your Universe.</h2>
          <p>
            Magic Horse and Evolving Queens remain available locally. Battle Chess, achievement rewards and Championship unlocks attach to your signed-in profile.
          </p>
          <button className="primary-action" onClick={onSignIn}>Sign in</button>
        </section>
      )}

      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}
