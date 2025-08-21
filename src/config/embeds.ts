export const EMBEDS = {
  allowedHosts: ['youtube.com', 'www.youtube.com', 'youtu.be'] as const,
  oembed: 'https://www.youtube.com/oembed',
  useNoCookie: true, // render via youtube-nocookie.com
  requireCaption: true
};

export type AllowedHost = typeof EMBEDS.allowedHosts[number];