import { ArrowRight, LockKeyhole } from "lucide-react";
import { Link } from "wouter";
import { MarketplaceLayout, roleLoginPath } from "@/components/MarketplaceLayout";
import { usePrototype } from "@/contexts/PrototypeContext";
import type { Role } from "@/prototype/types";

const roleNames: Record<Role, string> = { farmer: "Farm Holder", owner: "Machinery Owner" };

export function RoleGate({ role, children }: { role: Role; children: React.ReactNode }) {
  const { currentUser } = usePrototype();
  if (currentUser?.role === role) return <>{children}</>;

  return <MarketplaceLayout><section className="access-card page-container">
    <div className="access-icon"><LockKeyhole size={24} /></div>
    <span className="eyebrow">ROLE-BASED WORKSPACE</span>
    <h1>{currentUser ? `Switch to a ${roleNames[role]} demo session` : `${roleNames[role]} workspace`}</h1>
    <p>Use the local prototype sign-in to explore this role. No SMS will be sent; the demo OTP is shown on the next step.</p>
    <div className="access-actions"><Link href={roleLoginPath(role)} className="button button-primary">Continue as {roleNames[role]} <ArrowRight size={16} /></Link><Link href="/start" className="button button-secondary">Choose another role</Link></div>
    <small>Prototype only · not a real account or phone verification</small>
  </section></MarketplaceLayout>;
}
