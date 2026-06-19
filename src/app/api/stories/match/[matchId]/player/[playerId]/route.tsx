import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { ApiAuthError, isPeladaAdmin, requireApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const COLORS = {
  campo: "#1B9E4B",
  mata: "#0B4A29",
  craque: "#F4A11A",
  tinta: "#16261D",
  musgo: "#A9B8AD",
  areia: "#F1F4ED"
};

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export async function GET(request: Request, { params }: { params: Promise<{ matchId: string; playerId: string }> }) {
  try {
    const user = await requireApiUser();
    const { matchId, playerId } = await params;

    const [match, player] = await Promise.all([
      prisma.match.findFirst({
        where: { id: matchId, peladaId: user.peladaId!, deletedAt: null },
        include: { pelada: { select: { name: true } } }
      }),
      prisma.player.findFirst({
        where: { id: playerId, peladaId: user.peladaId! },
        include: {
          goals: { where: { matchId } },
          defenses: { where: { matchId } },
          ratings: { where: { matchId } }
        }
      })
    ]);

    if (!match || !player) {
      return NextResponse.json({ error: "Pelada ou jogador nao encontrado." }, { status: 404 });
    }

    if (player.userId !== user.id && !isPeladaAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
    }

    const poll = await prisma.poll.findFirst({
      where: { matchId, title: "Craque da pelada" },
      orderBy: { createdAt: "desc" }
    });
    const isCraque = poll?.status === "CLOSED" && poll.winnerId === player.id;

    const goals = player.goals.reduce((sum, item) => sum + item.quantity, 0);
    const defenses = player.defenses.reduce((sum, item) => sum + item.quantity, 0);
    const averageRating = player.ratings.length
      ? player.ratings.reduce((sum, rating) => sum + rating.value, 0) / player.ratings.length
      : null;
    const isGoalkeeper = player.position === "GOLEIRO";

    const dateLabel = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo"
    }).format(match.date);

    const origin = new URL(request.url).origin;
    const logoUrl = `${origin}/icons/icon-512.png`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1080px",
            height: "1920px",
            display: "flex",
            flexDirection: "column",
            backgroundImage: `linear-gradient(160deg, ${COLORS.mata} 0%, ${COLORS.tinta} 100%)`,
            padding: "90px 70px",
            color: "white",
            fontFamily: "sans-serif"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} width={56} height={56} style={{ borderRadius: "14px" }} alt="" />
            <span style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "1px" }}>DONO DA PELADA</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "90px" }}>
            {isCraque ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: COLORS.craque,
                  color: COLORS.tinta,
                  padding: "14px 28px",
                  borderRadius: "999px",
                  fontSize: "30px",
                  fontWeight: 800,
                  marginBottom: "48px"
                }}
              >
                CRAQUE DA PELADA
              </div>
            ) : null}

            <div
              style={{
                width: "320px",
                height: "320px",
                borderRadius: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                backgroundColor: isGoalkeeper ? "#DC8A1A" : COLORS.campo,
                border: isCraque ? `8px solid ${COLORS.craque}` : "8px solid rgba(255,255,255,0.15)"
              }}
            >
              {player.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={player.photoUrl} width={320} height={320} style={{ objectFit: "cover" }} alt="" />
              ) : (
                <span style={{ fontSize: "150px", fontWeight: 800 }}>{initials(player.nickname)}</span>
              )}
            </div>

            <span style={{ fontSize: "64px", fontWeight: 800, marginTop: "36px", textAlign: "center" }}>
              {player.nickname}
            </span>
            <span style={{ fontSize: "28px", color: COLORS.musgo, marginTop: "8px" }}>
              {isGoalkeeper ? "Goleiro" : "Linha"} · {match.pelada.name}
            </span>
            <span style={{ fontSize: "24px", color: COLORS.musgo, marginTop: "4px" }}>
              {match.title} · {dateLabel}
            </span>
          </div>

          <div style={{ display: "flex", gap: "20px", marginTop: "70px" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: "24px",
                padding: "28px 0"
              }}
            >
              <span style={{ fontSize: "60px", fontWeight: 800, color: COLORS.craque }}>
                {isGoalkeeper ? defenses : goals}
              </span>
              <span style={{ fontSize: "22px", color: COLORS.musgo, marginTop: "6px" }}>
                {isGoalkeeper ? "DEFESAS DIFICEIS" : "GOLS"}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: "24px",
                padding: "28px 0"
              }}
            >
              <span style={{ fontSize: "60px", fontWeight: 800, color: COLORS.craque }}>
                {averageRating != null ? averageRating.toFixed(1) : "-"}
              </span>
              <span style={{ fontSize: "22px", color: COLORS.musgo, marginTop: "6px" }}>NOTA RECEBIDA</span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              borderTop: "2px solid rgba(255,255,255,0.15)",
              paddingTop: "36px"
            }}
          >
            <span style={{ fontSize: "30px", fontWeight: 800 }}>Organize sua propria pelada</span>
            <span style={{ fontSize: "24px", color: COLORS.musgo }}>Baixe o app Dono da Pelada</span>
          </div>
        </div>
      ),
      { width: 1080, height: 1920 }
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Falha ao gerar story:", error);
    return NextResponse.json({ error: "Erro ao gerar imagem." }, { status: 500 });
  }
}
