import * as React from "react";
import { cn } from "@/lib/utils";

export function scorePassword(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const s: 0 | 1 | 2 | 3 = score <= 2 ? 1 : score <= 3 ? 2 : 3;
  if (s === 1) return { score: 1, label: "Fácil", color: "bg-destructive" };
  if (s === 2) return { score: 2, label: "Médio", color: "bg-yellow-500" };
  return { score: 3, label: "Difícil", color: "bg-green-500" };
}

export const PasswordStrengthBar: React.FC<{ password: string; className?: string }> = ({ password, className }) => {
  const { score, label, color } = scorePassword(password || "");
  if (!password) return null;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("flex-1 rounded-full transition-colors", i <= score ? color : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Força da senha: <span className="font-medium text-foreground">{label}</span></p>
    </div>
  );
};
