import Script from "next/script";

export default async function ChatSdkHostPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const widgetKey = typeof params.widgetKey === "string" ? params.widgetKey : undefined;

  return (
    <>
      <div id="host-page">Third-party host page</div>
      <Script
        src="/chat-sdk.js"
        strategy="afterInteractive"
        data-crinity-chat-sdk="true"
        data-widget-key={widgetKey}
        data-position="bottom-right"
      />
    </>
  );
}
