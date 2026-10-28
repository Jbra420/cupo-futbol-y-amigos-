import type { Assignment, PublicRegistration, TeamInfo } from "@/lib/contracts";
export function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return (
    (words[0]?.[0] ?? "") +
    (words.length > 1 ? words[words.length - 1][0] : (words[0]?.[1] ?? ""))
  );
}
export function PitchBackground() {
  return (
    <svg
      className="football-field"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="94" height="134" rx="1" />
      <path d="M3 70h94M24 3v23h52V3M38 3v9h24V3M24 137v-23h52v23M38 137v-9h24v9" />
      <circle cx="50" cy="70" r="14" />
      <circle cx="50" cy="70" r=".6" fill="currentColor" />
      <path d="M36 26a16 16 0 0 0 28 0M36 114a16 16 0 0 1 28 0" />
    </svg>
  );
}
export function ReadonlyPitch({
  teams,
  players,
  assignments,
}: {
  teams: TeamInfo[];
  players: PublicRegistration[];
  assignments: Assignment[];
}) {
  return (
    <div className="readonly-lineup">
      <div className="pitch-team-names">
        {teams.map((team) => (
          <span key={team.id}>
            <i style={{ background: team.color }} />
            {team.name}
          </span>
        ))}
      </div>
      <div className="editor-pitch">
        <PitchBackground />
        {assignments.map((assignment) => {
          const player = players.find(
            (item) => item.id === assignment.registration_id,
          );
          const team = teams.find((item) => item.id === assignment.team_id);
          return player && team ? (
            <div
              className="pitch-token readonly-token"
              key={player.id}
              style={
                {
                  left: `${assignment.pitch_x}%`,
                  top: `${assignment.pitch_y}%`,
                  "--team-color": team.color,
                } as React.CSSProperties
              }
            >
              <span>{initials(player.player_name)}</span>
              <small>{player.player_name}</small>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
