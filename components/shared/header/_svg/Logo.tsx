import Image from "next/image";

export default function Logo() {
  return (
    <Image
      src="/nm_logo.png"
      alt="Nørgaard Mikkelsen"
      height={28}
      width={72}
      priority
      style={{ height: 28, width: "auto" }}
    />
  );
}
