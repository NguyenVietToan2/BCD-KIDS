import "next-auth";
declare module "next-auth" {
  interface User { role: "ADMIN" | "WHOLESALE" }
  interface Session { user: { id: string; role: "ADMIN" | "WHOLESALE"; name?: string | null; email?: string | null } }
}
declare module "next-auth/jwt" { interface JWT { id?: string; role?: string } }
