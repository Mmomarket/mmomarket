"use client";

import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import { useCallback, useEffect, useRef, useState } from "react";

interface Verification {
  id: string;
  phone: string;
  selfieUrl: string;
  idFrontUrl: string;
  idBackUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  submittedAt: string;
}

const STATUS_INFO: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  PENDING: {
    label: "Aguardando revisão",
    color: "text-yellow-400",
    icon: "⏳",
  },
  APPROVED: {
    label: "Identidade verificada",
    color: "text-emerald-400",
    icon: "✅",
  },
  REJECTED: {
    label: "Reprovada — você pode reenviar",
    color: "text-red-400",
    icon: "❌",
  },
};

export default function VerificacaoPage() {
  const [existing, setExisting] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);

  // form state
  const [phone, setPhone] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [idFrontUrl, setIdFrontUrl] = useState("");
  const [idBackUrl, setIdBackUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // upload helpers
  const selfieRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/verifications")
      .then((r) => r.json())
      .then((d) => {
        setExisting(d ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const uploadFile = useCallback(
    async (file: File, setter: (url: string) => void, label: string) => {
      setUploading(label);
      setError("");
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Falha no upload");
        setter(json.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha no upload");
      } finally {
        setUploading(null);
      }
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selfieUrl) return setError("Faça upload da selfie com documento.");
    if (!idFrontUrl) return setError("Faça upload da frente do documento.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          selfieUrl,
          idFrontUrl,
          idBackUrl: idBackUrl || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao enviar verificação");
      setSuccess(true);
      setExisting(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </div>
    );
  }

  const info = existing ? STATUS_INFO[existing.status] : null;
  const canSubmit = !existing || existing.status === "REJECTED";

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Verificação de Identidade
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Usuários verificados recebem um selo ✅ e aparecem primeiro no livro
            de ordens.
          </p>
        </div>

        {/* Existing status */}
        {existing && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{info?.icon}</span>
                <div>
                  <p className={`font-semibold ${info?.color}`}>
                    {info?.label}
                  </p>
                  <p className="text-gray-400 text-xs">
                    Enviado em{" "}
                    {new Date(existing.submittedAt).toLocaleDateString("pt-BR")}
                  </p>
                  {existing.reviewNote && (
                    <p className="text-red-300 text-sm mt-1">
                      Motivo: {existing.reviewNote}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <div className="bg-emerald-900/40 border border-emerald-500/40 rounded-lg p-4 text-emerald-300 text-sm">
            ✅ Verificação enviada com sucesso! Nossa equipe irá revisar em até
            24 horas.
          </div>
        )}

        {/* Form */}
        {canSubmit && !success && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">
                {existing?.status === "REJECTED"
                  ? "Reenviar Documentos"
                  : "Enviar Documentos"}
              </h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Telefone com DDD *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Selfie */}
                <PhotoUpload
                  label="Selfie segurando documento de identidade *"
                  hint="Tire uma foto segurando seu RG ou CNH ao lado do rosto"
                  url={selfieUrl}
                  uploading={uploading === "selfie"}
                  inputRef={selfieRef}
                  onFileChange={(f) => uploadFile(f, setSelfieUrl, "selfie")}
                />

                {/* ID Front */}
                <PhotoUpload
                  label="Frente do documento (RG ou CNH) *"
                  hint="Foto clara da frente do documento"
                  url={idFrontUrl}
                  uploading={uploading === "idFront"}
                  inputRef={idFrontRef}
                  onFileChange={(f) => uploadFile(f, setIdFrontUrl, "idFront")}
                />

                {/* ID Back (optional) */}
                <PhotoUpload
                  label="Verso do documento (opcional)"
                  hint="Foto do verso do documento"
                  url={idBackUrl}
                  uploading={uploading === "idBack"}
                  inputRef={idBackRef}
                  onFileChange={(f) => uploadFile(f, setIdBackUrl, "idBack")}
                />

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || uploading !== null}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {submitting ? "Enviando..." : "Enviar para Revisão"}
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Info box */}
        <Card>
          <CardContent className="py-4 space-y-2 text-sm text-gray-400">
            <p className="font-medium text-gray-300">📋 Como funciona</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Você envia uma selfie + foto do documento</li>
              <li>Nossa equipe revisa em até 24 horas</li>
              <li>Após aprovação, você recebe o selo ✅</li>
              <li>Ordens de usuários verificados aparecem primeiro</li>
              <li>A verificação não é obrigatória para negociar</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PhotoUpload({
  label,
  hint,
  url,
  uploading,
  inputRef,
  onFileChange,
}: {
  label: string;
  hint: string;
  url: string;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (f: File) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      <p className="text-xs text-gray-500 mb-2">{hint}</p>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-700 hover:border-emerald-500 rounded-lg p-4 cursor-pointer text-center transition-colors"
      >
        {url ? (
          <p className="text-emerald-400 text-sm">✅ Foto enviada</p>
        ) : uploading ? (
          <p className="text-yellow-400 text-sm">Enviando...</p>
        ) : (
          <p className="text-gray-500 text-sm">Clique para selecionar foto</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileChange(f);
        }}
      />
    </div>
  );
}
