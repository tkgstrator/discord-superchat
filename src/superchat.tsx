import satori from "satori";
import { Resvg } from "@resvg/resvg-wasm";

interface Color {
  background: string;
  text: string;
  name: string;
}

const PRICE_COLOR_MAP: Record<number, Color> = {
  100: {
    background: "rgba(30,136,229,1)",
    text: "rgba(255,255,255,1)",
    name: "rgba(255,255,255,0.7019607843137254)",
  },
  200: {
    background: "rgba(0,229,255,1)",
    text: "rgba(0,0,0,1)",
    name: "rgba(0,0,0,0.7019607843137254)",
  },
  500: {
    background: "rgba(29,233,182,1)",
    text: "rgba(0,0,0,1)",
    name: "rgba(0,0,0,0.5411764705882353)",
  },
  1000: {
    background: "rgba(255,202,40,1)",
    text: "rgba(0,0,0,0.8745098039215686)",
    name: "rgba(0,0,0,0.5411764705882353)",
  },
  2000: {
    background: "rgba(245,124,0,1)",
    text: "rgba(255,255,255,0.8745098039215686)",
    name: "rgba(255,255,255,0.7019607843137254)",
  },
  5000: {
    background: "rgba(233,30,99,1)",
    text: "rgba(255,255,255,1)",
    name: "rgba(255,255,255,0.7019607843137254)",
  },
  10000: {
    background: "rgba(230,33,23,1)",
    text: "rgba(255,255,255,1)",
    name: "rgba(255,255,255,0.7019607843137254)",
  },
};

function getColor(price: number): Color {
  return Object.entries(PRICE_COLOR_MAP).reduce((acc, [key, value]) => {
    if (parseInt(key) <= price) {
      return value;
    }
    return acc;
  }, {} as Color);
}

interface Props {
  price: number;
  name: string;
  iconSrc?: string;
  message?: string;
}

function Component({ price, name, iconSrc, message }: Props) {
  const color = getColor(price);

  return (
    <div
      lang="ja-JP"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "12px",
        backgroundColor: color.background,
        color: color.text,
        fontSize: "15px",
        fontWeight: "400",
        fontFamily: "'Noto Sans JP'",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 16px",
          fontWeight: "500",
        }}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            width={80}
            height={80}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              marginRight: "16px",
            }}
          />
        ) : (
          <span
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              marginRight: "16px",
              backgroundColor: "rgba(0,0,0,0.1)",
            }}
          />
        )}
        <div
          style={{
            display: "flex",
          }}
        >
          <span
            style={{
              color: color.name,
              fontSize: "14px",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
          <span
            style={{
              paddingLeft: "8px",
            }}
          >
            ￥{price}
          </span>
        </div>
      </div>
      {message && (
        <div
          style={{
            padding: "8px 16px",
            paddingTop: "0",
            wordBreak: "break-word",
            wordWrap: "break-word",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

async function fetchFont(text: string, weight: number) {
  const url = new URL("https://fonts.googleapis.com/css2");
  url.searchParams.append("family", `Noto Sans JP:wght@${weight}`);
  url.searchParams.append("text", text);

  const cssRes = await fetch(url, {
    headers: {
      // ref: https://github.com/vercel/satori/blob/83d658542719c5cf0ea2354e782489f9e1e60a84/playground/pages/api/font.ts#L23C4-L25
      "User-Agent":
        "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
    },
  });
  if (!cssRes.ok) {
    throw new Error("Failed to fetch font");
  }

  const css = await cssRes.text();

  const resource = css.match(
    /src: url\((?<fontUrl>.+)\) format\('(?:opentype|truetype)'\)/u
  );

  const fontUrl = resource?.groups?.fontUrl;

  if (fontUrl == null) {
    throw new Error("Failed to parse font");
  }

  const fontRes = await fetch(fontUrl);
  if (!fontRes.ok) {
    throw new Error(`Failed to fetch font: ${fontRes.statusText}`);
  }

  return fontRes.arrayBuffer();
}

export async function generateImage({
  price,
  name,
  iconSrc,
  message,
}: Props): Promise<Uint8Array> {
  const textNormal = `${message ?? ""}`;
  const textBold = `${name}￥${price}`;
  const [fontNormal, fontBold] = await Promise.all([
    fetchFont(textNormal, 400),
    fetchFont(textBold, 500),
  ]);

  const svg = await satori(
    <Component price={price} name={name} iconSrc={iconSrc} message={message} />,
    {
      width: 368,
      height: 1000,
      fonts: [
        {
          name: "Noto Sans JP",
          data: fontNormal,
          weight: 400,
        },
        {
          name: "Noto Sans JP",
          data: fontBold,
          weight: 500,
        },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    background: "transparent",
  });
  resvg.cropByBBox(resvg.innerBBox()!);
  const img = resvg.render().asPng();

  return img;
}
