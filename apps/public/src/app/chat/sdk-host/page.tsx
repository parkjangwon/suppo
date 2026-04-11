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
        id="crinity-chat-sdk-script"
        src="/chat-sdk.js"
        data-crinity-chat-sdk="true"
        data-widget-key={widgetKey}
        data-position="bottom-right"
        strategy="afterInteractive"
      />
      <Script id="crinity-chat-sdk-init" strategy="afterInteractive">
        {`
          window.addEventListener("load", function () {
            var initialize = function () {
              if (window.CrinityChatWidget && typeof window.CrinityChatWidget.init === "function") {
                window.CrinityChatWidget.init({
                  widgetKey: ${JSON.stringify(widgetKey ?? "") || '""'},
                  position: "bottom-right"
                });
                return true;
              }
              return false;
            };

            if (initialize()) {
              return;
            }

            var retries = 0;
            var timer = window.setInterval(function () {
              retries += 1;
              if (initialize() || retries > 20) {
                window.clearInterval(timer);
              }
            }, 250);
          });
        `}
      </Script>
    </>
  );
}
