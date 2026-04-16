type Options = {
  randomizeChance?: number;
  reversed?: boolean;
};

export const encryptText = (
  text: string,
  progress: number,
  _options?: Options,
) => {
  const options = {
    randomizeChance: 0.7,
    ..._options,
  };

  const encryptionChars = "a-zA-Z0-9*=?!";
  const skipTags = ["<br class='lg-max:hidden'>", "<span>", "</span>"];

  const totalChars = text.length;
  const encryptedCount = Math.floor(totalChars * (1 - progress));

  let result = "";
  let charIndex = 1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    let shouldSkip = false;
    for (const tag of skipTags) {
      if (text.substring(i, i + tag.length) === tag) {
        result += tag;
        i += tag.length - 1;
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) continue;

    if (char === " ") {
      result += char;
      charIndex++;
      continue;
    }

    if (
      options.reversed
        ? charIndex < encryptedCount
        : text.length - charIndex < encryptedCount
    ) {
      if (Math.random() < options.randomizeChance) {
        result += char;
      } else {
        const randomIndex = Math.floor(Math.random() * encryptionChars.length);
        result += encryptionChars[randomIndex];
      }
    } else {
      result += char;
    }

    charIndex++;
  }

  return result;
};

export default function HomeHeroTitle() {
  return (
    <div className="text-title-h3 md:text-title-h2 lg:text-title-h1 mx-auto text-center [&_span]:text-heat-100 mb-12 lg:mb-16 px-16">
      Er din hjemmeside <br />
      <span>klar til AI?</span>
    </div>
  );
}
