import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  // Default to English
  const locale = "en";

  return {
    locale,
    messages: (await import(`./locales/${locale}/common.json`)).default,
  };
});
