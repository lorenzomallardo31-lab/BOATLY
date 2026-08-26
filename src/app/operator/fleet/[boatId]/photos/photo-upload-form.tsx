"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type PhotoUploadFormProps = {
  operatorId: string;
  boatId: string;
};

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

function extensionForMimeType(
  mimeType: string,
) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return null;
  }
}

export default function PhotoUploadForm({
  operatorId,
  boatId,
}: PhotoUploadFormProps) {
  const router =
    useRouter();

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    const file =
      formData.get("image");

    const altTextValue =
      formData.get("alt_text");

    const altText =
      typeof altTextValue ===
      "string"
        ? altTextValue.trim()
        : "";

    if (
      !(file instanceof File) ||
      file.size === 0
    ) {
      setError(
        "Seleziona un'immagine.",
      );

      return;
    }

    if (
      !ALLOWED_TYPES.has(
        file.type,
      )
    ) {
      setError(
        "Formato non supportato. Usa JPG, PNG o WebP.",
      );

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setError(
        "L'immagine supera il limite di 10 MB.",
      );

      return;
    }

    const extension =
      extensionForMimeType(
        file.type,
      );

    if (!extension) {
      setError(
        "Formato immagine non valido.",
      );

      return;
    }

    setUploading(true);

    const supabase =
      createClient();

    const objectName =
      `${crypto.randomUUID()}.${extension}`;

    const storagePath =
      `${operatorId}/${boatId}/${objectName}`;

    try {
      const {
        error: uploadError,
      } = await supabase.storage
        .from("boat-images")
        .upload(
          storagePath,
          file,
          {
            contentType:
              file.type,

            upsert:
              false,
          },
        );

      if (uploadError) {
        console.error(
          "Boatly boat image upload error",
          uploadError,
        );

        setError(
          uploadError.message,
        );

        return;
      }


      const {
        error: registerError,
      } = await supabase.rpc(
        "register_boat_image_upload",
        {
          p_operator_id:
            operatorId,

          p_boat_id:
            boatId,

          p_storage_path:
            storagePath,

          p_alt_text:
            altText || null,
        },
      );


      if (registerError) {
        console.error(
          "Boatly boat image registration error",
          registerError,
        );

        const {
          error:
            cleanupError,
        } =
          await supabase.storage
            .from(
              "boat-images",
            )
            .remove([
              storagePath,
            ]);

        if (cleanupError) {
          console.error(
            "Boatly boat image cleanup error",
            cleanupError,
          );
        }

        setError(
          registerError.message,
        );

        return;
      }


      form.reset();

      router.refresh();

    } catch (
      unexpectedError
    ) {
      console.error(
        "Unexpected Boatly boat image error",
        unexpectedError,
      );

      setError(
        "Si è verificato un errore durante l'upload.",
      );

    } finally {
      setUploading(false);
    }
  }


  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
    >

      <p className="text-sm font-semibold text-[#14B8A6]">
        Nuova foto
      </p>

      <h2 className="mt-2 text-xl font-semibold">
        Carica un&apos;immagine
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#64748B]">
        JPG, PNG o WebP. Dimensione massima 10 MB.
        La prima immagine caricata diventerà automaticamente la copertina.
      </p>


      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}


      <div className="mt-6 space-y-5">

        <div>

          <label
            htmlFor="image"
            className="mb-2 block text-sm font-medium"
          >
            Immagine *
          </label>

          <input
            id="image"
            name="image"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp"
            disabled={
              uploading
            }
            className="block w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm"
          />

        </div>


        <div>

          <label
            htmlFor="alt_text"
            className="mb-2 block text-sm font-medium"
          >
            Testo alternativo
          </label>

          <input
            id="alt_text"
            name="alt_text"
            type="text"
            maxLength={200}
            disabled={
              uploading
            }
            className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20"
            placeholder="Es. Blu Mediterraneo vista di prua"
          />

          <p className="mt-2 text-xs text-[#64748B]">
            Utile per accessibilità e futura presentazione sul marketplace.
          </p>

        </div>

      </div>


      <button
        type="submit"
        disabled={
          uploading
        }
        className="mt-6 rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading
          ? "Caricamento..."
          : "Carica foto"}
      </button>

    </form>
  );
}