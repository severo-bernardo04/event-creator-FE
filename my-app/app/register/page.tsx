"use client";

// Tela de cadastro de novos usuarios.
import { CheckCircle, Shield, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {maskCpf, maskPhone} from "@/lib/masks";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function Required() {
    return <span className="text-red-400 ml-0.5">*</span>;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white">
      <Link
        href="/"
        className="absolute top-3 left-3 z-20 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:border-slate-500 hover:bg-slate-800"
      >
        Voltar
      </Link>
      <div className="floating-orb top-16 left-8 h-36 w-36 bg-secondary/40" />
      <div
        className="floating-orb right-8 bottom-12 h-44 w-44 bg-primary/50"
        style={{ animationDelay: "1.2s" }}
      />

      <section className="glass-card relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[34px] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="grid-pattern absolute inset-0 opacity-15" />

        <div className="relative z-[1] flex flex-col justify-between border-b border-white/10 bg-gradient-to-br from-secondary/[0.08] via-transparent to-primary/[0.1] p-8 sm:p-10 md:border-b-0 md:border-r">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white shadow-lg shadow-primary/30">
                E
              </span>
              <div>
                <p className="text-lg font-bold tracking-tight text-white">
                  Event Creator
                </p>
                <p className="text-xs text-slate-400">
                  Onde eventos e pessoas se encontram
                </p>
              </div>
            </div>
            <h2 className="mt-8 text-2xl font-bold leading-tight text-white sm:text-3xl">Crie sua conta para se inscrever nos melhores eventos</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300/95">
              Seu perfil reúne inscrições, histórico e dados de acesso para facilitar a participação em eventos.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex gap-3 text-sm text-slate-200/95">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-secondary">
                  <UserPlus className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-semibold text-white">Inscrição rápida</span> com dados preenchidos automaticamente.
                </span>
              </li>
              <li className="flex gap-3 text-sm text-slate-200/95">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-secondary">
                  <CheckCircle className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-semibold text-white">Acesso ao painel</span> para acompanhar eventos e vagas.
                </span>
              </li>
              <li className="flex gap-3 text-sm text-slate-200/95">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-secondary">
                  <Shield className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-semibold text-white">Conta segura</span> com validação de dados essenciais.
                </span>
              </li>
            </ul>
          </div>
          <p className="mt-8 text-xs leading-relaxed text-slate-500 md:mt-10">
            Depois de cadastrar, você será encaminhado para o login com a mesma
            conta.
          </p>
        </div>

        <div className="relative z-[1] p-8 sm:p-10">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
            <div className="space-y-3">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-secondary/95">
                  Registro
                </p>
                <h1 className="mt-2 text-2xl font-bold">Criar conta</h1>
                <p className="mt-2 text-sm leading-6 text-slate-300/85">
                  Preencha os campos. Depois, faça login com o mesmo e-mail.
                </p>
              </div>
            </div>

            <form
              className="grid gap-5 md:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                const errors: Record<string, string> = {};
                const fullName = `${nome} ${sobrenome}`.trim();
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
                if (fullName.length < 2 || fullName.length > 100) errors.nome = "Nome deve ter entre 2 e 100 caracteres.";
                if (!emailRegex.test(email.trim())) errors.email = "Informe um e-mail válido.";
                if (!cpfRegex.test(cpf)) errors.cpf = "CPF inválido. Use 000.000.000-00.";
                if (!dataNascimento) errors.dataNascimento = "Data de nascimento é obrigatória.";
                if (password.length < 8) errors.password = "Senha deve ter no mínimo 8 caracteres.";
                if (dataNascimento) {
                  const now = new Date();
                  const birth = new Date(`${dataNascimento}T00:00:00`);
                  const limit = new Date();
                  limit.setFullYear(now.getFullYear() - 13);
                  if (birth > now) errors.dataNascimento = "Data de nascimento não pode ser futura.";
                  else if (birth > limit) errors.dataNascimento = "É necessário ter no mínimo 13 anos.";
                }
                setFieldErrors(errors);
                if (Object.keys(errors).length > 0) return;
                setLoading(true);
                try {
                  await apiFetch("/users/register", {
                    method: "POST",
                    json: {
                      name: `${nome} ${sobrenome}`.trim(),
                      email: email.trim().toLowerCase(),
                      password,
                      cpf,
                      dataNascimento,
                      phone,
                      address,
                    },
                  });
                  const next = searchParams.get("next");
                  const loginUrl = next
                    ? `/login?next=${encodeURIComponent(next)}`
                    : "/login";
                  router.push(loginUrl);
                } catch (err: unknown) {
            const message = getErrorMessage(err);
            const lower = message.toLowerCase();

              if (lower.includes("cpf")) {
                setFieldErrors({ cpf: message });
                setError(null);
              } else if (lower.includes("email") || lower.includes("e-mail")) {
                setFieldErrors({ email: message });
                setError(null);
              } else {
                setError(message);
              }
            } finally {
              setLoading(false);
              }
            }}
            >
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Primeiro nome<Required />
                </span>
                <input
                  type="text"
                  placeholder="Seu primeiro nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Sobrenome <Required/>
                </span>
                <input
                  type="text"
                  placeholder="Seu sobrenome"
                  value={sobrenome}
                  onChange={(e) => setSobrenome(e.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  E-mail <Required/>
                </span>
                <input
                  type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
              />

              {fieldErrors.email ? (
                <p className="text-xs font-semibold text-red-300">
                  {fieldErrors.email}
                </p>
              ) : null}

              </label>

              <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">
                CPF <Required />
              </span>

              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
              />

              {fieldErrors.cpf ? (
                <p className="text-xs font-semibold text-red-300">
                  {fieldErrors.cpf}
                </p>
              ) : null}
            </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Telefone <Required />
                </span>
                <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-200">Endereço</span>
                <input
                    type="text"
                    placeholder="Rua, número, cidade"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Data de nascimento <Required />
                </span>
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
                {fieldErrors.dataNascimento ? <p className="text-xs font-semibold text-red-300">{fieldErrors.dataNascimento}</p> : null}
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-200">
                  Senha <Required />
                </span>
                <input
                  type="password"
                  placeholder="Crie uma senha forte"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
                {fieldErrors.password ? <p className="text-xs font-semibold text-red-300">{fieldErrors.password}</p> : null}
              </label>

              {error ? (
                <div className="md:col-span-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-secondary px-6 py-4 text-base font-bold text-slate-950 shadow-[0_18px_35px_rgba(255,212,71,0.28)] hover:-translate-y-1 hover:bg-yellow-300"
                >
                  {loading ? "Criando..." : "Criar conta"}
                </button>
              </div>
            </form>

            <p className="text-xs text-slate-500">
              Campos marcados com <span className="text-red-400">*</span> são obrigatórios.
            </p>

            <p className="text-center text-sm text-slate-300/80">
              Já possui conta?{" "}
              <Link
                href={
                  searchParams.get("next")
                    ? `/login?next=${encodeURIComponent(searchParams.get("next")!)}`
                    : "/login"
                }
                className="font-semibold text-secondary hover:text-yellow-300"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Carregando…
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
