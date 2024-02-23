declare namespace webviewApi {
  function postMessage(msg: any): Promise<any>
  function onMessage(listener: (msg: any) => void): void
}
