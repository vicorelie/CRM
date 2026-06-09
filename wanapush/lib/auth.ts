import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

// Adapter durci (audit C3) : NE PAS persister les tokens OAuth en clair dans la
// table NextAuth `Account`. L'app n'en a aucun usage (les tokens d'API vivent
// chiffrés AES-256-GCM dans SocialAccount/AdAccount/GbpAccount) ; les y stocker
// en clair était le seul secret non chiffré au repos. On strippe les champs
// porteurs de secret avant l'insert ; le reste (provider, providerAccountId…) reste.
// Le type du paramètre est dérivé de l'adapter de base pour éviter tout conflit
// entre les types `AdapterAccount` de `next-auth` et `@auth/core`.
function makeSafeAdapter() {
  const base = PrismaAdapter(prisma);
  const baseLink = base.linkAccount!;
  type LinkArg = Parameters<typeof baseLink>[0];
  return {
    ...base,
    linkAccount: (account: LinkArg) => {
      const { access_token, refresh_token, id_token, ...safe } =
        account as LinkArg & Record<string, unknown>;
      void access_token;
      void refresh_token;
      void id_token;
      return baseLink(safe as LinkArg);
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: makeSafeAdapter(),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email & mot de passe",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
    // Google OAuth — actif uniquement si les vars sont définies.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        // @ts-expect-error — on ajoute l'id user à la session.
        session.user.id = token.id;
      }
      return session;
    },
  },
};
