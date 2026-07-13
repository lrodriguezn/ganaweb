export interface TransaccionPort {
  run<T>(work: () => Promise<T>): Promise<T>
}
