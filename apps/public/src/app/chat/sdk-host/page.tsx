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
      <script
        src="/chat-sdk.js"
        data-crinity-chat-sdk="true"
        data-widget-key={widgetKey}
        data-position="bottom-right"
      />
    </>
  );
}
