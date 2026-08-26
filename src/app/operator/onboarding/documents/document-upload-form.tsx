"use client";

import {
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE =
  6 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

type DocumentUploadFormProps = {
  operatorId: string;
  documentTypeId: string;
  documentTypeName: string;
  requiresExpiryDate: boolean;
  replacesDocumentId: string | null;
};

function extensionForMimeType(
  mimeType: string,
) {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";

    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    default:
      return null;
  }
}

async function calculateSha256(
  file: File,
) {
  const buffer =
    await file.arrayBuffer();

  const digest =
    await window.crypto.subtle.digest(
      "SHA-256",
      buffer,
    );

  return Array.from(
    new Uint8Array(digest),
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

function developmentDetail(
  message: string,
) {
  if (
    process.env.NODE_ENV !==
    "development"
  ) {
    return "";
  }

  return ` Dettaglio dev: ${message}`;
}

export function DocumentUploadForm({
  operatorId,
  documentTypeId,
  documentTypeName,
  requiresExpiryDate,
  replacesDocumentId,
}: DocumentUploadFormProps) {
  const router = useRouter();

  const formRef =
    useRef<HTMLFormElement>(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage(null);
    setSuccessMessage(null);

    const formData =
      new FormData(event.currentTarget);

    const fileValue =
      formData.get("file");

    const issuedAtValue =
      formData.get("issued_at");

    const expiresAtValue =
      formData.get("expires_at");

    if (!(fileValue instanceof File)) {
      setErrorMessage(
        "Seleziona un documento.",
      );

      return;
    }

    if (fileValue.size <= 0) {
      setErrorMessage(
        "Il file selezionato è vuoto.",
      );

      return;
    }

    if (fileValue.size > MAX_FILE_SIZE) {
      setErrorMessage(
        "Il file non può superare 6 MB.",
      );

      return;
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        fileValue.type as
          (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      setErrorMessage(
        `Formato non supportato. Usa PDF, JPG o PNG.${developmentDetail(
          `MIME ricevuto: ${
            fileValue.type || "(vuoto)"
          }`,
        )}`,
      );

      return;
    }

    if (
      !fileValue.name.trim() ||
      fileValue.name.length > 255
    ) {
      setErrorMessage(
        "Il nome del file non è valido.",
      );

      return;
    }

    const issuedAt =
      typeof issuedAtValue === "string" &&
      issuedAtValue
        ? issuedAtValue
        : null;

    const expiresAt =
      typeof expiresAtValue === "string" &&
      expiresAtValue
        ? expiresAtValue
        : null;

    if (
      requiresExpiryDate &&
      !expiresAt
    ) {
      setErrorMessage(
        "Inserisci la data di scadenza del documento.",
      );

      return;
    }

    const extension =
      extensionForMimeType(
        fileValue.type,
      );

    if (!extension) {
      setErrorMessage(
        "Formato file non riconosciuto.",
      );

      return;
    }

    setIsUploading(true);

    let storagePath: string | null =
      null;

    try {
      const supabase =
        createClient();

      const objectId =
        window.crypto.randomUUID();

      storagePath =
        `${operatorId}/${documentTypeId}/${objectId}.${extension}`;

      const sha256 =
        await calculateSha256(
          fileValue,
        );

      const {
        error: uploadError,
      } = await supabase.storage
        .from("operator-documents")
        .upload(
          storagePath,
          fileValue,
          {
            cacheControl: "3600",
            contentType:
              fileValue.type,
            upsert: false,
          },
        );

      if (uploadError) {
        console.error(
          "Boatly Storage upload error:",
          uploadError,
        );

        setErrorMessage(
          `Il file non è stato accettato da Supabase Storage.${developmentDetail(
            uploadError.message,
          )}`,
        );

        return;
      }

      const {
        data: registeredDocumentId,
        error: registrationError,
      } = await supabase.rpc(
        "register_operator_document_upload",
        {
          p_operator_id:
            operatorId,

          p_document_type_id:
            documentTypeId,

          p_storage_path:
            storagePath,

          p_original_filename:
            fileValue.name,

          p_mime_type:
            fileValue.type,

          p_file_size_bytes:
            fileValue.size,

          p_content_hash_sha256:
            sha256,

          p_issued_at:
            issuedAt,

          p_expires_at:
            expiresAt,

          p_replaces_document_id:
            replacesDocumentId,
        },
      );

      if (
        registrationError ||
        typeof registeredDocumentId !==
          "string"
      ) {
        console.error(
          "Boatly document registration error:",
          registrationError,
        );

        const {
          error: cleanupError,
        } = await supabase.storage
          .from("operator-documents")
          .remove([
            storagePath,
          ]);

        if (cleanupError) {
          console.error(
            "Boatly orphan cleanup error:",
            cleanupError,
          );
        }

        setErrorMessage(
          `Il file è arrivato nello Storage, ma Boatly non è riuscito a registrare i metadata.${developmentDetail(
            registrationError?.message ??
              "RPC senza ID documento valido",
          )}`,
        );

        return;
      }

      formRef.current?.reset();

      setSuccessMessage(
        replacesDocumentId
          ? `${documentTypeName}: nuova versione caricata.`
          : `${documentTypeName}: documento caricato.`,
      );

      router.refresh();

    } catch (error) {
      console.error(
        "Boatly unexpected upload error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "errore sconosciuto";

      setErrorMessage(
        `Errore imprevisto durante il caricamento.${developmentDetail(
          message,
        )}`,
      );

    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mt-5 space-y-4"
    >
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-3 text-sm text-[#0B1F33]">
          {successMessage}
        </div>
      ) : null}

      <div>
        <label
          htmlFor={`file-${documentTypeId}`}
          className="mb-2 block text-sm font-medium"
        >
          File *
        </label>

        <input
          id={`file-${documentTypeId}`}
          name="file"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png"
          disabled={isUploading}
          className="block w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#F1F5F4] file:px-3 file:py-2 file:font-medium"
        />

        <p className="mt-2 text-xs text-[#64748B]">
          PDF, JPG o PNG · massimo 6 MB
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`issued-${documentTypeId}`}
            className="mb-2 block text-sm font-medium"
          >
            Data emissione
          </label>

          <input
            id={`issued-${documentTypeId}`}
            name="issued_at"
            type="date"
            disabled={isUploading}
            className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none focus:border-[#14B8A6]"
          />
        </div>

        <div>
          <label
            htmlFor={`expires-${documentTypeId}`}
            className="mb-2 block text-sm font-medium"
          >
            Data scadenza
            {requiresExpiryDate
              ? " *"
              : ""}
          </label>

          <input
            id={`expires-${documentTypeId}`}
            name="expires_at"
            type="date"
            required={
              requiresExpiryDate
            }
            disabled={isUploading}
            className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none focus:border-[#14B8A6]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isUploading}
        className="rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading
          ? "Caricamento..."
          : replacesDocumentId
            ? "Carica nuova versione"
            : "Carica documento"}
      </button>
    </form>
  );
}