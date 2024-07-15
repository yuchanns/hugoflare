export const ellipsisText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }

  let truncatedText = text.substring(0, maxLength);

  let spaceIndex = truncatedText.lastIndexOf(' ');

  if (spaceIndex !== -1) {
    truncatedText = truncatedText.substring(0, spaceIndex);
  }

  return `${truncatedText.trim()}...`;
}

export type Bindings = {
  DATABASE: D1Database
  BUCKET: R2Bucket
  JWT_SECRET: string
  ADMIN: string
  PASSWD: string
  R2DOMAIN: string

  isLogin: boolean
}


