# Production imaji - 3 asama: deps (bagimlilik kurulumu, cache-friendly) ->
# builder (prisma generate + next build) -> runner (minimal calisma zamani).
# node:22-slim (Debian/glibc) kasten secildi - Prisma'nin query-engine binary'si
# Alpine/musl ile ekstra binaryTargets yapilandirmasi ister, glibc'de sorunsuz.
FROM node:22-slim AS base
# Prisma'nin query-engine binary'si calisma zamaninda OpenSSL'i dinamik linkler -
# node:22-slim'de varsayilan kurulu degil, yoksa "failed to detect libssl" uyarisiyla
# yanlis engine'e duser / DB baglantisinda patlayabilir.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# pnpm 10+ guvenlik onlemi: native derleme scriptlerini (bcrypt, prisma engine,
# sharp) varsayilan olarak calistirmaz, "onlyBuiltDependencies" (pnpm-workspace.yaml)
# tanimli olsa bile --frozen-lockfile modunda yine de exit 1 ile durur (bilinen pnpm
# davranisi) - ";" ile devam edip approve-builds --all onlari acikca calistirir.
RUN pnpm install --frozen-lockfile; pnpm approve-builds --all

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `pnpm exec`/`pnpm run` her calistirmada ayni "ignored builds" kontrolunu
# tekrar tetikliyor (approve-builds onayi kalici kaydedilmiyor) - node_modules
# zaten deps asamasinda dogru sekilde kuruldugu icin binary'leri pnpm sarmalayicisi
# OLMADAN dogrudan cagirmak bu tekrar-kontrolu tamamen atlar.
RUN node_modules/.bin/prisma generate
RUN node_modules/.bin/next build

# migrate hedefi docker-compose.prod.yml'de ayri bir servis olarak kullanilir
# (tek seferlik `prisma migrate deploy` icin) - builder'in tam node_modules +
# prisma CLI'sina ihtiyac duyar, runner'in yalin standalone ciktisinda CLI yok.

FROM base AS runner
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone ciktisi: server.js + gercekten kullanilan node_modules
# alt kumesi (next.config.ts'teki outputFileTracingIncludes sayesinde ozel
# konumdaki Prisma generated client de dahil).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
