import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Sifre", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string" ? credentials.email : undefined;
        const password =
          typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        const kullanici = await prisma.kullanici.findUnique({ where: { email } });
        // sifreHash yoksa bu hesap sadece Google ile acilmis; sifreyle giris yapamaz.
        // silindiMi: admin-basvurulu hesap silme (2026-07-13) - silinen hesap
        // giris yapamaz (anonimlestirme email'i zaten bosaltir; bu kontrol
        // emniyet kemeri).
        if (!kullanici || kullanici.silindiMi || !kullanici.sifreHash) return null;

        const dogruMu = await bcrypt.compare(password, kullanici.sifreHash);
        if (!dogruMu) return null;

        return {
          id: kullanici.id,
          email: kullanici.email,
          name: kullanici.ad,
          rol: kullanici.rol,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // Guvenli hesap eslestirme: Google e-postasi mevcut bir Kullanici ile eslesirse,
    // sadece o kaydin e-postasi daha once dogrulanmissa (emailVerified dolu) otomatik
    // baglariz. Aksi halde (sifreyle, dogrulanmamis kayit) reddederiz - yoksa biri
    // once sizin e-postanizla sifreli bir hesap acar, siz Google ile girdiginizde
    // sizi o kisinin hesabina baglamis oluruz (Auth.js'in "dangerous account linking"
    // olarak adlandirdigi tam olarak bu senaryo).
    signIn: async ({ user, account, profile }) => {
      if (account?.provider !== "google") return true;

      const email = profile?.email;
      if (!email || profile?.email_verified !== true) return false;

      const mevcut = await prisma.kullanici.findUnique({ where: { email } });

      if (mevcut) {
        // Silinmis hesaba Google ile de girilemez (bkz. authorize'daki not).
        if (mevcut.silindiMi) return false;
        if (!mevcut.emailVerified) return false;
        user.id = mevcut.id;
        user.rol = mevcut.rol;
        return true;
      }

      const yeni = await prisma.kullanici.create({
        data: {
          email,
          ad: profile?.name ?? email,
          rol: "alici",
          emailVerified: new Date(),
        },
      });
      user.id = yeni.id;
      user.rol = yeni.rol;
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.id) session.user.id = token.id;
      if (token.rol) session.user.rol = token.rol;
      return session;
    },
  },
});
