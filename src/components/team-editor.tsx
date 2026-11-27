"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Shuffle,
  GripVertical,
  Save,
  List,
  LayoutGrid,
  CheckCircle2,
} from "lucide-react";
import { nanoid } from "nanoid";
import { adminSnapshotSchema, type AdminSnapshot } from "@/lib/contracts";
import { balanceTeams } from "@/lib/teams/balance";
import { POSITIONS } from "@/lib/utils/positions";
import type { Position } from "@/types/database";
import { Button } from "./ui/button";
import { PositionBadge } from "./position-badge";
import { LineupShare } from "./lineup-share";
import { BalanceScale, type ScaleSide } from "./balance-scale";
import {
  formationSlots,
  magnetTarget,
  visualDistance,
  type Slot,
} from "@/lib/teams/formation";
import { haptic, prefersReducedMotion } from "@/lib/motion";
import { PitchBackground, initials } from "./pitch";
import { shortName, spreadTokens } from "@/lib/teams/layout";

type Player = AdminSnapshot["registrations"][number];
type Draft = {
  teams: { idx: number; name: string; color: string }[];
  positions: Record<string, { team: number; x: number; y: number }>;
};
function fromSnapshot(data: AdminSnapshot): Draft {
  return {
    teams: [0, 1].map((idx) => {
      const team = data.teams.find((item) => item.idx === idx);
      return {
        idx,
        name: team?.name ?? `Equipo ${idx + 1}`,
        color: team?.color ?? (idx ? "#2563EB" : "#16A34A"),
      };
    }),
    positions: Object.fromEntries(
      data.assignments.map((assignment) => [
        assignment.registration_id,
        {
          team:
            data.teams.find((team) => team.id === assignment.team_id)?.idx ?? 0,
          x: assignment.pitch_x,
          y: assignment.pitch_y,
        },
      ]),
    ),
  };
}
function initialPosition(
  position: Position,
  team: number,
  index: number,
  count: number,
) {
  const y = { POR: 8, DEF: 20, MED: 32, DEL: 44 }[position];
  return {
    team,
    x: 10 + ((index + 1) / (count + 1)) * 80,
    y: team === 0 ? y : 100 - y,
  };
}
function Board({
  id,
  children,
  className = "",
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={`team-board ${className} ${isOver ? "is-over" : ""}`}
    >
      {children}
    </section>
  );
}
function PlayerCard({
  player,
  team,
  teams,
  disabled,
  onMove,
}: {
  player: Player;
  team: number | null;
  teams: Draft["teams"];
  disabled: boolean;
  onMove: (id: string, team: number | null) => void;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    isDragging,
  } = useDraggable({ id: player.id, disabled });
  return (
    <div
      ref={setNodeRef}
      className={`roster-row team-player ${isDragging ? "dragging" : ""}`}
      style={{
        transform: transform
          ? `translate(${transform.x}px,${transform.y}px)`
          : undefined,
      }}
    >
      <button
        type="button"
        className="drag-handle"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Arrastrar a ${player.player_name}`}
      >
        <GripVertical size={17} />
      </button>
      <div>
        <strong>{player.player_name}</strong>
        <PositionBadge position={player.position} />
      </div>
      <label className="sr-only" htmlFor={`team-${player.id}`}>
        Equipo de {player.player_name}
      </label>
      <select
        id={`team-${player.id}`}
        value={team === null ? "none" : String(team)}
        disabled={disabled}
        onChange={(event) =>
          onMove(
            player.id,
            event.target.value === "none" ? null : Number(event.target.value),
          )
        }
      >
        <option value="none">Sin equipo</option>
        {teams.map((item) => (
          <option key={item.idx} value={item.idx}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}
type Settle = { id: string; dx: number; dy: number; key: number };
function PitchPlayer({
  player,
  color,
  position,
  disabled,
  settle,
}: {
  player: Player;
  color: string;
  position: Draft["positions"][string];
  disabled: boolean;
  settle: Settle | null;
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } =
    useDraggable({ id: player.id, disabled });
  const node = useRef<HTMLButtonElement | null>(null);
  const settleKey = settle?.id === player.id ? settle.key : null;
  // La ficha sale desde donde se soltó y cae en su puesto con un rebote.
  useLayoutEffect(() => {
    if (settleKey === null || !settle || !node.current) return;
    if (prefersReducedMotion()) return;
    node.current.animate(
      [
        {
          transform: `translate(-50%,-50%) translate(${settle.dx}px,${settle.dy}px) scale(1.12)`,
        },
        { transform: "translate(-50%,-50%) scale(1)" },
      ],
      { duration: 460, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
    // Solo cuando llega un nuevo asentamiento para esta ficha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settleKey]);
  return (
    <button
      type="button"
      className={`pitch-token ${isDragging ? "dragging" : ""}`}
      ref={(element) => {
        node.current = element;
        setNodeRef(element);
      }}
      {...attributes}
      {...listeners}
      disabled={disabled}
      aria-label={`Mover a ${player.player_name} en cancha`}
      style={
        {
          left: `${position.x}%`,
          top: `${position.y}%`,
          "--team-color": color,
          transform: `translate(-50%,-50%) translate(${transform?.x ?? 0}px,${transform?.y ?? 0}px)`,
        } as CSSProperties
      }
    >
      <span>{initials(player.player_name)}</span>
      <small>{shortName(player.player_name)}</small>
    </button>
  );
}
export function TeamEditor({
  snapshot,
  onSaved,
}: {
  snapshot: AdminSnapshot;
  onSaved: (value: AdminSnapshot) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => fromSnapshot(snapshot));
  const draftRef = useRef(draft);
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(snapshot.match.revision);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"list" | "pitch">("list");
  const [drawn, setDrawn] = useState(false);
  const [magnet, setMagnet] = useState<{
    id: string;
    team: number;
    target: Slot | null;
  } | null>(null);
  const [settle, setSettle] = useState<Settle | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const players = snapshot.registrations.filter(
    (player) => player.status === "confirmed",
  );
  const rosterKey = players
    .map((player) => `${player.id}:${player.position}`)
    .sort()
    .join();
  const previousRoster = useRef(rosterKey);
  const finished = snapshot.match.status === "finished";
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 7 },
    }),
    useSensor(KeyboardSensor),
  );
  useEffect(() => {
    if (!dirty && !busy) {
      const next = fromSnapshot(snapshot);
      draftRef.current = next;
      setDraft(next);
      setRevision(snapshot.match.revision);
    }
  }, [snapshot, dirty, busy]);
  useEffect(() => {
    if (previousRoster.current === rosterKey) return;
    previousRoster.current = rosterKey;
    const next = fromSnapshot(snapshot);
    draftRef.current = next;
    setDraft(next);
    setDirty(false);
    setRevision(snapshot.match.revision);
    setDrawn(false);
    setNotice(
      "Los confirmados cambiaron. Revisa la alineación antes de publicarla.",
    );
  }, [rosterKey, snapshot]);
  function update(next: Draft) {
    draftRef.current = next;
    setDraft(next);
    setDirty(true);
    setNotice("");
  }
  async function fresh() {
    const response = await fetch(`/api/partidos/${snapshot.match.slug}/admin`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error();
    return adminSnapshotSchema.parse(await response.json());
  }
  async function save(next = draftRef.current, publish = false) {
    if (busy || finished) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const assignments = Object.entries(next.positions)
        .filter(([id]) => players.some((player) => player.id === id))
        .map(([id, value]) => ({
          registration_id: id,
          team_idx: value.team,
          pitch_x: value.x,
          pitch_y: value.y,
        }));
      const response = await fetch(
        `/api/partidos/${snapshot.match.slug}/equipos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teams: next.teams,
            assignments,
            publish,
            revision,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const stored = adminSnapshotSchema.parse(result);
      onSaved(stored);
      setRevision(stored.match.revision);
      setDirty(false);
      setNotice(
        publish
          ? "Equipos publicados. Tus amigos ya pueden verlos."
          : "Alineación guardada.",
      );
    } catch (error) {
      setError(
        error instanceof Error && error.message !== "Failed to fetch"
          ? error.message
          : "No pudimos guardar la alineación. Revisa tu conexión.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function draw() {
    setBusy(true);
    setError("");
    try {
      const current = await fresh();
      const confirmed = current.registrations.filter(
        (player) => player.status === "confirmed",
      );
      if (confirmed.length !== current.match.capacity) {
        onSaved(current);
        setError("Completa los cupos antes de sortear.");
        return;
      }
      const result = balanceTeams(
        confirmed.map((player) => ({
          registrationId: player.id,
          playerName: player.player_name,
          position: player.position,
          skill: player.skill,
        })),
        nanoid(),
      );
      const next = dirty
        ? ({ ...draftRef.current, positions: {} } as Draft)
        : fromSnapshot(current);
      next.positions = {};
      for (const team of result.teams)
        for (const position of POSITIONS) {
          const group = team.players.filter(
            (player) => player.position === position,
          );
          group.forEach((player, index) => {
            next.positions[player.registrationId] = initialPosition(
              position,
              team.teamIndex,
              index,
              group.length,
            );
          });
        }
      const positionOf = new Map(
        confirmed.map((player) => [player.id, player.position]),
      );
      for (const point of spreadTokens(
        Object.entries(next.positions).map(([id, value]) => ({
          id,
          ...value,
          pinned: positionOf.get(id) === "POR",
        })),
      ))
        next.positions[point.id] = {
          team: point.team,
          x: Math.round(point.x * 10) / 10,
          y: point.y,
        };
      onSaved(current);
      setRevision(current.match.revision);
      update(next);
      setDrawn(true);
    } catch {
      setError("No pudimos sortear. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }
  function move(id: string, team: number | null) {
    const next = {
      ...draftRef.current,
      positions: { ...draftRef.current.positions },
    };
    const player = players.find((item) => item.id === id);
    if (!player) return;
    if (team === null) delete next.positions[id];
    else {
      const old = next.positions[id];
      next.positions[id] = old
        ? { ...old, team, y: old.team === team ? old.y : 100 - old.y }
        : initialPosition(player.position, team, 0, 1);
      // Moving between lists should not hide a player under an existing token.
      if (old?.team !== team) {
        const candidate = next.positions[id];
        const occupied = Object.entries(next.positions)
          .filter(([otherId]) => otherId !== id)
          .map(([, value]) => value);
        const freeX = [
          candidate.x,
          candidate.x - 20,
          candidate.x + 20,
          20,
          80,
          35,
          65,
        ].find(
          (x) =>
            x >= 5 &&
            x <= 95 &&
            !occupied.some(
              (value) =>
                Math.abs(value.x - x) < 18 &&
                Math.abs(value.y - candidate.y) < 10,
            ),
        );
        if (freeX !== undefined)
          next.positions[id] = { ...candidate, x: freeX };
      }
    }
    update(next);
    const complete = players.every((player) => next.positions[player.id]);
    void save(next, snapshot.match.status === "teams_ready" && complete);
  }
  /** Punto (en %) donde caería la ficha con el desplazamiento actual. */
  function droppedPoint(id: string, delta: { x: number; y: number }) {
    const rect = pitchRef.current?.getBoundingClientRect();
    const old = draftRef.current.positions[id];
    if (!rect || !old) return null;
    return {
      rect,
      old,
      point: {
        x: Math.min(95, Math.max(5, old.x + (delta.x / rect.width) * 100)),
        y: Math.min(95, Math.max(5, old.y + (delta.y / rect.height) * 100)),
      },
    };
  }
  function findTarget(id: string, point: { x: number; y: number }) {
    const old = draftRef.current.positions[id];
    if (!old) return null;
    return magnetTarget({
      point,
      team: old.team,
      origin: old,
      others: Object.entries(draftRef.current.positions)
        .filter(([otherId]) => otherId !== id)
        .map(([, value]) => value),
    });
  }
  function dragStart(event: DragStartEvent) {
    if (view !== "pitch") return;
    const id = String(event.active.id);
    const old = draftRef.current.positions[id];
    if (old) setMagnet({ id, team: old.team, target: null });
  }
  function dragMove(event: DragMoveEvent) {
    if (view !== "pitch") return;
    const id = String(event.active.id);
    const dropped = droppedPoint(id, event.delta);
    if (!dropped) return;
    const target = findTarget(id, dropped.point);
    setMagnet((current) => {
      if (!current || current.id !== id) return current;
      if (current.target === target) return current;
      if (
        current.target &&
        target &&
        current.target.x === target.x &&
        current.target.y === target.y
      )
        return current;
      if (target) haptic(6);
      return { ...current, target };
    });
  }
  function dragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    setMagnet(null);
    if (view === "list") {
      const target = String(event.over?.id ?? "");
      if (target.startsWith("board-"))
        move(id, target === "board-none" ? null : Number(target.slice(-1)));
    } else {
      const dropped = droppedPoint(id, event.delta);
      if (!dropped) return;
      const { rect, old, point } = dropped;
      // Imán: si cae cerca de un puesto libre de la formación, se acomoda ahí.
      const target = findTarget(id, point);
      const final = target ? { x: target.x, y: target.y } : point;
      const next = {
        ...draftRef.current,
        positions: {
          ...draftRef.current.positions,
          [id]: { ...old, ...final },
        },
      };
      if (target) {
        setSettle({
          id,
          dx: ((point.x - final.x) / 100) * rect.width,
          dy: ((point.y - final.y) / 100) * rect.height,
          key: Date.now(),
        });
        haptic([10, 30, 14]);
      }
      update(next);
      void save(next, snapshot.match.status === "teams_ready");
    }
  }
  async function reload() {
    if (
      dirty &&
      !window.confirm(
        "¿Descartar los cambios sin guardar y cargar la última alineación?",
      )
    )
      return;
    setBusy(true);
    try {
      const current = await fresh();
      onSaved(current);
      const next = fromSnapshot(current);
      draftRef.current = next;
      setDraft(next);
      setRevision(current.match.revision);
      setDirty(false);
      setError("");
    } catch {
      setError("No pudimos recargar la alineación.");
    } finally {
      setBusy(false);
    }
  }
  const groups = [0, 1].map((team) =>
    players.filter((player) => draft.positions[player.id]?.team === team),
  );
  const unassigned = players.filter((player) => !draft.positions[player.id]);
  const totals = groups.map((group) =>
    group.reduce((sum, player) => sum + player.skill, 0),
  );
  return (
    <section className="card balance-preview team-editor">
      <div className="section-heading">
        <div>
          <p className="overline">DOS EQUIPOS. UN BUEN PARTIDO.</p>
          <h2>Que gane el fútbol.</h2>
        </div>
        <div className="editor-actions">
          <Button
            variant="outline"
            disabled={busy || finished}
            onClick={() => setView("list")}
          >
            Armar a mano
          </Button>
          <Button
            disabled={
              busy || players.length !== snapshot.match.capacity || finished
            }
            onClick={draw}
          >
            <Shuffle />
            {busy
              ? "Guardando…"
              : drawn
                ? "Volver a sortear"
                : "Sortear balanceado"}
          </Button>
        </div>
      </div>
      {players.length < snapshot.match.capacity && (
        <p className="empty-copy">
          Puedes armar un borrador. Completa los cupos para sortear y publicar.
        </p>
      )}
      {error && (
        <div className="feedback error" role="alert">
          {error}
          <Button variant="ghost" onClick={reload} disabled={busy}>
            Recargar borrador
          </Button>
        </div>
      )}
      {notice && (
        <p className="feedback success" role="status">
          {notice}
        </p>
      )}
      <div className="balance-indicator">
        <p className="balance-heading">
          Diferencia de nivel:{" "}
          <strong>{Math.abs(totals[0] - totals[1])}</strong>
        </p>
        <BalanceScale
          sides={
            [0, 1].map((idx) => ({
              name: draft.teams[idx].name || `Equipo ${idx + 1}`,
              color: draft.teams[idx].color,
              total: totals[idx],
              count: groups[idx].length,
            })) as [ScaleSide, ScaleSide]
          }
        />
        <span className="balance-note">Solo tú puedes ver este indicador.</span>
      </div>
      {Math.abs(groups[0].length - groups[1].length) > 1 && (
        <p className="empty-copy">
          Los equipos tienen distinta cantidad de jugadores. Puedes moverlos
          antes de publicar.
        </p>
      )}
      <div className="view-toggle" role="group" aria-label="Vista de equipos">
        <Button
          variant={view === "list" ? "default" : "outline"}
          onClick={() => setView("list")}
        >
          <List /> Lista
        </Button>
        <Button
          variant={view === "pitch" ? "default" : "outline"}
          onClick={() => setView("pitch")}
        >
          <LayoutGrid /> Cancha
        </Button>
        <span aria-live="polite">
          {busy ? "Guardando…" : dirty ? "Cambios sin guardar" : "Guardado"}
        </span>
      </div>
      <DndContext
        id={`teams-${snapshot.match.id}`}
        sensors={sensors}
        onDragStart={dragStart}
        onDragMove={dragMove}
        onDragEnd={dragEnd}
        onDragCancel={() => setMagnet(null)}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) =>
              `Levantaste a ${players.find((player) => player.id === active.id)?.player_name ?? "un jugador"}.`,
            onDragOver: ({ over }) =>
              over
                ? `Sobre ${over.id === "board-none" ? "Sin equipo" : (draft.teams[Number(String(over.id).slice(-1))]?.name ?? "la cancha")}.`
                : "Fuera de una zona de equipo.",
            onDragEnd: () => "Jugador soltado. Guardando posición.",
            onDragCancel: () => "Movimiento cancelado.",
          },
          screenReaderInstructions: {
            draggable:
              "Presiona espacio para levantar un jugador, las flechas para moverlo, espacio para soltar o escape para cancelar. También puedes usar su selector de equipo.",
          },
        }}
      >
        {view === "list" ? (
          <>
            <div className="team-boards">
              {draft.teams.map((team) => (
                <Board
                  id={`board-${team.idx}`}
                  key={team.idx}
                  className="preview-team"
                >
                  <div className="team-config">
                    <input
                      aria-label={`Color del equipo ${team.idx + 1}`}
                      type="color"
                      value={team.color}
                      disabled={busy || finished}
                      onChange={(event) =>
                        update({
                          ...draftRef.current,
                          teams: draftRef.current.teams.map((item) =>
                            item.idx === team.idx
                              ? { ...item, color: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                    <input
                      aria-label={`Nombre del equipo ${team.idx + 1}`}
                      value={team.name}
                      maxLength={40}
                      disabled={busy || finished}
                      onChange={(event) =>
                        update({
                          ...draftRef.current,
                          teams: draftRef.current.teams.map((item) =>
                            item.idx === team.idx
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <p className="position-counts">
                    {POSITIONS.map((position) => (
                      <span key={position}>
                        {position}{" "}
                        {
                          groups[team.idx].filter(
                            (player) => player.position === position,
                          ).length
                        }
                      </span>
                    ))}
                  </p>
                  <h3 className="sr-only">{team.name}</h3>
                  {groups[team.idx].map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      team={team.idx}
                      teams={draft.teams}
                      disabled={busy || finished}
                      onMove={move}
                    />
                  ))}
                  {groups[team.idx].length === 0 && (
                    <p className="drop-hint">Suelta jugadores aquí</p>
                  )}
                </Board>
              ))}
            </div>
            <Board id="board-none" className="unassigned-board">
              <h3>
                Sin equipo <span>{unassigned.length}</span>
              </h3>
              {unassigned.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  team={null}
                  teams={draft.teams}
                  disabled={busy || finished}
                  onMove={move}
                />
              ))}
              {unassigned.length === 0 && (
                <p className="empty-copy">Todos tienen equipo.</p>
              )}
            </Board>
          </>
        ) : (
          <div className="pitch-wrap">
            <div className="pitch-team-names">
              {draft.teams.map((team) => (
                <span key={team.idx}>
                  <i style={{ background: team.color }} />
                  {team.name}
                </span>
              ))}
            </div>
            <div
              className={`editor-pitch ${magnet ? "is-magnet" : ""}`}
              ref={pitchRef}
            >
              <PitchBackground />
              {magnet &&
                formationSlots(magnet.team).map((slot) => {
                  const taken = Object.entries(draft.positions).some(
                    ([otherId, value]) =>
                      otherId !== magnet.id &&
                      value.team === magnet.team &&
                      visualDistance(value, slot) < 7,
                  );
                  const active =
                    magnet.target?.x === slot.x && magnet.target?.y === slot.y;
                  return (
                    <span
                      key={`${slot.x}-${slot.y}`}
                      className={`formation-slot ${taken ? "is-taken" : ""} ${active ? "is-target" : ""}`}
                      style={
                        {
                          left: `${slot.x}%`,
                          top: `${slot.y}%`,
                          "--team-color": draft.teams[magnet.team].color,
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    >
                      <small>{slot.line}</small>
                    </span>
                  );
                })}
              {players.map((player) => {
                const position = draft.positions[player.id];
                return position ? (
                  <PitchPlayer
                    key={player.id}
                    player={player}
                    position={position}
                    color={draft.teams[position.team].color}
                    disabled={busy || finished}
                    settle={settle}
                  />
                ) : null;
              })}
            </div>
            {unassigned.length > 0 && (
              <p className="empty-copy">
                Hay {unassigned.length} jugadores sin equipo. Asígnalos desde la
                vista Lista.
              </p>
            )}
          </div>
        )}
      </DndContext>
      <div className="editor-save">
        <small>
          Arrastrar guarda automáticamente. Nombres y colores se guardan con el
          borrador o al publicar.
        </small>
        <Button
          variant="outline"
          disabled={!dirty || busy || finished}
          onClick={() => {
            void save();
          }}
        >
          <Save /> Guardar borrador
        </Button>
        <Button
          disabled={
            busy ||
            finished ||
            unassigned.length > 0 ||
            players.length !== snapshot.match.capacity
          }
          onClick={() => {
            void save(draftRef.current, true);
          }}
        >
          <CheckCircle2 /> Publicar equipos
        </Button>
      </div>
      <LineupShare
        match={snapshot.match}
        teams={snapshot.teams}
        players={snapshot.registrations.map(
          ({ id, player_name, position, status }) => ({
            id,
            player_name,
            position,
            status,
          }),
        )}
        assignments={snapshot.assignments}
        disabled={
          dirty ||
          busy ||
          !["teams_ready", "finished"].includes(snapshot.match.status) ||
          snapshot.assignments.length === 0
        }
      />
    </section>
  );
}
