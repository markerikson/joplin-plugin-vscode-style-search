export type Resolve<T> = (value: T) => void
export type Reject = (reason: unknown) => void

export interface Deferred<T> {
  promise: Promise<T>
  resolve: Resolve<T>
  reject: Reject
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: Resolve<T>
  let reject!: Reject
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
