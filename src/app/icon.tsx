import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171A2B",
        }}
      >
        <div
          style={{
            width: 340,
            height: 340,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 112,
            background: "#6D5DFB",
            color: "white",
            fontSize: 238,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          B
        </div>
      </div>
    ),
    size,
  );
}
