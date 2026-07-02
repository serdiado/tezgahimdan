import type { KullaniciRolu } from "@/generated/prisma";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: KullaniciRolu;
    } & DefaultSession["user"];
  }

  interface User {
    rol?: KullaniciRolu;
  }
}

// next-auth/jwt.d.ts sadece "@auth/core/jwt"'yi re-export ediyor; "next-auth/jwt" uzerinden
// augment etmek (pnpm'in siki node_modules izolasyonu nedeniyle) core tanimina ulasmiyor,
// bu yuzden dogrudan @auth/core/jwt hedeflenmeli (bkz. nextauthjs/next-auth#12095).
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    rol?: KullaniciRolu;
  }
}
