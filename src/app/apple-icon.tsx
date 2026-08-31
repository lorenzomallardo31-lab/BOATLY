import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 122,
            height: 122,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 40,
            background: "#6D5DFB",
            color: "white",
            fontSize: 86,
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
