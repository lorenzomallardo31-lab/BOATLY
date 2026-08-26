import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { documentId } =
    await context.params;

  const supabase =
    await createClient();


  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();


  if (
    claimsError ||
    !claimsData?.claims
  ) {
    return new NextResponse(
      "Unauthorized",
      {
        status: 401,
      },
    );
  }


  const {
    data: documentRow,
    error: documentError,
  } = await supabase
    .from("operator_documents")
    .select(
      "storage_path",
    )
    .eq(
      "id",
      documentId,
    )
    .maybeSingle();


  if (
    documentError ||
    !documentRow
  ) {
    return new NextResponse(
      "Document not found",
      {
        status: 404,
      },
    );
  }


  const {
    data: signedData,
    error: signedError,
  } = await supabase.storage
    .from("operator-documents")
    .createSignedUrl(
      documentRow.storage_path,
      60,
    );


  if (
    signedError ||
    !signedData?.signedUrl
  ) {
    return new NextResponse(
      "Unable to open document",
      {
        status: 403,
      },
    );
  }


  return NextResponse.redirect(
    signedData.signedUrl,
  );
}